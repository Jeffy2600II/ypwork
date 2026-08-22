import { withAdmin, apiSuccess } from '@/lib/api';
import { getPendingRequests } from '@/lib/db/pending-requests';
import { auditLog, sanitizeForLog } from '@/lib/security';

export const GET = withAdmin(async (ctx) => {
  try {
    const requests = await getPendingRequests(ctx.adminClient);
    auditLog('admin_approve_request', {
      actor: ctx.userAuthUid,
      status: 'success',
      requestId: ctx.requestId,
      meta: { action: 'list_requests', count: requests?.length ?? 0 },
    });
    return apiSuccess(requests, ctx.requestId);
  } catch (err) {
    console.error('[/api/admin/requests]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
    }));
    throw new Error('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่');
  }
});
