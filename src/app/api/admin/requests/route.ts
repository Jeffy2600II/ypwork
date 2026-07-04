// ═══════════════════════════════════════════════════════════════
// YP WORK · GET /api/admin/requests (v1.9.1)
// ═══════════════════════════════════════════════════════════════
// ดึงรายการคำขอสมัครทั้งหมด (สำหรับ admin)
// ใช้ requireAdmin() เพื่อตรวจสอบสิทธิ์ก่อน
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-guard';
import { getPendingRequests } from '@/lib/db/pending-requests';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้รับอนุญาต' },
      { status: guard.response.status }
    );
  }

  try {
    const requests = await getPendingRequests(guard.adminClient);
    return NextResponse.json({ success: true, requests });
  } catch (err) {
    console.error('[/api/admin/requests]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
