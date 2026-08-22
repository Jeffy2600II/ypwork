// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/admin/requests/[id]/reject (Round 24)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandlerParams,
  apiSuccess,
  apiError,
  apiErrors,
  ErrorCode,
  requireAuthAdmin,
} from '@/lib/api';
import { rejectRequest } from '@/lib/db/pending-requests';
import { validateUuidInput, auditLog, sanitizeForLog } from '@/lib/security';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withApiHandlerParams(async (req: NextRequest, { params }: RouteContext) => {
  const { id: requestId } = await params;

  if (!requestId) {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing request id', { status: 400 });
  }

  const idValid = validateUuidInput(requestId);
  if (!idValid.valid) {
    return apiError(req, ErrorCode.INVALID_PARAM, 'Invalid request id format', { status: 400 });
  }
  const validId: string = idValid.value!;

  const guard = await requireAuthAdmin(req);
  if (!guard.ok) {
    auditLog('admin_action_blocked', {
      status: 'blocked',
      meta: { action: 'reject_request', reason: 'auth_failed' },
    });
    return guard.response;
  }

  try {
    const result = await rejectRequest(guard.adminClient, validId);

    auditLog('admin_reject_request', {
      actor: guard.userAuthUid,
      status: result.success ? 'success' : 'failure',
      meta: { request_id: validId },
    });

    if (result.success) {
      return apiSuccess(req, result, { status: 200 });
    }
    return apiError(req, ErrorCode.INTERNAL_ERROR, result.error || 'ไม่สามารถปฏิเสธได้', { status: 400 });
  } catch (err) {
    console.error('[/api/admin/requests/[id]/reject]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
      request_id: validId,
    }));
    auditLog('admin_reject_request', {
      actor: guard.userAuthUid,
      status: 'failure',
      meta: { request_id: validId, error: 'exception' },
    });
    return apiErrors.internalError(req);
  }
});
