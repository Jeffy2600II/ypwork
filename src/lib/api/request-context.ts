// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Request Context (Round 24)
// ═══════════════════════════════════════════════════════════════
// Request ID generation and extraction for traceability.
//
// Every API request gets a unique requestId that:
//   1. Is generated in middleware (or read from X-Request-ID header)
//   2. Is attached to the response as X-Request-Id
//   3. Is included in structured logs
//   4. Is included in audit logs
//
// This enables end-to-end tracing:
//   Client request → API route → DB query → Audit log → Response
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Generate a request ID — 16 random bytes hex (128 bit).
 * Format: r{hex} for easy identification in logs.
 */
export function generateRequestId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `r${hex.slice(0, 16)}`;
}

/**
 * Extract request ID from a request.
 * If the client sent an X-Request-ID header, use that.
 * Otherwise, generate a new one.
 */
export function getRequestId(req: NextRequest): string {
  const existing = req.headers.get(REQUEST_ID_HEADER);
  if (existing && existing.length > 0 && existing.length <= 128) {
    return existing;
  }
  return generateRequestId();
}

/**
 * Extract request ID from a Response object (for logging).
 */
export function getRequestIdFromResponse(res: Response): string | null {
  return res.headers.get(REQUEST_ID_HEADER);
}

export { REQUEST_ID_HEADER };
