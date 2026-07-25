// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · CSRF Protection (v3.4.0)
// ═══════════════════════════════════════════════════════════════
// CSRF (Cross-Site Request Forgery) protection สำหรับ API routes ที่ mutate data
//
// ★ ทำไมต้องมี CSRF protection?
//   แม้ว่า Supabase auth cookies จะมี SameSite=Lax แล้ว
//   แต่ SameSite=Lax ยังอนุญาต top-level navigation พร้อม cookies
//   และมี browser บางตัวที่ไม่รองรับ SameSite อย่างสมบูรณ์
//   CSRF token เป็น defense-in-depth layer
//
// ★ วิธีการทำงาน:
//   1. Client ขอ CSRF token จาก /api/auth/csrf (GET, ใช้ cookie httpOnly)
//   2. Server สร้าง token แบบ random 32 bytes + store ใน cookie httpOnly
//   3. Client ส่ง token กลับใน header X-CSRF-Token สำหรับทุก mutation request
//   4. Server เปรียบเทียบ header vs cookie — ถ้าไม่ตรง = 403
//
// ★ Double-submit cookie pattern:
//   เราไม่ต้องการเก็บ state ฝั่ง server (จะทำให้ scaled deployment ซับซ้อน)
//   จึงใช้ double-submit pattern — token อยู่ใน cookie + header
//   ผู้โจมตีไม่สามารถอ่าน cookie ได้ (httpOnly + same-origin) → ไม่สามารถ forge ได้
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE = 'yp_csrf_token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * สร้าง random CSRF token — 32 bytes hex (256 bit entropy)
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Issue CSRF token — set cookie + return token ใน response body
 * ใช้ใน /api/auth/csrf GET
 */
export function issueCsrfToken(): NextResponse {
  const token = generateToken();
  const response = NextResponse.json({ success: true, token });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 ชั่วโมง (เท่ากับ session)
  });
  return response;
}

/**
 * Validate CSRF token — เปรียบเทียบ header vs cookie
 * ใช้ใน API routes ที่ mutate data (POST/PATCH/DELETE)
 *
 * Usage:
 *   const csrfError = validateCsrfToken(request);
 *   if (csrfError) return csrfError;
 */
export function validateCsrfToken(request: NextRequest): NextResponse | null {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return NextResponse.json(
      { success: false, error: 'Missing CSRF token' },
      { status: 403 }
    );
  }

  if (headerToken !== cookieToken) {
    return NextResponse.json(
      { success: false, error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null; // valid
}

/**
 * Check if request method ต้องการ CSRF validation
 */
export function isMutationMethod(method: string): boolean {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase());
}
