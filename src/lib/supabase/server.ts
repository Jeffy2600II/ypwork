// Path:    src/lib/supabase/server.ts
// Purpose: Server-only Supabase admin client (uses service-role key).
//          NEVER expose to browser.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  if (!SERVER_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[supabase/server] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  _admin = createClient(SERVER_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return _admin;
}
