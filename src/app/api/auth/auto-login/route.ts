// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/auth/auto-login (Round 24)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { withApiHandler, apiSuccess, apiError, ErrorCode } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';

export const POST = withApiHandler(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const email = body?.email;
    const password = body?.password;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return apiError(req, ErrorCode.MISSING_PARAM, 'Missing email', { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return apiError(req, ErrorCode.MISSING_PARAM, 'Missing password', { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.user) {
      auditLog('login_failure', {
        actor: email.slice(0, 50),
        status: 'failure',
        meta: { reason: 'auto_login_failed', error: error?.message?.slice(0, 100) },
      });
      return apiError(req, ErrorCode.AUTH_INVALID_CREDENTIALS, 'เข้าสู่ระบบไม่สำเร็จ — อาจยังไม่ได้รับการอนุมัติ', { status: 401 });
    }

    auditLog('login_success', {
      actor: data.user.id,
      status: 'success',
      meta: { method: 'auto_login' },
    });

    return apiSuccess(req, { uid: data.user.id }, { cache: 'noStore' });
  } catch (err) {
    console.error('[/api/auth/auto-login] exception:', err);
    auditLog('login_failure', { status: 'failure', meta: { reason: 'exception', error: String(err).slice(0, 100) } });
    return apiError(req, ErrorCode.INTERNAL_ERROR, 'เกิดข้อผิดพลาดภายในระบบ', { status: 500 });
  }
});
