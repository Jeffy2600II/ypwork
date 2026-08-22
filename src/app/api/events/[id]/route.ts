import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api';
import { validationError, notFound, forbidden, internalError } from '@/lib/api/errors';
import { eventsRepo } from '@/lib/repositories';
import { getEventOwnership } from '@/lib/auth/ownership';
import { canUpdateEvent, canDeleteEvent } from '@/lib/auth/permissions';
import { auditLog } from '@/lib/security';
import {
  validateEventType, validateEventTitle, validateEventDate,
  validateStartDate, validateDateRange, validateTime,
  validateLocation, validateDescription, validateColor,
  validateDepartmentId, DATE_REGEX,
  EVENT_TITLE_MAX_LENGTH, EVENT_LOCATION_MAX_LENGTH, EVENT_DESCRIPTION_MAX_LENGTH,
} from '@/modules/events/event-validation';
import { resolveEventColor } from '@/modules/events/event-colors';
import type { EventType } from '@/lib/types';

export const PATCH = withAuth(async (ctx, request, routeCtx) => {
  const { id } = await routeCtx!.params;
  if (!id) throw validationError('Missing event id');

  const ownership = await getEventOwnership(ctx.adminClient, id);
  if (!ownership) throw notFound('ไม่พบงาน');
  if (!canUpdateEvent(ctx, ownership)) throw forbidden('คุณไม่มีสิทธิ์แก้ไขงานนี้');

  let body: any;
  try { body = await request.json(); } catch { throw validationError('Invalid JSON body'); }

  const update: Record<string, any> = {};

  if (body.type !== undefined) {
    const r = validateEventType(body.type);
    if (!r.ok) throw validationError(r.error);
    update.type = body.type as EventType;
  }
  if (body.title !== undefined) {
    const r = validateEventTitle(body.title);
    if (!r.ok) throw validationError(r.error);
    update.title = (body.title as string).trim().slice(0, EVENT_TITLE_MAX_LENGTH);
  }
  if (body.date !== undefined) {
    if (body.date === null || body.date === '') { update.date = null; }
    else if (typeof body.date === 'string' && DATE_REGEX.test(body.date)) { update.date = body.date; }
    else throw validationError('วันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD หรือ null)');
  }
  if (body.start_date !== undefined) {
    if (body.start_date === null || body.start_date === '') { update.start_date = null; }
    else { const r = validateStartDate(body.start_date); if (!r.ok) throw validationError(r.error); update.start_date = body.start_date; }
  }
  if (update.start_date !== undefined && update.date !== undefined) {
    const r = validateDateRange(update.start_date as string | null, update.date as string | null);
    if (!r.ok) throw validationError(r.error);
  }
  if (body.time !== undefined) { const r = validateTime(body.time); if (!r.ok) throw validationError(r.error); update.time = body.time || ''; }
  if (body.location !== undefined) { const r = validateLocation(body.location); if (!r.ok) throw validationError(r.error); update.location = (body.location || '').trim().slice(0, EVENT_LOCATION_MAX_LENGTH); }
  if (body.description !== undefined) { const r = validateDescription(body.description); if (!r.ok) throw validationError(r.error); update.description = (body.description || '').trim().slice(0, EVENT_DESCRIPTION_MAX_LENGTH); }
  if (body.department_id !== undefined) { const r = validateDepartmentId(body.department_id); if (!r.ok) throw validationError(r.error); update.department_id = body.department_id || null; }
  if (body.color !== undefined) { const r = validateColor(body.color); if (!r.ok) throw validationError(r.error); update.color = resolveEventColor(body.color); }

  if (Object.keys(update).length === 0) throw validationError('ไม่มี field ที่ต้องแก้ไข');

  const { error } = await eventsRepo.update(ctx.adminClient, id, update);
  if (error) throw internalError(`ไม่สามารถแก้ไขรายการ: ${error}`);

  auditLog('event_updated', { actor: ctx.userAuthUid, status: 'success', requestId: ctx.requestId, meta: { event_id: id } });
  return apiSuccess(null, ctx.requestId, { cache: 'noStore' });
});

export const DELETE = withAuth(async (ctx, _request, routeCtx) => {
  const { id } = await routeCtx!.params;
  if (!id) throw validationError('Missing event id');

  const ownership = await getEventOwnership(ctx.adminClient, id);
  if (!ownership) throw notFound('ไม่พบงาน');
  if (!canDeleteEvent(ctx, ownership)) throw forbidden('คุณไม่มีสิทธิ์ลบงานนี้');

  const { error } = await eventsRepo.remove(ctx.adminClient, id);
  if (error) throw internalError(`ไม่สามารถลบรายการ: ${error}`);

  auditLog('event_deleted', { actor: ctx.userAuthUid, status: 'success', requestId: ctx.requestId, meta: { event_id: id } });
  return apiSuccess(null, ctx.requestId, { cache: 'noStore' });
});
