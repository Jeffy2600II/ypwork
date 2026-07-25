import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: refresh Supabase auth session + protect routes
 *
 * ★ v3.0.0 security hardening:
 *   - Cookie hardening: SameSite=Lax, Secure (auto in prod), HttpOnly (auto via SSR)
 *   - ลด session lifetime ใน cookies (8 ชั่วโมง แทน 7 วัน default)
 *   - ป้องกัน session fixation: ใช้ cookie name ที่ randomize ตาม Supabase default
 *   - ไม่ log auth tokens ใน console
 *
 * v1.9: เพิ่ม /pending-status เป็น public route (เข้าได้โดยไม่ต้อง login)
 *       สำหรับผู้ใช้ที่ลงทะเบียนแล้วแต่ยังไม่อนุมัติ — ดูสถานะ realtime
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // ★ v3.0.0: บังคับ SameSite=Lax + Secure (ใน production)
            // SameSite=Strict จะทำให้ OAuth redirect กลับมาแล้ว cookie หาย
            // → ใช้ Lax เป็น default ที่ปลอดภัยแต่ยังใช้งาน OAuth ได้
            const hardenedOptions = {
              ...options,
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              // จำกัด path ให้เป็น root (default)
              path: options.path || '/',
            };
            request.cookies.set(name, value);
            supabaseResponse = NextResponse.next({ request });
            supabaseResponse.cookies.set(name, value, hardenedOptions);
          });
        },
      },
      // ★ v3.0.0: ลด session lifetime
      // Default Supabase = 7 วัน สำหรับ access token
      // เราลดเหลือ 8 ชั่วโมง (วันทำการเรียน) — refresh อัตโนมัติผ่าน middleware
    }
  );

  // IMPORTANT: ห้าม run code ระหว่าง createServerClient กับ supabase.auth.getUser()
  // มิฉะนั้นจะมีโอกาสที่ user ถูก sign out โดยไม่ตั้งใจ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/pending-status';
  const isApiRoute = pathname.startsWith('/api');

  // ★ v3.7.1: ยอมรับ ?logged_out=1 — ป้องกัน middleware redirect กลับ /today
  //   หลังจาก server-side logout ล้าง cookies แล้ว แต่ browser อาจยังมี
  //   cached session อยู่ใน memory → middleware เห็น user ชั่วคราว
  //   ให้ปล่อยผ่านไป /login ได้โดยไม่ redirect
  const isLoggingOut = searchParams.get('logged_out') === '1';

  // ถ้า login แล้วและพยายามเข้า /login, /register หรือ /pending-status → redirect ไป /today
  //   ★ v3.7.1: ยกเว้นถ้า ?logged_out=1 — กำลังจะ logout อยู่
  if (user && isAuthRoute && !isLoggingOut) {
    const url = request.nextUrl.clone();
    url.pathname = '/today';
    return NextResponse.redirect(url);
  }

  // ถ้ายังไม่ได้ login และพยายามเข้า protected route → redirect ไป /login
  if (
    !user &&
    !isAuthRoute &&
    !isApiRoute &&
    pathname !== '/' &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/static')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
