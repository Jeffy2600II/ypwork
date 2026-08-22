// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/auth/login (Round 24)
// ═══════════════════════════════════════════════════════════════
// Server-side login endpoint — uses gateway pattern for standardized
// responses and request ID tracking.
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  withApiHandler,
  apiSuccess,
  apiError,
  ErrorCode,
} from '@/lib/api';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';
import { getUserColor } from '@/lib/utils/user-color';
import type { SessionUser } from '@/lib/types';

export const POST = withApiHandler(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const email = body?.email;
    const password = body?.password;
    const national_id = body?.national_id;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return apiError(req, ErrorCode.MISSING_PARAM, 'Missing email', { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return apiError(req, ErrorCode.MISSING_PARAM, 'Missing password', { status: 400 });
    }

    // 1. signInWithPassword ฝั่ง server
    const supabase = await createClient();
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInErr || !signInData?.user) {
      auditLog('login_failure', {
        actor: email.slice(0, 50),
        status: 'failure',
        meta: { reason: 'sign_in_failed', error: signInErr?.message?.slice(0, 100) },
      });
      return apiError(req, ErrorCode.AUTH_INVALID_CREDENTIALS, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', { status: 401 });
    }

    const authUid = signInData.user.id;

    // 2. Query council_users via adminClient (bypass RLS)
    const adminClient = createAdminClient();
    const { data: profile, error: profileErr } = await adminClient
      .from('council_users')
      .select('*')
      .eq('auth_uid', authUid)
      .limit(1)
      .maybeSingle();

    if (profileErr) {
      await supabase.auth.signOut();
      auditLog('login_failure', { actor: authUid, status: 'failure', meta: { reason: 'profile_query_error' } });
      return apiError(req, ErrorCode.INTERNAL_ERROR, 'เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี', { status: 500 });
    }

    if (!profile) {
      await supabase.auth.signOut();
      auditLog('login_failure', { actor: authUid, status: 'failure', meta: { reason: 'no_profile' } });
      return apiError(req, ErrorCode.AUTH_FORBIDDEN, 'ไม่พบข้อมูลบัญชีในระบบ — อาจยังไม่ได้รับการอนุมัติ', { status: 403 });
    }

    // 3. Check approved / disabled
    if (!profile.approved) {
      await supabase.auth.signOut();
      auditLog('login_failure', { actor: authUid, status: 'failure', meta: { reason: 'not_approved' } });
      return apiError(req, ErrorCode.AUTH_NOT_APPROVED, 'บัญชียังไม่ได้รับการอนุมัติ', { status: 403 });
    }

    if (profile.disabled) {
      await supabase.auth.signOut();
      auditLog('login_failure', { actor: authUid, status: 'failure', meta: { reason: 'disabled' } });
      return apiError(req, ErrorCode.AUTH_DISABLED, 'บัญชีถูกปิดใช้งาน', { status: 403 });
    }

    // 4. Check national_id for students
    if (national_id && typeof national_id === 'string') {
      const cleanNational = national_id.replace(/\D/g, '');
      if (profile.national_id !== undefined && profile.national_id !== null && profile.national_id !== '') {
        if (String(profile.national_id).trim() !== cleanNational.trim()) {
          await supabase.auth.signOut();
          auditLog('login_failure', { actor: authUid, status: 'failure', meta: { reason: 'national_id_mismatch' } });
          return apiError(req, ErrorCode.AUTH_INVALID_CREDENTIALS, 'เลขบัตรประชาชนไม่ตรงกับข้อมูลในระบบ', { status: 403 });
        }
      }
    }

    // 5. Build SessionUser
    const user: SessionUser = {
      auth_uid: profile.auth_uid,
      full_name: profile.full_name,
      student_id: profile.student_id || null,
      national_id: profile.national_id || null,
      year: profile.year || null,
      role: profile.role || 'member',
      account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
      email: profile.email || '',
      department_id: profile.department_id || null,
      color: getUserColor(profile.auth_uid),
    };

    auditLog('login_success', {
      actor: authUid,
      status: 'success',
      meta: { method: 'server_login' },
    });

    return apiSuccess(req, { user }, { cache: 'noStore' });
  } catch (err) {
    console.error('[/api/auth/login] exception:', err);
    auditLog('login_failure', { status: 'failure', meta: { reason: 'exception', error: String(err).slice(0, 100) } });
    return apiError(req, ErrorCode.INTERNAL_ERROR, 'เกิดข้อผิดพลาดภายในระบบ', { status: 500 });
  }
});
