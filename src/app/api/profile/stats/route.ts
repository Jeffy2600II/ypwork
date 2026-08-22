// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/profile/stats (Round 24)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandler,
  apiSuccess,
  apiError,
  apiErrors,
  ErrorCode,
  requireAuthUser,
} from '@/lib/api';
import { userRepository } from '@/lib/repositories';

export const GET = withApiHandler(async (req: NextRequest) => {
  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const userAuthUid = searchParams.get('user_auth_uid');
  const departmentId = searchParams.get('department_id');

  if (!userAuthUid) {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing user_auth_uid parameter', { status: 400 });
  }

  try {
    const stats = await userRepository.getProfileStats(
      guard.adminClient,
      userAuthUid,
      departmentId
    );

    return apiSuccess(req, { stats }, { cache: 'list' });
  } catch {
    return apiErrors.internalError(req);
  }
});
