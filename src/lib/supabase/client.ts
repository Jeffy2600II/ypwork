import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client
 * ใช้ใน Client Components เท่านั้น ('use client')
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
