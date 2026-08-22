import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  checkRateLimit,
  getClientIp,
  applySecurityHeaders,
  RATE_LIMITS,
  auditLog,
} from '@/lib/security';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/observability/request-id';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Proxy (Round 22)
// ═══════════════════════════════════════════════════════════════
// Pipeline:
//   0. Generate request ID (end-to-end tracing)
//   1. Rate-limit API routes (different limits for different categories)
//   2. Refresh Supabase session + protect routes
//   3. Apply security headers to every response
//   4. Cache-Control for HTML pages
//
// Round 22: Added request ID generation at the start of the pipeline.
// The ID is set on the request header (downstream routes can read it via
// getRequestId()) and on the response header (clients can correlate).
// ═══════════════════════════════════════════════════════════════

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ─────────────────────────────────────────────────────────
  // 0. Generate request ID for end-to-end tracing
  // ─────────────────────────────────────────────────────────
  const requestId = request.headers.get(REQUEST_ID_HEADER) || generateRequestId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  // ─────────────────────────────────────────────────────────
  // 1. Rate limit — แยกตามประเภท endpoint
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
        auditLog(auditEvent, { ip, status: 'blocked', requestId });
      } else {
        auditLog('api_rate_limited', { ip, status: 'blocked', meta: { path: pathname }, requestId });
      }

      const response = NextResponse.json(
        {
          success: false,
          error: { code: 'RATE_LIMITED', message: 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่' },
          requestId,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSeconds ?? 60),
            'X-RateLimit-Limit': String(rlOpts.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
            [REQUEST_ID_HEADER]: requestId,
          },
        }
      );
      applySecurityHeaders(response);
      return response;
    }
  }

  // ─────────────────────────────────────────────────────────
  // 2. Supabase session refresh + route protection
  //    (pass modified request with request ID header)
  // ─────────────────────────────────────────────────────────
  const supabaseResponse = await updateSession(
    new NextRequest(request.url, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: request.redirect,
      // @ts-ignore — NextRequest constructor typing
      duplex: 'half',
    })
  );

  // ─────────────────────────────────────────────────────────
  // 3. Apply security headers + request ID to ALL responses
  // ─────────────────────────────────────────────────────────
  applySecurityHeaders(supabaseResponse);
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId);

  // ─────────────────────────────────────────────────────────
  // 4. Cache-Control for HTML pages (not API routes)
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest)$).*)',
  ],
};
