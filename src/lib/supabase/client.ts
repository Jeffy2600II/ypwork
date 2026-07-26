import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client
 * ใช้ใน Client Components เท่านั้น ('use client')
 *
 * v1.8.3: รองรับทั้ง NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
 * และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel × Supabase integration)
 * เพราะ Vercel integration ใช้ชื่อ PUBLISHABLE_KEY ไม่ใช่ ANON_KEY
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Please connect Supabase × Vercel integration or set the env var manually.'
    );
  }
  return url;
}

function getSupabaseAnonKey(): string {
  // Priority: PUBLISHABLE_KEY (Vercel integration) > ANON_KEY (legacy)
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Supabase anon/publishable key is not set. Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel integration) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy).'
    );
  }
  return key;
}

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
