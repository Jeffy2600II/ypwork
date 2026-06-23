// Path:    src/lib/supabase/client.ts
// Purpose: Browser-only Supabase singleton.
//          Shares same Supabase project + auth with yplabs.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CLIENT_SUPABASE_URL, CLIENT_SUPABASE_ANON_KEY } from '@/lib/env';

let _client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error(
      '[supabase/client] getBrowserSupabase() called during SSR. ' +
      'Use the server client for server-side access.'
    );
  }
  if (_client) return _client;

  if (!CLIENT_SUPABASE_URL || !CLIENT_SUPABASE_ANON_KEY) {
    throw new Error(
      '[supabase/client] Missing browser Supabase env vars. ' +
      'Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  _client = createClient(CLIENT_SUPABASE_URL, CLIENT_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  });

  return _client;
}
