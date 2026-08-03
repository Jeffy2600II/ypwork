// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · Audit Log (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// Audit log สำหรับนัยสำคัญ security events
// ใช้สำหรับ compliance + forensic ถ้ามี incident
//
// ★ Events ที่ log:
//   - login success / failure
//   - register request submitted
//   - admin approve / reject request
//   - rate limit hit
//   - suspicious input detected
//
// ★ Privacy:
//   - ไม่ log PII (ใช้ sanitizeForLog ก่อนเสมอ)
//   - เก็บแค่ข้อมูลจำเป็น: action, ip, timestamp, status
//
// ★ Storage: console.log (เพราะ internal app)
//   - ถ้า deploy บน Vercel จะไปอยู่ใน Vercel logs
//   - ถ้าต้องการ persistent audit log สามารถเปลี่ยนเป็น DB table ได้
// ═══════════════════════════════════════════════════════════════

import { sanitizeForLog, redactPiiFromMessage } from './pii';

export type AuditEvent =
  | 'login_success'
  | 'login_failure'
  | 'login_rate_limited'
  | 'logout'
  | 'register_submitted'
  | 'register_rate_limited'
  | 'admin_approve_request'
  | 'admin_reject_request'
  | 'admin_action_blocked'
  | 'api_rate_limited'
  | 'suspicious_input'
  | 'auth_callback_error'
  // ★ v3.4.0: new events
  | 'api_csrf_blocked'
  | 'api_error'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted';

export interface AuditLogEntry {
  /** ISO timestamp */
  ts: string;
  /** event type */
  event: AuditEvent;
  /** client IP (masked for privacy — last octet hidden) */
  ip?: string;
  /** user identifier (auth_uid or student_id or email — already masked) */
  actor?: string;
  /** status: success | failure | blocked */
  status: 'success' | 'failure' | 'blocked';
  /** additional context (PII-safe) */
  meta?: Record<string, any>;
}

/** Mask IP สำหรับ log — เก็บ /24 prefix ของ IPv4 หรือ /64 ของ IPv6 */
function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  // IPv4: 192.168.1.100 → 192.168.1.0
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
  // IPv6: เก็บ 4 กลุ่มแรก
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::';
  }
  return ip;
}

/**
 * บันทึก audit log entry
 * ใช้ console.log เพราะ Vercel/Next.js จะจัดการให้
 */
export function auditLog(
  event: AuditEvent,
  opts: {
    ip?: string;
    actor?: string;
    status?: 'success' | 'failure' | 'blocked';
    meta?: Record<string, any>;
  } = {}
): void {
  const entry: AuditLogEntry = {
    ts: new Date().toISOString(),
    event,
    ip: opts.ip ? maskIp(opts.ip) : undefined,
    actor: opts.actor ? redactPiiFromMessage(opts.actor) : undefined,
    status: opts.status ?? 'success',
    meta: opts.meta ? sanitizeForLog(opts.meta) : undefined,
  };

  // ใช้ console.info สำหรับ success, console.warn สำหรับ failure/blocked
  // เพื่อให้ filter ได้ใน log dashboard
  const prefix = `[AUDIT:${event}]`;
  if (entry.status === 'success') {
    console.info(prefix, entry);
  } else if (entry.status === 'blocked') {
    console.warn(prefix, entry);
  } else {
    console.error(prefix, entry);
  }
}
