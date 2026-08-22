// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Standardized Response (Round 24)
// ═══════════════════════════════════════════════════════════════
// Unified API response contract for all endpoints.
//
// Backward-compatible design:
//   Success: { success: true, ...dataFields, meta: { requestId } }
//   Error:   { success: false, error: "message", errorCode: "CODE", meta: { requestId } }
//
// Data fields are spread to the top level (e.g. { events: [...] })
// so the existing frontend continues to work without changes.
//
// New fields (meta.requestId, errorCode) are additive — they don't
// break existing consumers but enable traceability.
//
// Use the helper functions instead of building responses manually:
//   apiSuccess(req, { events })          → { success: true, events, meta }
//   apiCreated(req, { id })              → { success: true, id, meta }
//   apiError(req, ErrorCode.X, "msg")    → { success: false, error: "msg", errorCode: "X", meta }
//   apiPaginated(req, items, total)      → { success: true, data: items, meta: { requestId, pagination } }
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestId } from './request-context';
import { apiCacheHeaders } from './cache';

// ── Response Meta ─────────────────────────────────────────────

export interface ResponseMeta {
  /** Request ID for traceability — included in every response */
  requestId: string;
  /** Pagination info — only present on paginated list endpoints */
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ── Success Helpers ────────────────────────────────────────────

/**
 * Build a success response with the standard contract.
 * Data fields are SPREAD to the top level for backward compatibility.
 *
 * @param req     - The NextRequest (used to extract requestId)
 * @param data    - The response payload fields (spread into response)
 * @param options - Optional: status, cache policy, extra headers
 *
 * Example:
 *   apiSuccess(req, { events }) → { success: true, events: [...], meta: { requestId } }
 *   apiSuccess(req, { id })     → { success: true, id: "ev_xxx", meta: { requestId } }
 *   apiSuccess(req, {})         → { success: true, meta: { requestId } }
 */
export function apiSuccess<T extends Record<string, any>>(
  req: NextRequest,
  data: T,
  options: {
    status?: number;
    cache?: 'list' | 'detail' | 'staticList' | 'noStore';
    extraHeaders?: Record<string, string>;
  } = {}
): NextResponse {
  const requestId = getRequestId(req);
  const { status = 200, cache, extraHeaders } = options;

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
  };
  if (cache) Object.assign(headers, apiCacheHeaders[cache]());
  if (extraHeaders) Object.assign(headers, extraHeaders);

  return NextResponse.json(
    { success: true, ...data, meta: { requestId } },
    { status, headers }
  );
}

/**
 * Build a 201 Created response.
 */
export function apiCreated<T extends Record<string, any>>(
  req: NextRequest,
  data: T,
  options: { extraHeaders?: Record<string, string> } = {}
): NextResponse {
  const requestId = getRequestId(req);
  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    ...apiCacheHeaders.noStore(),
  };
  if (options.extraHeaders) Object.assign(headers, options.extraHeaders);

  return NextResponse.json(
    { success: true, ...data, meta: { requestId } },
    { status: 201, headers }
  );
}

/**
 * Build a paginated list response.
 * Uses `data` as the field name for items (not spread).
 */
export function apiPaginated<T>(
  req: NextRequest,
  items: T[],
  total: number,
  options: {
    page?: number;
    limit?: number;
    cache?: 'list' | 'staticList';
    dataKey?: string;
  } = {}
): NextResponse {
  const requestId = getRequestId(req);
  const { page = 1, limit = items.length, cache = 'list', dataKey = 'items' } = options;

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    ...apiCacheHeaders[cache](),
  };

  return NextResponse.json(
    {
      success: true,
      [dataKey]: items,
      meta: {
        requestId,
        pagination: {
          page,
          limit,
          total,
          hasMore: page * limit < total,
        },
      },
    },
    { status: 200, headers }
  );
}

// ── Error Helpers ──────────────────────────────────────────────

/**
 * Build a standardized error response.
 *
 * @param req      - The NextRequest
 * @param code     - Machine-readable error code (e.g. 'AUTH_REQUIRED')
 * @param message  - Human-readable message (Thai, user-facing)
 * @param options  - status (default 400), details, extraHeaders
 *
 * Response shape (backward compatible):
 *   { success: false, error: "message", errorCode: "CODE", meta: { requestId } }
 *
 * `error` remains a string for backward compatibility with the frontend.
 * `errorCode` is the new machine-readable code.
 */
export function apiError(
  req: NextRequest,
  code: string,
  message: string,
  options: {
    status?: number;
    extraHeaders?: Record<string, string>;
  } = {}
): NextResponse {
  const requestId = getRequestId(req);
  const { status = 400, extraHeaders } = options;

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    ...apiCacheHeaders.noStore(),
  };
  if (extraHeaders) Object.assign(headers, extraHeaders);

  return NextResponse.json(
    { success: false, error: message, errorCode: code, meta: { requestId } },
    { status, headers }
  );
}

/**
 * Common error codes — import and use instead of string literals.
 */
export const ErrorCode = {
  // Auth
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_NOT_APPROVED: 'AUTH_NOT_APPROVED',
  AUTH_DISABLED: 'AUTH_DISABLED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  MISSING_PARAM: 'MISSING_PARAM',
  INVALID_PARAM: 'INVALID_PARAM',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Rate limit
  RATE_LIMITED: 'RATE_LIMITED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Pre-built error responses for common scenarios.
 */
export const apiErrors = {
  unauthorized: (req: NextRequest) =>
    apiError(req, ErrorCode.AUTH_REQUIRED, 'ไม่ได้เข้าสู่ระบบ', { status: 401 }),

  forbidden: (req: NextRequest) =>
    apiError(req, ErrorCode.AUTH_FORBIDDEN, 'ไม่มีสิทธิ์เข้าถึง', { status: 403 }),

  notFound: (req: NextRequest, resource = 'รายการ') =>
    apiError(req, ErrorCode.NOT_FOUND, `ไม่พบ${resource}`, { status: 404 }),

  invalidJson: (req: NextRequest) =>
    apiError(req, ErrorCode.INVALID_JSON, 'Invalid JSON body', { status: 400 }),

  internalError: (req: NextRequest) =>
    apiError(req, ErrorCode.INTERNAL_ERROR, 'เกิดข้อผิดพลาดภายในระบบ', { status: 500 }),
};
