// ═══════════════════════════════════════════════════════════════
// YP WORK · Observability · Structured Logger (Round 22)
// ═══════════════════════════════════════════════════════════════
// Structured logging with request ID correlation.
// All logs include: timestamp, requestId, module, level, message.
//
// Application logs (debugging, runtime, errors):
//   logger.debug(requestId, 'Module', 'message', details)
//   logger.warn(requestId, 'Module', 'message', details)
//   logger.error(requestId, 'Module', 'message', details)
//
// Audit logs (security events, data changes):
//   Use auditLog() from '@/lib/security' — now includes requestId.
// ═══════════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  requestId: string;
  module: string;
  level: LogLevel;
  message: string;
  details?: Record<string, any>;
}

function formatEntry(
  requestId: string,
  module: string,
  level: LogLevel,
  message: string,
  details?: Record<string, any>
): LogEntry {
  return {
    ts: new Date().toISOString(),
    requestId,
    module,
    level,
    message,
    details: details ? sanitizeDetails(details) : undefined,
  };
}

function sanitizeDetails(details: Record<string, any>): Record<string, any> {
  // Basic PII redaction — for full PII handling use sanitizeForLog from security
  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    const lk = key.toLowerCase();
    if (lk === 'password' || lk === 'pwd' || lk === 'pass') {
      redacted[key] = '***REDACTED***';
    } else if (lk.includes('national_id') || lk === 'nid') {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = sanitizeDetails(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function log(level: LogLevel, consoleFn: 'log' | 'info' | 'warn' | 'error') {
  return (
    requestId: string,
    module: string,
    message: string,
    details?: Record<string, any>
  ) => {
    const entry = formatEntry(requestId, module, level, message, details);
    const prefix = `[${entry.ts}] [${entry.requestId}] [${entry.module}]`;
    if (details) {
      console[consoleFn](prefix, message, entry.details);
    } else {
      console[consoleFn](prefix, message);
    }
  };
}

export const logger = {
  debug: log('debug', 'log'),
  info: log('info', 'info'),
  warn: log('warn', 'warn'),
  error: log('error', 'error'),
};
