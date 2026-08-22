// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/admin/approve-request (Round 24)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandler,
  apiSuccess,
  apiError,
  apiErrors,
  ErrorCode,
  requireAuthAdmin,
} from '@/lib/api';
import { approveRequest } from '@/lib/db/pending-requests';
import { validateUuidInput, auditLog, sanitizeForLog } from '@/lib/security';

export const POST = withApiHandler(async (req: NextRequest) => {
  let requestId: string | undefined;
  try {
    const body = await req.json();
    requestId = body?.requestId;
  } catch {
    return apiErrors.invalidJson(req);
  }

  if (!requestId || typeof requestId !== 'string') {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing requestId', { status: 400 });
  }
  const idValid = validateUuidInput(requestId);
  if (!idValid.valid) {
    return apiError(req, ErrorCode.INVALID_PARAM, 'Invalid requestId format', { status: 400 });
  }
  const validId: string = idValid.value!;

  const guard = await requireAuthAdmin(req);
  if (!guard.ok) {
    auditLog('admin_action_blocked', {
      actor: guard.response.status === 401 ? undefined : 'unknown_admin',
      status: 'blocked',
      meta: { action: 'approve_request', reason: 'auth_failed' },
    });
    return guard.response;
  }

  try {
    const result = await approveRequest(guard.adminClient, validId);

    auditLog('admin_approve_request', {
      actor: guard.userAuthUid,
      status: result.success ? 'success' : 'failure',
      meta: { request_id: validId },
    });

    if (result.success) {
      return apiSuccess(req, result, { status: 200 });
    }
    return apiError(req, ErrorCode.INTERNAL_ERROR, result.error || 'ไม่สามารถอนุมัติได้', { status: 400 });
  } catch (err) {
    console.error('[/api/admin/approve-request]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
      request_id: validId,
    }));
    auditLog('admin_approve_request', {
      actor: guard.userAuthUid,
      status: 'failure',
      meta: { request_id: validId, error: 'exception' },
    });
    return apiErrors.internalError(req);
  }
});
