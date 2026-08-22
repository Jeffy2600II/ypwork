// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Root Endpoint (Round 24)
// ═══════════════════════════════════════════════════════════════
// API metadata endpoint — returns version info for observability.
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { withApiHandler, apiSuccess } from '@/lib/api';

export const GET = withApiHandler(async (req: NextRequest) => {
  return apiSuccess(req, {
    name: 'YP Work API',
    version: '3.11.0',
    status: 'operational',
  });
});
