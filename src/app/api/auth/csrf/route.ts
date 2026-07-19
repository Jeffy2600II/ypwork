// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/auth/csrf (v3.4.0)
// ═══════════════════════════════════════════════════════════════
// Issue CSRF token สำหรับ client ใช้ใน mutation requests
//
// Response:
//   { success: true, token: "<64-hex-string>" }
//   พร้อม set cookie yp_csrf_token (httpOnly)
//
// Client usage:
//   const { token } = await fetch('/api/auth/csrf').then(r => r.json());
//   await fetch('/api/events', {
//     method: 'POST',
//     headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
//     body: JSON.stringify({...}),
//   });
// ═══════════════════════════════════════════════════════════════

import { issueCsrfToken } from '@/lib/security';

export async function GET() {
  return issueCsrfToken();
}
