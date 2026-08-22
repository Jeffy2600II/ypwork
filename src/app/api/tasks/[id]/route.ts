// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PATCH/DELETE /api/tasks/[id] (Round 24)
// ═══════════════════════════════════════════════════════════════
// Uses the API gateway pattern with standardized responses.
// Data access through the task repository.
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
import { taskRepository } from '@/lib/repositories';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing task id', { status: 400 });
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

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return apiError(req, ErrorCode.VALIDATION_ERROR, 'ชื่อ task ไม่ถูกต้อง', { status: 400 });
    }
    update.title = body.title.trim();
  }

  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      return apiError(req, ErrorCode.VALIDATION_ERROR, 'ความสำคัญไม่ถูกต้อง', { status: 400 });
    }
    update.priority = body.priority;
  }

  if (body.due_date !== undefined) {
    if (body.due_date !== null && (typeof body.due_date !== 'string' || !DATE_RE.test(body.due_date))) {
      return apiError(req, ErrorCode.INVALID_PARAM, 'วันที่กำหนดส่งไม่ถูกต้อง', { status: 400 });
    }
    update.due_date = body.due_date || null;
  }

  if (body.start_date !== undefined) {
    if (body.start_date !== null && (typeof body.start_date !== 'string' || !DATE_RE.test(body.start_date))) {
      return apiError(req, ErrorCode.INVALID_PARAM, 'วันที่เริ่มไม่ถูกต้อง', { status: 400 });
    }
    update.start_date = body.start_date || null;
  }

  if (body.start_time !== undefined) {
    if (body.start_time !== null && (typeof body.start_time !== 'string' || !TIME_RE.test(body.start_time))) {
      return apiError(req, ErrorCode.INVALID_PARAM, 'เวลาเริ่มไม่ถูกต้อง', { status: 400 });
    }
    update.start_time = body.start_time || null;
  }

  if (body.estimated_time !== undefined) update.estimated_time = body.estimated_time || '';
  if (body.notes !== undefined) update.notes = body.notes || '';
  if (body.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : [];

  if (update.start_date !== undefined && update.due_date !== undefined) {
    if (update.start_date && update.due_date && update.due_date < update.start_date) {
      return apiError(req, ErrorCode.VALIDATION_ERROR, 'วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม', { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, 'ไม่มี field ที่ต้องแก้ไข', { status: 400 });
  }

  try {
    const error = await taskRepository.update(guard.adminClient, id, update);
    if (error) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถแก้ไข task: ${error}`, { status: 500 });
    }

    return apiSuccess(req, {});
  } catch {
    return apiErrors.internalError(req);
  }
});

export const DELETE = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing task id', { status: 400 });
  }

  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  try {
    const error = await taskRepository.delete(guard.adminClient, id);
    if (error) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถลบ task: ${error}`, { status: 500 });
    }

    return apiSuccess(req, {});
  } catch {
    return apiErrors.internalError(req);
  }
});
