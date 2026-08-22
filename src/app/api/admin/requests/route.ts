// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/admin/requests (Round 24)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandler,
  apiSuccess,
  apiErrors,
  requireAuthAdmin,
} from '@/lib/api';
import { getPendingRequests } from '@/lib/db/pending-requests';
import { auditLog, sanitizeForLog } from '@/lib/security';

export const GET = withApiHandler(async (req: NextRequest) => {
  const guard = await requireAuthAdmin(req);
  if (!guard.ok) {
    auditLog('admin_action_blocked', {
      status: 'blocked',
      meta: { action: 'list_requests', reason: 'auth_failed' },
    });
    return guard.response;
  }

  try {
    const requests = await getPendingRequests(guard.adminClient);

    auditLog('admin_approve_request', {
      actor: guard.userAuthUid,
      status: 'success',
      meta: { action: 'list_requests', count: requests?.length ?? 0 },
    });

    return apiSuccess(req, { requests });
  } catch (err) {
    console.error('[/api/admin/requests]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
    }));
    return apiErrors.internalError(req);
  }
});
