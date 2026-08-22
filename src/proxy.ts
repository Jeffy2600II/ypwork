import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  checkRateLimit,
  getClientIp,
  applySecurityHeaders,
  RATE_LIMITS,
  auditLog,
} from '@/lib/security';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/api/request-context';
import { logger } from '@/lib/observability/logger';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Proxy / Middleware (Round 24)
// ═══════════════════════════════════════════════════════════════
// Centralized middleware pipeline:
//   1. Generate/inject Request ID for traceability
//   2. Apply security headers to every response
//   3. Rate-limit API routes (different limits per category)
//   4. Refresh Supabase session + protect routes
//   5. Prevent HTML page caching (force fresh on navigation)
//
// Architecture principle (Round 24):
//   The proxy is a BOUNDARY — it handles cross-cutting concerns.
//   It does NOT contain business logic.
//   Business logic lives in route handlers and repositories.
// ═══════════════════════════════════════════════════════════════

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ─────────────────────────────────────────────────────────
  // 1. Request ID — inject for traceability
  // ─────────────────────────────────────────────────────────
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) || generateRequestId();
  request.headers.set(REQUEST_ID_HEADER, requestId);

  // ─────────────────────────────────────────────────────────
  // 2. Rate limit — แยกตามประเภท endpoint
  // ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const rlKey = `${ip}:${pathname}`;
    let rlOpts;
    let auditEvent: 'api_rate_limited' | 'login_rate_limited' | 'register_rate_limited' | null = null;

    if (pathname === '/api/auth/check-pending-status') {
      rlOpts = RATE_LIMITS.CHECK_PENDING_STATUS;
    } else if (pathname.includes('/login') || pathname.includes('/auth/')) {
      rlOpts = RATE_LIMITS.LOGIN_ATTEMPT;
      auditEvent = 'login_rate_limited';
    } else if (pathname.includes('/register')) {
      rlOpts = RATE_LIMITS.REGISTER_SUBMIT;
      auditEvent = 'register_rate_limited';
    } else if (pathname.startsWith('/api/admin/')) {
      rlOpts = RATE_LIMITS.ADMIN_API;
    } else {
      rlOpts = RATE_LIMITS.GENERIC_API;
    }

    const rl = checkRateLimit(rlKey, rlOpts);
    if (!rl.allowed) {
      if (auditEvent) {
        auditLog(auditEvent, { ip, status: 'blocked' });
      } else {
        auditLog('api_rate_limited', { ip, status: 'blocked', meta: { path: pathname } });
      }

      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
          },
          meta: {
            requestId,
            retryAfter: rl.retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: {
            'X-Request-Id': requestId,
            'Retry-After': String(rl.retryAfterSeconds ?? 60),
            'X-RateLimit-Limit': String(rlOpts.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
          },
        }
      );
      applySecurityHeaders(response);
      return response;
    }
  }

  // ─────────────────────────────────────────────────────────
  // 3. Supabase session refresh + route protection
  // ─────────────────────────────────────────────────────────
  const supabaseResponse = await updateSession(request);

  // ─────────────────────────────────────────────────────────
  // 4. Apply security headers to ALL responses
  // ─────────────────────────────────────────────────────────
  applySecurityHeaders(supabaseResponse);

  // ─────────────────────────────────────────────────────────
  // 5. Inject Request ID into response
  // ─────────────────────────────────────────────────────────
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId);

  // ─────────────────────────────────────────────────────────
  // 6. กันหน้าเว็บ (เอกสาร HTML) ถูกแคช
  //    ที่ CDN/reverse proxy หรือฝั่ง browser เอง
  //    ข้อมูล (API) ยังแคชสั้นๆ ตามเดิมเพื่อความเร็ว
  //    แต่ตัวหน้าเว็บเองจะขอสดใหม่จาก server ทุกครั้ง
  // ─────────────────────────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    supabaseResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest)$).*)',
  ],
};
