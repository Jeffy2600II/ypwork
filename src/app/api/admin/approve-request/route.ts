import { withAdmin, apiSuccess } from '@/lib/api';
import { validationError } from '@/lib/api/errors';
import { approveRequest } from '@/lib/db/pending-requests';
import { validateUuidInput, auditLog, sanitizeForLog } from '@/lib/security';

export const POST = withAdmin(async (ctx, request) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    throw validationError('Invalid JSON body');
  }

  const requestIdFromBody = body?.requestId;
  if (!requestIdFromBody || typeof requestIdFromBody !== 'string') {
    throw validationError('Missing requestId');
  }
  const idValid = validateUuidInput(requestIdFromBody);
  if (!idValid.valid) throw validationError('Invalid requestId format');
  const validId: string = idValid.value!;

  try {
    const result = await approveRequest(ctx.adminClient, validId);

    auditLog('admin_approve_request', {
      actor: ctx.userAuthUid,
      status: result.success ? 'success' : 'failure',
      requestId: ctx.requestId,
      meta: { request_id: validId },
    });

    if (!result.success) throw validationError(result.error || 'ไม่สามารถอนุมัติคำขอได้');
    return apiSuccess(result, ctx.requestId, { cache: 'noStore' });
  } catch (err) {
    console.error('[/api/admin/approve-request]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
      request_id: validId,
    }));
    auditLog('admin_approve_request', {
      actor: ctx.userAuthUid,
      status: 'failure',
      requestId: ctx.requestId,
      meta: { request_id: validId, error: 'exception' },
    });
    throw err;
  }
});
