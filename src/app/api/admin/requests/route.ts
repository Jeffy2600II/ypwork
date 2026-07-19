// ═══════════════════════════════════════════════════════════════
// YP WORK · API · /api/admin/requests (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// ดึงรายการการลงทะเบียนทั้งหมด (สำหรับ admin)
// ใช้ requireAdmin() เพื่อตรวจสอบสิทธิ์ก่อน
//
// ★ v3.0.0 Security:
//   - Rate limit: ADMIN_API (60 req/min/IP)
//   - Audit log: บันทึก access
//   - ไม่ log PII ใน error messages
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-guard';
import { getPendingRequests } from '@/lib/db/pending-requests';
import { auditLog, sanitizeForLog } from '@/lib/security';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    auditLog('admin_action_blocked', {
      status: 'blocked',
      meta: { action: 'list_requests', reason: 'auth_failed' },
    });
    return NextResponse.json(
      { success: false, error: 'ไม่ได้รับอนุญาต' },
      { status: guard.response.status }
    );
  }

  try {
    const requests = await getPendingRequests(guard.adminClient);

    // ★ v3.0.0: audit log access (no PII)
    auditLog('admin_approve_request', {
      actor: guard.userAuthUid,
      status: 'success',
      meta: { action: 'list_requests', count: requests?.length ?? 0 },
    });

    return NextResponse.json({ success: true, requests });
  } catch (err) {
    console.error('[/api/admin/requests]', sanitizeForLog({
      message: err instanceof Error ? err.message : String(err),
    }));
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่',
      },
      { status: 500 }
    );
  }
}
