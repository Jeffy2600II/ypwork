import { withPublic, apiSuccess } from '@/lib/api';
import { validationError, internalError, forbidden } from '@/lib/api/errors';
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

export const GET = withPublic(async (request, requestId) => {
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const rawStudentId = url.searchParams.get('student_id');
  const rawEmail = url.searchParams.get('email');
  const rawNationalId = url.searchParams.get('national_id');

  if (!rawStudentId && !rawEmail) throw validationError('ต้องระบุ student_id หรือ email');

  let studentId: string | null = null;
  let email: string | null = null;
  let nationalId: string | null = null;

  if (rawStudentId) {
    if (looksLikeSqlInjection(rawStudentId)) {
      auditLog('suspicious_input', { ip, status: 'blocked', meta: { field: 'student_id', reason: 'sql_injection_pattern' } });
      throw validationError('input ไม่ถูกต้อง');
    }
    const sidValid = validateStudentCodeInput(rawStudentId);
    if (!sidValid.valid) throw validationError(sidValid.error);
    studentId = sidValid.value!;
  } else if (rawEmail) {
    if (looksLikeSqlInjection(rawEmail)) {
      auditLog('suspicious_input', { ip, status: 'blocked', meta: { field: 'email', reason: 'sql_injection_pattern' } });
      throw validationError('input ไม่ถูกต้อง');
    }
    if (rawEmail.length > 254) throw validationError('input ยาวเกินไป');
    const emailValid = validateEmailInput(rawEmail);
    if (!emailValid.valid) throw validationError(emailValid.error);
    email = emailValid.value!;
  }

  if (rawNationalId) {
    const nidValid = (await import('@/lib/security/validation')).validateNationalIdInput(rawNationalId);
    if (!nidValid.valid) throw validationError(nidValid.error);
    nationalId = nidValid.value!;
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    auditLog('admin_action_blocked', { ip, status: 'failure', meta: { reason: 'service_role_key_missing', path: 'check-pending-status' } });
    throw internalError('ระบบยังไม่พร้อม — กรุณาติดต่อผู้ดูแล');
  }

  // Step 1: Check council_join_requests
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
    console.error('[check-pending-status] DB error:', sanitizeForLog({ message: pendingErr.message, code: pendingErr.code, studentId, email }));
    throw internalError('เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
  }

  if (pendingRow) {
    if (nationalId && pendingRow.national_id) {
      const dbNid = String(pendingRow.national_id).trim();
      if (dbNid !== nationalId) {
        auditLog('login_failure', { ip, actor: studentId ?? email ?? undefined, status: 'failure', meta: { reason: 'national_id_mismatch' } });
        throw forbidden('เลขบัตรประชาชนไม่ตรงกับคำขอที่ส่งไว้');
      }
    }

    auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'pending' } });

    return apiSuccess({
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
    }, requestId);
  }

  // Step 2: Not in join_requests → check council_users
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
      console.error('[check-pending-status] council_users error:', sanitizeForLog({ message: councilErr.message, code: councilErr.code }));
    }

    if (councilUser) {
      if (councilUser.approved && !councilUser.disabled) {
        auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'approved' } });
        return apiSuccess({
          status: 'approved',
          user: { full_name: councilUser.full_name, auth_uid: councilUser.auth_uid },
        }, requestId);
      }
      auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'disabled' } });
      return apiSuccess({ status: 'rejected' }, requestId);
    }

    // Also try by auth_uid if student_id provided
    if (studentId) {
      const { data: byStudentId } = await adminClient
        .from('council_users')
        .select('id, auth_uid, full_name, approved, disabled, email, student_id')
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle();

      if (byStudentId) {
        if (byStudentId.approved && !byStudentId.disabled) {
          auditLog('login_success', { ip, actor: studentId, status: 'success', meta: { event: 'pending_status_checked', result: 'approved_by_student_id' } });
          return apiSuccess({
            status: 'approved',
            user: { full_name: byStudentId.full_name, auth_uid: byStudentId.auth_uid },
          }, requestId);
        }
      }
    }
  }

  // Step 3: Not found anywhere → rejected
  auditLog('login_success', { ip, actor: studentId ?? email ?? undefined, status: 'success', meta: { event: 'pending_status_checked', result: 'rejected' } });
  return apiSuccess({ status: 'rejected' }, requestId);
});
