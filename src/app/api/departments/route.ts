// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/departments (Round 24)
// ═══════════════════════════════════════════════════════════════

import {
  withApiHandler,
  apiSuccess,
  apiErrors,
  requireAuthUser,
} from '@/lib/api';
import { departmentRepository } from '@/lib/repositories';
import type { NextRequest } from 'next/server';

export const GET = withApiHandler(async (req: NextRequest) => {
  const guard = await requireAuthUser(req);
  if (!guard.ok) return guard.response;

  try {
    const departments = await departmentRepository.findAll(guard.adminClient);
    return apiSuccess(req, { departments }, { cache: 'staticList' });
  } catch {
    return apiErrors.internalError(req);
  }
});
