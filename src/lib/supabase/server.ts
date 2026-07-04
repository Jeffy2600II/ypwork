import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client
 * ใช้ใน Server Components, Route Handlers, Server Actions
 *
 * v1.8.3: รองรับทั้ง NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
 * และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel × Supabase integration)
 *
 * v1.9.1: เพิ่ม createAdminClient() — service-role client สำหรับ admin operations
 *         (ใช้ใน API routes ที่ต้องการ bypass RLS เช่น approve/reject คำขอสมัคร)
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

// ═══════════════════════════════════════════════════════════════
// v1.9.1: Service-role admin client — bypasses RLS
// ═══════════════════════════════════════════════════════════════
// ใช้สำหรับ admin operations ที่ต้องการเข้าถึง/เขียนข้อมูลที่ RLS บล็อก
// เช่น อนุมัติ/ปฏิเสธคำขอสมัคร, จัดการ users ข้ามฝ่าย
//
// ⚠️ ใช้เฉพาะใน server-side (API routes, Server Actions) เท่านั้น
//    ห้ามส่งไปยัง client เด็ดขาด — service role key มีสิทธิ์เต็ม
//
// ต้องมีการตรวจสอบสิทธิ์ admin ก่อนเรียกใช้ (ดู lib/auth/api-guard.ts)
// ═══════════════════════════════════════════════════════════════

function getServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations (approve/reject pending requests). Set it in your .env file or Vercel environment variables.'
    );
  }
  return key;
}

export function createAdminClient() {
  return createSupabaseClient(
    getSupabaseUrl(),
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
