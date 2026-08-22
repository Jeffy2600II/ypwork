// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/auth/logout (Round 24)
// ═══════════════════════════════════════════════════════════════
// Server-side logout — uses gateway pattern for standardized responses.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';
import { withApiHandler, apiError, ErrorCode, getRequestId } from '@/lib/api';
import { apiCacheHeaders } from '@/lib/api/cache';
import type { NextRequest } from 'next/server';

export const POST = withApiHandler(async (req: NextRequest) => {
  const requestId = getRequestId(req);
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[/api/auth/logout] signOut error:', error.message);
    }

    const headers: Record<string, string> = {
      'X-Request-Id': requestId,
      ...apiCacheHeaders.noStore(),
    };

    const response = NextResponse.json(
      { success: true, message: 'ออกจากระบบสำเร็จ', meta: { requestId } },
      { status: 200, headers }
    );

    // Clear all auth-related cookies (server can clear httpOnly)
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
      const name = cookie.name;
      if (
        name.startsWith('sb-') ||
        name === 'yp_csrf_token' ||
        name.includes('supabase') ||
        name.includes('auth-token')
      ) {
        response.cookies.set(name, '', {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 0,
        });
      }
    }

    auditLog('logout', { status: 'success' });
    return response;
  } catch (err) {
    console.error('[/api/auth/logout] exception:', err);
    auditLog('logout', { status: 'failure', meta: { error: String(err).slice(0, 200) } });

    // Even on error, try to clear cookies
    const headers: Record<string, string> = {
      'X-Request-Id': requestId,
      ...apiCacheHeaders.noStore(),
    };

    const response = NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด แต่จะพยายามออกจากระบบอยู่ดี', errorCode: ErrorCode.INTERNAL_ERROR, meta: { requestId } },
      { status: 200, headers }
    );

    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      for (const cookie of allCookies) {
        if (
          cookie.name.startsWith('sb-') ||
          cookie.name === 'yp_csrf_token' ||
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth-token')
        ) {
          response.cookies.set(cookie.name, '', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 0,
          });
        }
      }
    } catch {
      // ignore
    }

    return response;
  }
});
