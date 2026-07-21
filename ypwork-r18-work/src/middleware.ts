import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  checkRateLimit,
  getClientIp,
  applySecurityHeaders,
  RATE_LIMITS,
  auditLog,
} from '@/lib/security';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Middleware (v3.4.1)
// ═══════════════════════════════════════════════════════════════
// Pipeline:
//   1. Apply security headers to every response
//   2. Rate-limit API routes (different limits for different categories)
//   3. Refresh Supabase session + protect routes
//
// ★ v3.4.1 changes (hotfix):
//   - REMOVED CSRF token validation จาก middleware
//     เหตุผล: SameSite=Lax cookies (ที่ Supabase auth ใช้อยู่แล้ว)
//     ป้องกัน CSRF ได้เทียบเท่าใน browser ที่ทันสมัย (>97% ของตลาด)
//     การเพิ่ม CSRF token ทำให้ต้อง update ทุกที่ที่มี mutation call
//     และมี edge cases เยอะ (logout, expiration, retry) → ใช้งานยาก
//   - เก็บ CSRF infrastructure ไว้ (csrfFetch, /api/auth/csrf, validateCsrfToken)
//     สำหรับ opt-in use ในอนาคตถ้าต้องการ enforce บนบาง route
//   - เก็บ security headers อื่น ๆ ทั้งหมด (CSP, HSTS, COOP, CORP, Permissions-Policy)
//     เพราะสิ่งเหล่านี้ป้องกัน "การดักฟังข้อมูล" ตามที่ user ต้องการ
//
// ★ v3.4.0 changes (ก่อนหน้า):
//   - Add security headers to ALL responses
//   - Add per-route rate limiting
//   - Add audit log on rate-limit hits
//   - ลด unsafe-eval ออกจาก CSP
//   - เพิ่ม COEP + CORP same-site
// ═══════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

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
        auditLog(auditEvent, { ip, status: 'blocked' });
      } else {
        auditLog('api_rate_limited', { ip, status: 'blocked', meta: { path: pathname } });
      }

      const response = NextResponse.json(
        {
          status: 'error',
          error: 'คุณลงทะเบียนบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
          retry_after: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
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

    // ★ v3.4.1: CSRF validation REMOVED — SameSite=Lax cookies ป้องกัน CSRF ได้เพียงพอ
    // ถ้าต้องการเพิ่ม CSRF validation บน route เฉพาะ ให้ใช้ validateCsrfToken() ใน route handler
  }

  // ─────────────────────────────────────────────────────────
  // 2. Supabase session refresh + route protection
  // ─────────────────────────────────────────────────────────
  const supabaseResponse = await updateSession(request);

  // ─────────────────────────────────────────────────────────
  // 3. Apply security headers to ALL responses
  // ─────────────────────────────────────────────────────────
  applySecurityHeaders(supabaseResponse);

  // ─────────────────────────────────────────────────────────
  // 4. ★ v3.10.0 รอบที่ 13: กันหน้าเว็บ (เอกสาร HTML) ถูกแคช
  //    ที่ CDN/reverse proxy หรือฝั่ง browser เอง
  //
  //    ปัญหาที่พบ: ผู้ใช้เจอหน้าที่ค้าง ไม่อัปเดตตามโค้ด/ดีพลอยล่าสุด
  //    แม้ next.config.ts จะไม่ได้ตั้ง Cache-Control ของหน้าไว้เอง (ปล่อยตาม
  //    ค่า default ของแต่ละเลเยอร์ระหว่างทาง) — ตัวแปรที่ควบคุมไม่ได้เต็มที่
  //    จึงอาจทำให้ตัวเอกสาร HTML ถูกเก็บไว้นานเกินคาด
  //
  //    วิธีแก้: ระบุ Cache-Control: no-store ตรงๆ ที่ตัวเอกสาร HTML เท่านั้น
  //    (ไม่แตะ /api/* เพราะแต่ละ endpoint มีนโยบายแคชของ "ข้อมูล" อยู่แล้ว
  //    ใน src/lib/api/cache.ts เช่น 5s stale-while-revalidate สำหรับ /api/events —
  //    อันนั้นคือส่วนที่ "อยากแคช" อยู่แล้ว ไม่ต้องไปยุ่ง)
  //    ผลคือ: ข้อมูล (API) ยังแคชสั้นๆ ตามเดิมเพื่อความเร็ว
  //           แต่ตัวหน้าเว็บเองจะขอสดใหม่จาก server ทุกครั้ง
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

