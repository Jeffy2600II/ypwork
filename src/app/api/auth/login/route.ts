import { withPublic, apiSuccess } from '@/lib/api';
import { validationError, internalError } from '@/lib/api/errors';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';
import { getUserColor } from '@/lib/utils/user-color';
import type { SessionUser } from '@/lib/types';

export const POST = withPublic(async (request, requestId) => {
  const body = await request.json();
  const email = body?.email;
  const password = body?.password;
  const national_id = body?.national_id;

  if (!email || typeof email !== 'string' || !email.trim()) throw validationError('Missing email');
  if (!password || typeof password !== 'string') throw validationError('Missing password');

  const supabase = await createClient();
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

  if (signInErr || !signInData?.user) {
    auditLog('login_failure', { actor: email.slice(0, 50), status: 'failure', requestId, meta: { reason: 'sign_in_failed', error: signInErr?.message?.slice(0, 100) } });
    throw validationError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }

  const authUid = signInData.user.id;
  const adminClient = createAdminClient();
  const { data: profile, error: profileErr } = await adminClient.from('council_users').select('*').eq('auth_uid', authUid).limit(1).maybeSingle();

  if (profileErr) { await supabase.auth.signOut(); auditLog('login_failure', { actor: authUid, status: 'failure', requestId, meta: { reason: 'profile_query_error' } }); throw internalError('เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี'); }
  if (!profile) { await supabase.auth.signOut(); auditLog('login_failure', { actor: authUid, status: 'failure', requestId, meta: { reason: 'no_profile' } }); throw validationError('ไม่พบข้อมูลบัญชีในระบบ — อาจยังไม่ได้รับการอนุมัติ'); }
  if (!profile.approved) { await supabase.auth.signOut(); auditLog('login_failure', { actor: authUid, status: 'failure', requestId, meta: { reason: 'not_approved' } }); throw validationError('บัญชียังไม่ได้รับการอนุมัติ'); }
  if (profile.disabled) { await supabase.auth.signOut(); auditLog('login_failure', { actor: authUid, status: 'failure', requestId, meta: { reason: 'disabled' } }); throw validationError('บัญชีถูกปิดใช้งาน'); }

  if (national_id && typeof national_id === 'string') {
    const cleanNational = national_id.replace(/\D/g, '');
    if (profile.national_id !== undefined && profile.national_id !== null && profile.national_id !== '') {
      if (String(profile.national_id).trim() !== cleanNational.trim()) { await supabase.auth.signOut(); auditLog('login_failure', { actor: authUid, status: 'failure', requestId, meta: { reason: 'national_id_mismatch' } }); throw validationError('เลขบัตรประชาชนไม่ตรงกับข้อมูลในระบบ'); }
    }
  }

  const user: SessionUser = {
    auth_uid: profile.auth_uid, full_name: profile.full_name,
    student_id: profile.student_id || null, national_id: profile.national_id || null,
    year: profile.year || null, role: profile.role || 'member',
    account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
    email: profile.email || '', department_id: profile.department_id || null,
    color: getUserColor(profile.auth_uid),
  };

  auditLog('login_success', { actor: authUid, status: 'success', requestId, meta: { method: 'server_login' } });
  return apiSuccess({ user }, requestId);
});
