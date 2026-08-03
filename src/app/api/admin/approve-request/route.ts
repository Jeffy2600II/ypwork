// ═══════════════════════════════════════════════════════════════
// YP WORK · API · /api/admin/approve-request (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// อนุมัติการลงทะเบียน — สร้าง auth user + council_users row + ลบคำขอ
// ใช้ requireAdmin() เพื่อตรวจสอบสิทธิ์ก่อน
//
// ★ v3.0.0 Security:
//   - Rate limit: ADMIN_API (60 req/min/IP)
//   - Audit log: บันทึกทุก approve/reject action
//   - Input validation: requestId ต้องเป็น UUID
//   - ไม่ log PII ใน error messages
//
// Body: { requestId: string }
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-guard';
import { approveRequest } from '@/lib/db/pending-requests';
import { validateUuidInput, auditLog, sanitizeForLog } from '@/lib/security';

export async function POST(request: NextRequest) {
  let requestId: string | undefined;
  try {
    const body = await request.json();
    requestId = body?.requestId;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // ★ v3.0.0: validate requestId เป็น UUID (กัน injection)
  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing requestId' },
      { status: 400 }
    );
  }
  const idValid = validateUuidInput(requestId);
  if (!idValid.valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid requestId format' },
      { status: 400 }
    );
  }
  const validId: string = idValid.value!;

  const guard = await requireAdmin();
  if (!guard.ok) {
    // ★ v3.0.0: audit log failed admin access
    auditLog('admin_action_blocked', {
      actor: guard.response.status === 401 ? undefined : 'unknown_admin',
      status: 'blocked',
      meta: { action: 'approve_request', reason: 'auth_failed' },
    });
    return NextResponse.json(
      { success: false, error: 'ไม่ได้รับอนุญาต' },
      { status: guard.response.status }
    );
  }

  try {
    const result = await approveRequest(guard.adminClient, validId);

    // ★ v3.0.0: audit log success/failure
    auditLog('admin_approve_request', {
      actor: guard.userAuthUid,
      status: result.success ? 'success' : 'failure',
      meta: { request_id: validId },
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err) {
    console.error('[/api/admin/approve-request]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
      request_id: validId,
    }));
    auditLog('admin_approve_request', {
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
