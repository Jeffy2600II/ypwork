import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client
 * ใช้ใน Server Components, Route Handlers, Server Actions
 *
 * v1.8.3: รองรับทั้ง NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
 * และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel × Supabase integration)
 */
function getSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is not set. Please connect Supabase × Vercel integration or set the env var manually.'
    );
  }
  return url;
}

function getSupabaseAnonKey(): string {
  // Priority: server-side vars > NEXT_PUBLIC_ vars
  // Priority: PUBLISHABLE_KEY (Vercel integration) > ANON_KEY (legacy)
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Supabase anon/publishable key is not set. Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel integration) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy).'
    );
  }
  return key;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ถูกเรียกจาก Server Component — ไม่สามารถ set cookies ได้
          // สามารถ ignore ได้เพราะ middleware จะจัดการ refresh
        }
      },
    },
  });
}
