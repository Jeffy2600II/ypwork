// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · Audit Log (Round 22)
// ═══════════════════════════════════════════════════════════════
// Audit log for security-significant events.
// Round 22: Added requestId field for end-to-end tracing.
//
// ★ Events logged: login, register, admin actions, rate limit hits,
//   CRUD on events/tasks, API errors, suspicious input.
//
// ★ Privacy: No PII — uses sanitizeForLog.
// ★ Storage: console.log (Vercel logs). Can switch to DB table later.
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
  | 'api_csrf_blocked'
  | 'api_error'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted';

export interface AuditLogEntry {
  ts: string;
  event: AuditEvent;
  ip?: string;
  actor?: string;
  status: 'success' | 'failure' | 'blocked';
  meta?: Record<string, any>;
  /** Round 22: request ID for end-to-end tracing */
  requestId?: string;
}

function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::';
  }
  return ip;
}

export function auditLog(
  event: AuditEvent,
  opts: {
    ip?: string;
    actor?: string;
    status?: 'success' | 'failure' | 'blocked';
    meta?: Record<string, any>;
    requestId?: string;
  } = {}
): void {
  const entry: AuditLogEntry = {
    ts: new Date().toISOString(),
    event,
    ip: opts.ip ? maskIp(opts.ip) : undefined,
    actor: opts.actor ? redactPiiFromMessage(opts.actor) : undefined,
    status: opts.status ?? 'success',
    meta: opts.meta ? sanitizeForLog(opts.meta) : undefined,
    requestId: opts.requestId,
  };

  const prefix = `[AUDIT:${event}]`;
  if (entry.status === 'success') {
    console.info(prefix, entry);
  } else if (entry.status === 'blocked') {
    console.warn(prefix, entry);
  } else {
    console.error(prefix, entry);
  }
}
