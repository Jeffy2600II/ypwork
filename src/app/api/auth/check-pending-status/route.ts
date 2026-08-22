// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/auth/check-pending-status (Round 24)
// ═══════════════════════════════════════════════════════════════
// Public endpoint — no auth required.
// Uses gateway pattern for request ID tracking and error normalization.
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
import { withApiHandler, getRequestId, apiCacheHeaders } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const requestId = getRequestId(request);

  try {
    const url = new URL(request.url);
    const rawStudentId = url.searchParams.get('student_id');
    const rawEmail = url.searchParams.get('email');
    const rawNationalId = url.searchParams.get('national_id');

    // ── Input validation ──
    if (!rawStudentId && !rawEmail) {
      return NextResponse.json(
        { status: 'error', error: 'ต้องระบุ student_id หรือ email', meta: { requestId } },
        { status: 400 }
      );
    }

    let studentId: string | null = null;
    let email: string | null = null;
    let nationalId: string | null = null;

    if (rawStudentId) {
      if (looksLikeSqlInjection(rawStudentId)) {
        auditLog('suspicious_input', { ip, status: 'blocked', meta: { field: 'student_id', reason: 'sql_injection_pattern' } });
        return NextResponse.json(
          { status: 'error', error: 'input ไม่ถูกต้อง', meta: { requestId } },
          { status: 400 }
        );
      }
      const sidValid = validateStudentCodeInput(rawStudentId);
      if (!sidValid.valid) {
        return NextResponse.json(
          { status: 'error', error: sidValid.error, meta: { requestId } },
          { status: 400 }
        );
      }
      studentId = sidValid.value!;
    } else if (rawEmail) {
      if (looksLikeSqlInjection(rawEmail)) {
        auditLog('suspicious_input', { ip, status: 'blocked', meta: { field: 'email', reason: 'sql_injection_pattern' } });
        return NextResponse.json(
          { status: 'error', error: 'input ไม่ถูกต้อง', meta: { requestId } },
          { status: 400 }
        );
      }
      if (rawEmail.length > 254) {
        return NextResponse.json(
          { status: 'error', error: 'input ยาวเกินไป', meta: { requestId } },
          { status: 400 }
        );
      }
      const emailValid = validateEmailInput(rawEmail);
      if (!emailValid.valid) {
        return NextResponse.json(
          { status: 'error', error: emailValid.error, meta: { requestId } },
          { status: 400 }
        );
      }
      email = emailValid.value!;
    }

    if (rawNationalId) {
      const nidValid = (await import('@/lib/security/validation')).validateNationalIdInput(rawNationalId);
      if (!nidValid.valid) {
        return NextResponse.json(
          { status: 'error', error: nidValid.error, meta: { requestId } },
          { status: 400 }
        );
      }
      nationalId = nidValid.value!;
    }

    // ── Create adminClient (service role) ──
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      auditLog('admin_action_blocked', { ip, status: 'failure', meta: { reason: 'service_role_key_missing', path: 'check-pending-status' } });
      return NextResponse.json(
        { status: 'error', error: 'ระบบยังไม่พร้อม — กรุณาติดต่อผู้ดูแล', meta: { requestId } },
        { status: 500 }
      );
    }

    // ── STEP 1: Check council_join_requests ──
    let requestQuery = adminClient
      .from('council_join_requests')
      .select('id, full_name, student_id, email, national_id, account_type, year, department_id, created_at');

    if (studentId) {
      requestQuery = requestQuery.eq('student_id', studentId);
    } else if (email) {
      requestQuery = requestQuery.eq('email', email);
    }

    const { data: pendingRow, error: pendingErr } = await requestQuery.limit(1).maybeSingle();

    if (pendingErr) {
      console.error('[check-pending-status] DB error:', sanitizeForLog({ message: pendingErr.message, code: pendingErr.code }));
      return NextResponse.json(
        { status: 'error', error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ', meta: { requestId } },
        { status: 500 }
      );
    }

    if (pendingRow) {
      // Server-side national_id verification
      if (nationalId && pendingRow.national_id) {
        const dbNid = String(pendingRow.national_id).trim();
        if (dbNid !== nationalId) {
          auditLog('login_failure', { ip, actor: studentId ?? email ?? undefined, status: 'failure', meta: { reason: 'national_id_mismatch' } });
          return NextResponse.json(
            { status: 'error', error: 'เลขบัตรประชาชนไม่ตรงกับคำขอที่ส่งไว้', meta: { requestId } },
            { status: 403 }
          );
        }
      }

      auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'pending' } });

      return NextResponse.json({
        status: 'pending',
        request: {
          full_name: pendingRow.full_name,
          student_id: pendingRow.student_id ?? null,
          email: pendingRow.email ?? null,
          has_national_id: !!(pendingRow.national_id && String(pendingRow.national_id).trim()),
          account_type: pendingRow.account_type || 'student',
          year: pendingRow.year ?? null,
          department_id: pendingRow.department_id ?? null,
          submitted_at: pendingRow.created_at ?? null,
        },
        meta: { requestId },
      });
    }

    // ── STEP 2: Check council_users ──
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
        console.error('[check-pending-status] council_users error:', sanitizeForLog({ message: councilErr.message }));
      }

      if (councilUser) {
        if (councilUser.approved && !councilUser.disabled) {
          auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'approved' } });
          return NextResponse.json({
            status: 'approved',
            user: { full_name: councilUser.full_name, auth_uid: councilUser.auth_uid },
            meta: { requestId },
          });
        }
        auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'not_approved_or_disabled' } });
        return NextResponse.json({
          status: 'rejected',
          meta: { requestId },
        });
      }
    }

    // Not found in either table → rejected or never registered
    auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'not_found' } });
    return NextResponse.json({
      status: 'rejected',
      meta: { requestId },
    });
  } catch (err) {
    console.error('[check-pending-status] exception:', err);
    auditLog('login_failure', { ip, status: 'failure', meta: { reason: 'exception', error: String(err).slice(0, 100) } });
    return NextResponse.json(
      { status: 'error', error: 'เกิดข้อผิดพลาดภายในระบบ', meta: { requestId } },
      { status: 500 }
    );
  }
});
