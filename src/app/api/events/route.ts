import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api';
import { validationError, internalError } from '@/lib/api/errors';
import { eventsRepo } from '@/lib/repositories';
import { createId } from '@/lib/utils/id';
import { auditLog } from '@/lib/security';
import {
  validateEventPayload,
  validateDateRange,
  DATE_REGEX,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_LOCATION_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  type EventPayloadForValidation,
} from '@/modules/events/event-validation';
import { resolveEventColor } from '@/modules/events/event-colors';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withAuth(async (ctx, request) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  try {
    const events = await eventsRepo.findAll(ctx.adminClient, {
      from: from && DATE_RE.test(from) ? from : null,
      to: to && DATE_RE.test(to) ? to : null,
      date: date && DATE_RE.test(date) ? date : null,
    });
    return apiSuccess(events, ctx.requestId, { cache: 'list' });
  } catch (err) {
    console.error('[/api/events GET]', ctx.requestId, err);
    auditLog('api_error', { status: 'failure', requestId: ctx.requestId, meta: { path: '/api/events', error: String(err).slice(0, 200) } });
    throw internalError();
  }
});

export const POST = withAuth(async (ctx, request) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    throw validationError('Invalid JSON body');
  }

  const payload: EventPayloadForValidation = {
    type: body.type,
    title: body.title,
    date: body.date,
    start_date: body.start_date,
    time: body.time,
    location: body.location,
    description: body.description,
    color: body.color,
    department_id: body.department_id,
  };
  const validation = validateEventPayload(payload);
  if (!validation.ok) throw validationError(validation.error);

  const type = body.type as 'group' | 'task';
  const title = (body.title as string).trim().slice(0, EVENT_TITLE_MAX_LENGTH);

  let date: string | null = null;
  if (typeof body.date === 'string' && DATE_REGEX.test(body.date)) {
    date = body.date;
  }

  let start_date: string | null = null;
  if (typeof body.start_date === 'string' && DATE_REGEX.test(body.start_date)) {
    start_date = body.start_date;
  }

  const rangeCheck = validateDateRange(start_date, date);
  if (!rangeCheck.ok) throw validationError(rangeCheck.error);

  const time = typeof body.time === 'string' && body.time ? body.time.slice(0, 8) : '';
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, EVENT_LOCATION_MAX_LENGTH) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, EVENT_DESCRIPTION_MAX_LENGTH) : '';
  const color = resolveEventColor(body.color);
  const department_id = typeof body.department_id === 'string' && body.department_id ? body.department_id : null;

  const id = createId('ev');

  const { error } = await eventsRepo.create(ctx.adminClient, {
    id, type, title, date, start_date, time, location, description,
    department_id, color, created_by: ctx.userAuthUid,
  });

  if (error) throw internalError(`ไม่สามารถสร้างรายการ: ${error}`);

  auditLog('event_created', { actor: ctx.userAuthUid, status: 'success', requestId: ctx.requestId, meta: { event_id: id, type, title: title.slice(0, 100) } });
  return apiSuccess({ id }, ctx.requestId, { status: 201, cache: 'noStore' });
});
