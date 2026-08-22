// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/events/[id]/tasks (Round 24)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandlerParams,
  apiCreated,
  apiError,
  apiErrors,
  ErrorCode,
  requireAuthUser,
} from '@/lib/api';
import { taskRepository, eventRepository } from '@/lib/repositories';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id: eventId } = await params;
  if (!eventId || typeof eventId !== 'string') {
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

  const { title, priority, due_date, start_date, start_time, estimated_time, notes, tags, assignee_id } = body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, 'กรุณากรอกชื่อ task', { status: 400 });
  }

  const finalPriority = priority || 'medium';
  if (!VALID_PRIORITIES.includes(finalPriority)) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, 'ความสำคัญไม่ถูกต้อง', { status: 400 });
  }

  if (due_date !== undefined && due_date !== null && (typeof due_date !== 'string' || !DATE_RE.test(due_date))) {
    return apiError(req, ErrorCode.INVALID_PARAM, 'วันที่กำหนดส่งไม่ถูกต้อง', { status: 400 });
  }

  if (start_date !== undefined && start_date !== null && (typeof start_date !== 'string' || !DATE_RE.test(start_date))) {
    return apiError(req, ErrorCode.INVALID_PARAM, 'วันที่เริ่มไม่ถูกต้อง', { status: 400 });
  }

  if (start_time !== undefined && start_time !== null && (typeof start_time !== 'string' || !TIME_RE.test(start_time))) {
    return apiError(req, ErrorCode.INVALID_PARAM, 'เวลาเริ่มไม่ถูกต้อง', { status: 400 });
  }

  if (start_date && due_date && due_date < start_date) {
    return apiError(req, ErrorCode.VALIDATION_ERROR, 'วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม', { status: 400 });
  }

  // Verify event exists via repository
  const exists = await eventRepository.exists(guard.adminClient, eventId);
  if (!exists) {
    return apiErrors.notFound(req, 'งาน');
  }

  try {
    const count = await taskRepository.countByEvent(guard.adminClient, eventId);

    const { data: taskData, error: taskErr } = await taskRepository.create(guard.adminClient, {
      event_id: eventId,
      title: title.trim(),
      priority: finalPriority,
      due_date: due_date || null,
      start_date: start_date || null,
      start_time: start_time || null,
      estimated_time: estimated_time || '',
      notes: notes || '',
      tags: Array.isArray(tags) ? tags : [],
      sort_order: count || 0,
    });

    if (taskErr || !taskData) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถเพิ่ม task: ${taskErr || 'unknown'}`, { status: 500 });
    }

    // Insert assignee if provided
    if (assignee_id) {
      const assigneeErr = await taskRepository.setAssignee(guard.adminClient, taskData.id, assignee_id);
      if (!assigneeErr) {
        const profile = await taskRepository.fetchAssigneeProfile(guard.adminClient, assignee_id);
        if (profile) {
          taskData.assignees = [profile];
        }
      }
    }

    return apiCreated(req, { task: taskData });
  } catch {
    return apiErrors.internalError(req);
  }
});
