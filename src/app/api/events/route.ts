// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET/POST /api/events (Round 24)
// ═══════════════════════════════════════════════════════════════
// Uses the API gateway pattern for:
//   - Request ID tracking
//   - Standardized response contract
//   - Error normalization
//   - Structured logging
//
// Data access goes through the event repository (data access layer).
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandler,
  apiSuccess,
  apiCreated,
  apiError,
  apiErrors,
  ErrorCode,
  requireAuthUser,
} from '@/lib/api';
import { eventRepository } from '@/lib/repositories';
import { auditLog } from '@/lib/security';
import { createId } from '@/lib/utils/id';
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

// ── GET /api/events ────────────────────────────────────────────
// ดึง events ทั้งหมดพร้อม department + tasks + assignees
// Query params: ?from=YYYY-MM-DD ?to=YYYY-MM-DD ?date=YYYY-MM-DD

export const GET = withApiHandler(async (req: NextRequest) => {
  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  try {
    // ★ Data access through repository (not direct Supabase calls)
    const events = await eventRepository.findAll(guard.adminClient, {
      from: from && DATE_RE.test(from) ? from : null,
      to: to && DATE_RE.test(to) ? to : null,
      date: date && DATE_RE.test(date) ? date : null,
    });

    return apiSuccess(req, { events }, { cache: 'list' });
  } catch (err) {
    auditLog('api_error', {
      status: 'failure',
      meta: { path: '/api/events', error: String(err).slice(0, 200) },
    });
    return apiErrors.internalError(req);
  }
});

// ── POST /api/events — สร้าง event ใหม่ ──────────────────────

export const POST = withApiHandler(async (req: NextRequest) => {
  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiErrors.invalidJson(req);
  }

  // ── Validate payload (single source of truth) ──
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
  if (!validation.ok) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, validation.error!, { status: 400 });
  }

  // ── Normalize fields ──
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
  if (!rangeCheck.ok) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, rangeCheck.error!, { status: 400 });
  }

  const time =
    typeof body.time === 'string' && body.time
      ? body.time.slice(0, 8)
      : '';
  const location =
    typeof body.location === 'string'
      ? body.location.trim().slice(0, EVENT_LOCATION_MAX_LENGTH)
      : '';
  const description =
    typeof body.description === 'string'
      ? body.description.trim().slice(0, EVENT_DESCRIPTION_MAX_LENGTH)
      : '';
  const color = resolveEventColor(body.color);
  const department_id =
    typeof body.department_id === 'string' && body.department_id
      ? body.department_id
      : null;

  const id = createId('ev');

  try {
    // ★ Data access through repository
    const result = await eventRepository.create(guard.adminClient, {
      id,
      type,
      title,
      date,
      start_date,
      time,
      location,
      description,
      department_id,
      color,
      created_by: guard.userAuthUid,
    });

    if (result.error) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถสร้างรายการ: ${result.error}`, { status: 500 });
    }

    auditLog('event_created', {
      actor: guard.userAuthUid,
      status: 'success',
      meta: { event_id: id, type, title: title.slice(0, 100) },
    });

    return apiCreated(req, { id });
  } catch (err) {
    auditLog('event_created', {
      actor: guard.userAuthUid,
      status: 'failure',
      meta: { error: String(err).slice(0, 200) },
    });
    return apiErrors.internalError(req);
  }
});
