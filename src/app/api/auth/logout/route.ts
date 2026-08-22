import { withPublic, apiSuccess } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';
import { clearAllYPWorkCache } from '@/lib/utils/session-cache';

export const POST = withPublic(async (_request, requestId) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user) auditLog('logout', { actor: user.id, status: 'success', requestId });
  return apiSuccess(null, requestId, { cache: 'noStore' });
});
