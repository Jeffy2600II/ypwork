// ═══════════════════════════════════════════════════════════════
// YP WORK · Observability · Structured Logger (Round 24)
// ═══════════════════════════════════════════════════════════════
// Structured logging for application observability.
//
// Two log channels:
//   1. Application Log — for debugging, runtime, operations, errors
//   2. Audit Log       — for security events and data mutations
//
// Every log entry includes:
//   - timestamp (ISO 8601)
//   - requestId (for traceability)
//   - level
//   - context fields
//
// Output: console (Vercel/Next.js captures these)
// Future: can be swapped to external log aggregator without
// changing call sites.
// ═══════════════════════════════════════════════════════════════

import { sanitizeForLog, redactPiiFromMessage } from '@/lib/security/pii';

// ── Log Levels ─────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// In production, skip debug logs
const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// ── Log Entry Shapes ───────────────────────────────────────────

interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  [key: string]: any;
}

interface RequestLogEntry {
  requestId: string;
  method: string;
  path: string;
  status: number;
  duration: number;
}

interface ErrorLogEntry {
  requestId: string;
  method: string;
  path: string;
  error: unknown;
  duration: number;
}

// ── Internal Log Writer ────────────────────────────────────────

function writeLog(level: LogLevel, fields: Record<string, any>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

  const entry: BaseLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    ...sanitizeForLog(fields),
  };

  const prefix = `[${level.toUpperCase()}]`;
  switch (level) {
    case 'error':
      console.error(prefix, entry);
      break;
    case 'warn':
      console.warn(prefix, entry);
      break;
    case 'info':
      console.info(prefix, entry);
      break;
    default:
      console.log(prefix, entry);
  }
}

// ── Public API ─────────────────────────────────────────────────

/** Application log — for debugging and runtime information */
export const logger = {
  debug(fields: Record<string, any>, message?: string): void {
    writeLog('debug', { message, ...fields });
  },

  info(fields: Record<string, any>, message?: string): void {
    writeLog('info', { message, ...fields });
  },

  warn(fields: Record<string, any>, message?: string): void {
    writeLog('warn', { message, ...fields });
  },

  error(fields: Record<string, any>, message?: string): void {
    writeLog('error', { message, ...fields });
  },
};

/**
 * Log an API request — called by the gateway after handler completes.
 */
export function logRequest(entry: RequestLogEntry): void {
  writeLog('info', {
    type: 'request',
    requestId: entry.requestId,
    method: entry.method,
    path: entry.path,
    status: entry.status,
    durationMs: entry.duration,
  });
}

/**
 * Log an unhandled error — called by the gateway's catch block.
 */
export function logError(entry: ErrorLogEntry): void {
  const err = entry.error;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  writeLog('error', {
    type: 'unhandled_error',
    requestId: entry.requestId,
    method: entry.method,
    path: entry.path,
    durationMs: entry.duration,
    error: redactPiiFromMessage(message),
    stack: stack ? redactPiiFromMessage(stack) : undefined,
  });
}
