// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/departments/members (Round 24)
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
import { departmentRepository } from '@/lib/repositories';

export const GET = withApiHandler(async (req: NextRequest) => {
  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const deptId = searchParams.get('dept_id');

  if (!deptId) {
    return apiError(req, ErrorCode.MISSING_PARAM, 'Missing dept_id parameter', { status: 400 });
  }

  try {
    const members = await departmentRepository.findMembers(guard.adminClient, deptId);
    return apiSuccess(req, { members }, { cache: 'staticList' });
  } catch {
    return apiErrors.internalError(req);
  }
});
