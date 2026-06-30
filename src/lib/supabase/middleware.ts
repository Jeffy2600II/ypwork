import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: refresh Supabase auth session + protect routes
 * ทำงานทุก request — รีเฟรช token ถ้าหมดอายุ + redirect ถ้าไม่ได้ login
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: ห้าม run code ระหว่าง createServerClient กับ supabase.auth.getUser()
  // มิฉะนั้นจะมีโอกาสที่ user ถูก sign out โดยไม่ตั้งใจ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isApiRoute = pathname.startsWith('/api');

  // ถ้า login แล้วและพยายามเข้า /login หรือ /register → redirect ไป /today
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/today';
    return NextResponse.redirect(url);
  }

  // ถ้ายังไม่ได้ login และพยายามเข้า protected route (ไม่ใช่ /login, /register, /api) → redirect ไป /login
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
