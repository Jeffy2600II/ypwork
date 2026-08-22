import { withAdmin, apiSuccess } from '@/lib/api';
import { validationError } from '@/lib/api/errors';
import { rejectRequest } from '@/lib/db/pending-requests';
import { validateUuidInput, auditLog, sanitizeForLog } from '@/lib/security';

export const POST = withAdmin(async (ctx, _request, routeCtx) => {
  const { id: requestIdFromParams } = await routeCtx!.params;

  if (!requestIdFromParams) throw validationError('Missing request id');

  const idValid = validateUuidInput(requestIdFromParams);
  if (!idValid.valid) throw validationError('Invalid request id format');
  const validId: string = idValid.value!;

  try {
    const result = await rejectRequest(ctx.adminClient, validId);

    auditLog('admin_reject_request', {
      actor: ctx.userAuthUid,
      status: result.success ? 'success' : 'failure',
      requestId: ctx.requestId,
      meta: { request_id: validId },
    });

    if (!result.success) throw validationError(result.error || 'ไม่สามารถปฏิเสธคำขอได้');
    return apiSuccess(result, ctx.requestId, { cache: 'noStore' });
  } catch (err) {
    console.error('[/api/admin/requests/[id]/reject]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
      request_id: validId,
    }));
    auditLog('admin_reject_request', {
      actor: ctx.userAuthUid,
      status: 'failure',
      requestId: ctx.requestId,
      meta: { request_id: validId, error: 'exception' },
    });
    throw err;
  }
});
