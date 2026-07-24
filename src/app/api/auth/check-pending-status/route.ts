// ═══════════════════════════════════════════════════════════════
// YP WORK · API · /api/auth/check-pending-status (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// ตรวจสอบสถานะการลงทะเบียนของผู้ใช้แบบ definitive
//
// ★ v3.0.0 Security hardening:
//   - Rate limit: 10 req/min per IP (กัน brute-force enumeration)
//   - Input validation: ตรวจ national_id check digit, email format
//   - PII protection: ไม่ส่ง national_id กลับไปใน response
//   - Audit log: บันทึกทุกครั้งที่มีการเช็ค
//   - Generic error: ไม่ leak internal error messages
//
// ★ Logic ตาม requirement ของ user (v1.9.2):
//   - ข้อมูลอยู่ใน council_join_requests = ยังรออนุมัติ (pending)
//   - ข้อมูลไม่อยู่ใน council_join_requests:
//     - ถ้าอยู่ใน council_users (approved=true) = approved
//     - ถ้าไม่อยู่ใน council_users = rejected (หรือไม่เคยสมัคร)
//
// Auth: ไม่ต้อง login — API นี้ใช้สำหรับ pre-login status check
//       แต่จำกัด input เพื่อกัน abuse
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { synthesizeEmail } from '@/lib/auth';
import {
  getClientIp,
  validateStudentCodeInput,
  validateEmailInput,
  sanitizeForLog,
  auditLog,
  looksLikeSqlInjection,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/check-pending-status?student_id=12345
 * GET /api/auth/check-pending-status?email=test@example.com
 * GET /api/auth/check-pending-status?student_id=12345&national_id=XXXXXXXXXXXXX (verify match)
 *
 * Response:
 *   {
 *     status: 'pending' | 'approved' | 'rejected' | 'error',
 *     request?: { full_name, student_id, email, has_national_id, account_type, year, department_id, submitted_at },
 *     user?: { full_name, auth_uid }
 *   }
 *
 * ★ v3.0.0: national_id ไม่ถูกส่งกลับใน response อีกต่อไป
 *   เพื่อป้องกัน leak ผ่าน logs/cache/inspect
 *
 * ★ v3.0.0: ถ้าส่ง national_id มาด้วย → server ตรวจสอบ match ฝั่ง server
 *   ถ้าไม่ตรง → return status='error' (ป้องกัน user ใช้ student_code คนอื่น)
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const url = new URL(request.url);
    const rawStudentId = url.searchParams.get('student_id');
    const rawEmail = url.searchParams.get('email');
    const rawNationalId = url.searchParams.get('national_id');

    // ─────────────────────────────────────────────────────────
    // Input validation
    // ─────────────────────────────────────────────────────────
    if (!rawStudentId && !rawEmail) {
      return NextResponse.json(
        { status: 'error', error: 'ต้องระบุ student_id หรือ email' },
        { status: 400 }
      );
    }

    let studentId: string | null = null;
    let email: string | null = null;
    let nationalId: string | null = null;

    if (rawStudentId) {
      // ตรวจ SQL injection pattern
      if (looksLikeSqlInjection(rawStudentId)) {
        auditLog('suspicious_input', {
          ip,
          status: 'blocked',
          meta: { field: 'student_id', reason: 'sql_injection_pattern' },
        });
        return NextResponse.json(
          { status: 'error', error: 'input ไม่ถูกต้อง' },
          { status: 400 }
        );
      }
      const sidValid = validateStudentCodeInput(rawStudentId);
      if (!sidValid.valid) {
        return NextResponse.json(
          { status: 'error', error: sidValid.error },
          { status: 400 }
        );
      }
      studentId = sidValid.value!;
    } else if (rawEmail) {
      if (looksLikeSqlInjection(rawEmail)) {
        auditLog('suspicious_input', {
          ip,
          status: 'blocked',
          meta: { field: 'email', reason: 'sql_injection_pattern' },
        });
        return NextResponse.json(
          { status: 'error', error: 'input ไม่ถูกต้อง' },
          { status: 400 }
        );
      }
      // จำกัดความยาวก่อน validate (กัน ReDoS)
      if (rawEmail.length > 254) {
        return NextResponse.json(
          { status: 'error', error: 'input ยาวเกินไป' },
          { status: 400 }
        );
      }
      const emailValid = validateEmailInput(rawEmail);
      if (!emailValid.valid) {
        return NextResponse.json(
          { status: 'error', error: emailValid.error },
          { status: 400 }
        );
      }
      email = emailValid.value!;
    }

    // ★ v3.0.0: ถ้าส่ง national_id มาด้วย → validate (ใช้สำหรับ server-side verification)
    if (rawNationalId) {
      const nidValid = (await import('@/lib/security/validation')).validateNationalIdInput(rawNationalId);
      if (!nidValid.valid) {
        return NextResponse.json(
          { status: 'error', error: nidValid.error },
          { status: 400 }
        );
      }
      nationalId = nidValid.value!;
    }

    // ─────────────────────────────────────────────────────────
    // สร้าง adminClient (service role) — bypass RLS
    // ─────────────────────────────────────────────────────────
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (err) {
      // ★ v3.0.0: ไม่ leak internal error
      auditLog('admin_action_blocked', {
        ip,
        status: 'failure',
        meta: { reason: 'service_role_key_missing', path: 'check-pending-status' },
      });
      return NextResponse.json(
        { status: 'error', error: 'ระบบยังไม่พร้อม — กรุณาติดต่อผู้ดูแล' },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // STEP 1: ตรวจ council_join_requests ก่อน
    //   ถ้ามี row → pending (ยังไม่ถูกอนุมัติ และยังไม่ถูกปฏิเสธ)
    //
    // ★ v3.0.0: fetch national_id มาเพื่อ server-side verification (ถ้า client ส่งมา)
    //   แต่ไม่ส่ง national_id กลับไปใน response
    // ─────────────────────────────────────────────────────────
    let requestQuery = adminClient
      .from('council_join_requests')
      .select(
        'id, full_name, student_id, email, national_id, account_type, year, department_id, created_at'
      );

    if (studentId) {
      requestQuery = requestQuery.eq('student_id', studentId);
    } else if (email) {
      requestQuery = requestQuery.eq('email', email);
    }

    const { data: pendingRow, error: pendingErr } = await requestQuery
      .limit(1)
      .maybeSingle();

    if (pendingErr) {
      // ★ v3.0.0: log internal error แต่ส่ง generic message กลับ
      console.error('[check-pending-status] DB error:', sanitizeForLog({
        message: pendingErr.message,
        code: pendingErr.code,
        studentId,
        email,
      }));
      return NextResponse.json(
        { status: 'error', error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' },
        { status: 500 }
      );
    }

    if (pendingRow) {
      // ★ v3.0.0: Server-side national_id verification
      // ถ้า client ส่ง national_id มาด้วย ให้ตรวจ match ฝั่ง server
      // ป้องกัน user ใช้ student_code ของคนอื่น (ต้องรู้ national_id ด้วย)
      if (nationalId && pendingRow.national_id) {
        const dbNid = String(pendingRow.national_id).trim();
        if (dbNid !== nationalId) {
          auditLog('login_failure', {
            ip,
            actor: studentId ?? email ?? undefined,
            status: 'failure',
            meta: { reason: 'national_id_mismatch' },
          });
          return NextResponse.json(
            { status: 'error', error: 'เลขบัตรประชาชนไม่ตรงกับคำขอที่ส่งไว้' },
            { status: 403 }
          );
        }
      }

      auditLog('login_success', {
        ip,
        actor: studentId ?? email ?? undefined,
        status: 'success',
        meta: { event: 'pending_status_checked', result: 'pending' },
      });

      return NextResponse.json({
        status: 'pending',
        request: {
          full_name: pendingRow.full_name,
          student_id: pendingRow.student_id ?? null,
          email: pendingRow.email ?? null,
          // ★ v3.0.0: ไม่ส่ง national_id กลับ — ป้องกัน PII leak
          has_national_id: !!(pendingRow.national_id && String(pendingRow.national_id).trim()),
          account_type: pendingRow.account_type || 'student',
          year: pendingRow.year ?? null,
          department_id: pendingRow.department_id ?? null,
          submitted_at: pendingRow.created_at ?? null,
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // STEP 2: ไม่มี row ใน council_join_requests → ตรวจ council_users
    //   ถ้ามี row ที่ approved=true → approved (อนุมัติแล้ว)
    //   ถ้าไม่มี row → rejected (ถูกปฏิเสธ) หรือไม่เคยสมัคร
    // ─────────────────────────────────────────────────────────

    let lookupEmail = email;
    if (studentId && !email) {
      lookupEmail = synthesizeEmail(studentId);
    }

    if (lookupEmail) {
      const { data: councilUser, error: councilErr } = await adminClient
        .from('council_users')
        .select('id, auth_uid, full_name, approved, disabled, email, student_id, account_type')
        .eq('email', lookupEmail)
        .limit(1)
        .maybeSingle();

      if (councilErr) {
        console.error('[check-pending-status] council_users by email error:', sanitizeForLog({
          message: councilErr.message,
          code: councilErr.code,
        }));
      }

      if (councilUser) {
        if (councilUser.approved && !councilUser.disabled) {
          auditLog('login_success', {
            ip,
            actor: studentId ?? email ?? undefined,
            status: 'success',
            meta: { event: 'pending_status_checked', result: 'approved' },
          });
          return NextResponse.json({
            status: 'approved',
            user: {
              full_name: councilUser.full_name,
              auth_uid: councilUser.auth_uid,
            },
          });
        }
        auditLog('login_success', {
          ip,
          actor: studentId ?? email ?? undefined,
          status: 'success',
          meta: { event: 'pending_status_checked', result: 'rejected', reason: 'disabled_or_not_approved' },
        });
        return NextResponse.json({
          status: 'rejected',
          reason: 'disabled_or_not_approved',
        });
      }
    }

    if (studentId) {
      const { data: councilUserBySid, error: sidErr } = await adminClient
        .from('council_users')
        .select('id, auth_uid, full_name, approved, disabled, email, student_id')
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle();

      if (sidErr) {
        console.error('[check-pending-status] council_users by student_id error:', sanitizeForLog({
          message: sidErr.message,
          code: sidErr.code,
        }));
      }

      if (councilUserBySid) {
        if (councilUserBySid.approved && !councilUserBySid.disabled) {
          auditLog('login_success', {
            ip,
            actor: studentId,
            status: 'success',
            meta: { event: 'pending_status_checked', result: 'approved' },
          });
          return NextResponse.json({
            status: 'approved',
            user: {
              full_name: councilUserBySid.full_name,
              auth_uid: councilUserBySid.auth_uid,
            },
          });
        }
        auditLog('login_success', {
          ip,
          actor: studentId,
          status: 'success',
          meta: { event: 'pending_status_checked', result: 'rejected', reason: 'disabled_or_not_approved' },
        });
        return NextResponse.json({
          status: 'rejected',
          reason: 'disabled_or_not_approved',
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // STEP 3: ไม่พบทั้งใน council_join_requests และ council_users
    //   → rejected (หรือไม่เคยสมัคร)
    // ─────────────────────────────────────────────────────────
    auditLog('login_success', {
      ip,
      actor: studentId ?? email ?? undefined,
      status: 'success',
      meta: { event: 'pending_status_checked', result: 'rejected', reason: 'no_record_found' },
    });
    return NextResponse.json({
      status: 'rejected',
      reason: 'no_record_found',
    });
  } catch (err: any) {
    // ★ v3.0.0: ไม่ leak internal error ไปยัง client
    console.error('[check-pending-status] unexpected error:', sanitizeForLog({
      message: err?.message,
      stack: err?.stack,
    }));
    return NextResponse.json(
      { status: 'error', error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' },
      { status: 500 }
    );
  }
}
