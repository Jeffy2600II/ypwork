// ═══════════════════════════════════════════════════════════════
// YP WORK · POST /api/admin/requests/[id]/reject (v1.9.1)
// ═══════════════════════════════════════════════════════════════
// ปฏิเสธคำขอสมัคร — DELETE row จาก council_join_requests
// ใช้ requireAdmin() เพื่อตรวจสอบสิทธิ์ก่อน
//
// ฝั่ง client จะ detect ผ่าน realtime แล้วแสดงข้อความ "ถูกปฏิเสธ"
// (ไม่ต้องเก็บข้อมูลการปฏิเสธใน DB แยกต่างหาก)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-guard';
import { rejectRequest } from '@/lib/db/pending-requests';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;

  if (!requestId) {
    return NextResponse.json(
      { success: false, error: 'Missing request id' },
      { status: 400 }
    );
  }

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้รับอนุญาต' },
      { status: guard.response.status }
    );
  }

  try {
    const result = await rejectRequest(guard.adminClient, requestId);
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err) {
    console.error('[/api/admin/requests/[id]/reject]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
