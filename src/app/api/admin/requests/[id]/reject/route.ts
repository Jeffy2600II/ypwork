// ═══════════════════════════════════════════════════════════════
// YP WORK · POST /api/admin/requests/[id]/reject (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// ปฏิเสธการลงทะเบียน — DELETE row จาก council_join_requests
// ใช้ requireAdmin() เพื่อตรวจสอบสิทธิ์ก่อน
//
// ฝั่ง client จะ detect ผ่าน realtime แล้วแสดงข้อความ "ถูกปฏิเสธ"
// (ไม่ต้องเก็บข้อมูลการปฏิเสธใน DB แยกต่างหาก)
//
// ★ v3.0.0 Security:
//   - Rate limit: ADMIN_API (60 req/min/IP) — through middleware
//   - Audit log: บันทึกทุก reject action
//   - Input validation: requestId ต้องเป็น UUID
//   - ไม่ log PII ใน error messages
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-guard';
import { rejectRequest } from '@/lib/db/pending-requests';
import { validateUuidInput, auditLog, sanitizeForLog } from '@/lib/security';

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

  // ★ v3.0.0: validate requestId เป็น UUID
  const idValid = validateUuidInput(requestId);
  if (!idValid.valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid request id format' },
      { status: 400 }
    );
  }
  const validId: string = idValid.value!;

  const guard = await requireAdmin();
  if (!guard.ok) {
    auditLog('admin_action_blocked', {
      status: 'blocked',
      meta: { action: 'reject_request', reason: 'auth_failed' },
    });
    return NextResponse.json(
      { success: false, error: 'ไม่ได้รับอนุญาต' },
      { status: guard.response.status }
    );
  }

  try {
    const result = await rejectRequest(guard.adminClient, validId);

    auditLog('admin_reject_request', {
      actor: guard.userAuthUid,
      status: result.success ? 'success' : 'failure',
      meta: { request_id: validId },
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err) {
    console.error('[/api/admin/requests/[id]/reject]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
      request_id: validId,
    }));
    auditLog('admin_reject_request', {
      actor: guard.userAuthUid,
      status: 'failure',
      meta: { request_id: validId, error: 'exception' },
    });
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่',
      },
      { status: 500 }
    );
  }
}
