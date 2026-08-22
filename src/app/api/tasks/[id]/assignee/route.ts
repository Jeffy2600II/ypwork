// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PUT /api/tasks/[id]/assignee (Round 24)
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id: taskId } = await params;
  if (!taskId || typeof taskId !== 'string') {
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

  const { assignee_id } = body || {};
  if (assignee_id !== null && (typeof assignee_id !== 'string' || !assignee_id.trim())) {
    return apiError(req, ErrorCode.INVALID_PARAM, 'assignee_id ไม่ถูกต้อง', { status: 400 });
  }

  try {
    const error = await taskRepository.setAssignee(guard.adminClient, taskId, assignee_id);
    if (error) {
      return apiError(req, ErrorCode.INTERNAL_ERROR, `ไม่สามารถตั้ง assignee: ${error}`, { status: 500 });
    }

    return apiSuccess(req, {});
  } catch {
    return apiErrors.internalError(req);
  }
});
