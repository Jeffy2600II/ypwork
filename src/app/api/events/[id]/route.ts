// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PATCH/DELETE /api/events/[id] (Round 24)
// ═══════════════════════════════════════════════════════════════
// Uses the API gateway pattern with standardized responses.
// Data access through the event repository.
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandlerParams,
  apiSuccess,
  apiError,
  apiErrors,
  ErrorCode,
  requireAuthUser,
} from '@/lib/api';
import { eventRepository } from '@/lib/repositories';
import {
  validateEventType,
  validateEventTitle,
  validateTime,
  validateLocation,
  validateDescription,
  validateColor,
  validateDepartmentId,
  validateStartDate,
  validateDateRange,
  DATE_REGEX,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_LOCATION_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
} from '@/modules/events/event-validation';
import { resolveEventColor } from '@/modules/events/event-colors';
import type { EventType } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing event id', { status: 400 });
  }

  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiErrors.invalidJson(req);
  }

  const update: Record<string, any> = {};

  if (body.type !== undefined) {
    const r = validateEventType(body.type);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.type = body.type as EventType;
  }

  if (body.title !== undefined) {
    const r = validateEventTitle(body.title);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.title = (body.title as string).trim().slice(0, EVENT_TITLE_MAX_LENGTH);
  }

  if (body.date !== undefined) {
    if (body.date === null || body.date === '') {
      update.date = null;
    } else if (typeof body.date === 'string' && DATE_REGEX.test(body.date)) {
      update.date = body.date;
    } else {
      return apiError(req, ErrorCode.INVALID_PARAM, 'วันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD หรือ null)', { status: 400 });
    }
  }

  if (body.start_date !== undefined) {
    if (body.start_date === null || body.start_date === '') {
      update.start_date = null;
    } else {
      const r = validateStartDate(body.start_date);
      if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
      update.start_date = body.start_date;
    }
  }

  if (update.start_date !== undefined && update.date !== undefined) {
    const r = validateDateRange(update.start_date as string | null, update.date as string | null);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
  }

  if (body.time !== undefined) {
    const r = validateTime(body.time);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.time = body.time || '';
  }

  if (body.location !== undefined) {
    const r = validateLocation(body.location);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.location = (body.location || '').trim().slice(0, EVENT_LOCATION_MAX_LENGTH);
  }

  if (body.description !== undefined) {
    const r = validateDescription(body.description);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.description = (body.description || '').trim().slice(0, EVENT_DESCRIPTION_MAX_LENGTH);
  }

  if (body.department_id !== undefined) {
    const r = validateDepartmentId(body.department_id);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.department_id = body.department_id || null;
  }

  if (body.color !== undefined) {
    const r = validateColor(body.color);
    if (!r.ok) return apiError(req, ErrorCode.VALIDATION_ERROR, r.error!, { status: 400 });
    update.color = resolveEventColor(body.color);
  }

  if (Object.keys(update).length === 0) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, 'ไม่มี field ที่ต้องแก้ไข', { status: 400 });
  }

  try {
    const error = await eventRepository.update(guard.adminClient, id, update);
    if (error) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถแก้ไขรายการ: ${error}`, { status: 500 });
    }

    return apiSuccess(req, {});
  } catch {
    return apiErrors.internalError(req);
  }
});

export const DELETE = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing event id', { status: 400 });
  }

  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  try {
    const error = await eventRepository.delete(guard.adminClient, id);
    if (error) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถลบรายการ: ${error}`, { status: 500 });
    }

    return apiSuccess(req, {});
  } catch {
    return apiErrors.internalError(req);
  }
});
