// ═══════════════════════════════════════════════════════════════
// YP WORK · Logout utility
// ═══════════════════════════════════════════════════════════════
// แยกไว้ต่างหากเพื่อไม่ให้กระทบไฟล์ src/lib/auth/index.ts ที่มีอยู่แล้ว
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sign out จาก Supabase Auth
 * @param supabase Supabase client (browser หรือ server)
 */
export async function logout(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}
