// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · HTTP Security Headers (v3.4.1)
// ═══════════════════════════════════════════════════════════════
// ★ v3.4.1 changes vs v3.4.0:
//   - SOFTENED Cross-Origin-Embedder-Policy จาก 'credentialless' → 'unsafe-none'
//     เหตุผล: 'credentialless' อาจบล็อกการโหลดรูปจาก Supabase Storage ในอนาคต
//     เมื่อมีการใช้ avatar_url field (ซึ่งมีอยู่ใน schema แต่ยังไม่ได้ใช้)
//     COEP 'unsafe-none' คือ browser default — เทียบเท่ากับไม่ส่ง header
//     แต่เรายังคง COOP + CORP ซึ่งเป็น defense หลักต่อ side-channel attacks
//   - คงไว้ทั้งหมด: CSP, HSTS, COOP same-origin, CORP same-site,
//     Permissions-Policy (รวม sensor APIs), X-Frame-Options, Referrer-Policy
//
// ★ v3.4.0 changes (ก่อนหน้า):
//   1. ลด 'unsafe-eval' ออกจาก script-src
//   2. เพิ่ม COEP credentialless (ถูก softening ใน v3.4.1)
//   3. เพิ่ม COOP same-origin (คงไว้)
//   4. เพิ่ม X-Permitted-Cross-Domain-Policies: none (คงไว้)
//   5. เพิ่ม CORP same-site (คงไว้)
//   6. ปิด sensor APIs ใน Permissions-Policy (คงไว้)
//   7. เพิ่ม upgrade-insecure-requests (คงไว้)
// ═══════════════════════════════════════════════════════════════

/**
 * Security headers หลัก — ใช้กับทุก response
 *
 * หมายเหตุ: COEP ถูก softening เป็น 'unsafe-none' เพื่อ safety กับ Supabase Storage
 * แต่ COOP + CORP ยังคงเป็น defense หลักต่อ Spectre-type side channel attacks
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // ── Content Security Policy (v3.4.0 tightened) ──
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://*.supabase.co",
    "media-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join('; '),

  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'browsing-topics=()',
    'payment=()',
    'usb=()',
    'bluetooth=()',
    'nfc=()',
    'serial=()',
    'hid=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()',
    'ambient-light-sensor=()',
  ].join(', '),

  // 1 ปี HSTS + includeSubDomains + preload
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  'X-DNS-Prefetch-Control': 'off',

  // ★ v3.4.1: SOFTENED จาก 'credentialless' → 'unsafe-none'
  // เหตุผล: 'credentialless' อาจบล็อก avatar_url จาก Supabase Storage ในอนาคต
  // 'unsafe-none' คือ browser default — COOP + CORP เป็น defense หลักต่อ side channel
  'Cross-Origin-Embedder-Policy': 'unsafe-none',

  // COOP same-origin — ป้องกัน cross-origin window manipulation
  // เป็น defense หลักต่อ Spectre-type side channel attacks
  'Cross-Origin-Opener-Policy': 'same-origin',

  // CORP same-site — ป้องกัน cross-site resource embedding
  'Cross-Origin-Resource-Policy': 'same-site',

  // ปิด Adobe / Flash cross-domain policy (legacy attack vector)
  'X-Permitted-Cross-Domain-Policies': 'none',
};

/**
 * ★ v3.4.0: Authenticated route headers — ใช้กับหน้าที่ login แล้ว
 * เพิ่ม Cache-Control: no-store เพื่อป้องกัน back button leak
 */
export const AUTHENTICATED_HEADERS: Record<string, string> = {
  ...SECURITY_HEADERS,
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Headers สำหรับใส่ใน next.config.ts ในรูปแบบที่ Next.js ต้องการ
 */
export const securityHeadersForNextConfig = Object.entries(SECURITY_HEADERS).map(
  ([key, value]) => ({ key, value })
);

/**
 * Headers สำหรับใส่ใน NextResponse ผ่าน middleware
 */
export function applySecurityHeaders(
  response: { headers: { set: (name: string, value: string) => void } }
): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

/**
 * ★ v3.4.0: Apply authenticated headers — รวม Cache-Control: no-store
 * ใช้กับหน้าที่ login แล้ว (จะถูกเรียกใน middleware หลัง auth check)
 */
export function applyAuthenticatedHeaders(
  response: { headers: { set: (name: string, value: string) => void } }
): void {
  for (const [key, value] of Object.entries(AUTHENTICATED_HEADERS)) {
    response.headers.set(key, value);
  }
}
