// ═══════════════════════════════════════════════════════════════
// YP WORK · Observability · Request ID (Round 22)
// ═══════════════════════════════════════════════════════════════
// Request ID generation and extraction for end-to-end tracing.
// Generated in middleware → passed to all API routes → included in
// responses, logs, and audit entries.
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Generate a unique request ID (compact, URL-safe) */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Extract request ID from incoming request headers */
export function getRequestId(request: NextRequest | Request): string {
  return request.headers.get(REQUEST_ID_HEADER) || 'unknown';
}
