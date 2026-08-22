import { withPublic, apiSuccess } from '@/lib/api';
import { validationError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';

export const POST = withPublic(async (request, requestId) => {
  const body = await request.json();
  const email = body?.email;
  const password = body?.password;

  if (!email || typeof email !== 'string' || !email.trim()) throw validationError('Missing email');
  if (!password || typeof password !== 'string') throw validationError('Missing password');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data?.user) {
    auditLog('login_failure', { actor: email.slice(0, 50), status: 'failure', requestId, meta: { reason: 'auto_login_failed', error: error?.message?.slice(0, 100) } });
    throw validationError('เข้าสู่ระบบไม่สำเร็จ — อาจยังไม่ได้รับการอนุมัติ');
  }

  auditLog('login_success', { actor: data.user.id, status: 'success', requestId, meta: { method: 'auto_login' } });
  return apiSuccess({ uid: data.user.id }, requestId);
});
