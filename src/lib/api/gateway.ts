// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Gateway / Handler Wrapper (Round 24)
// ═══════════════════════════════════════════════════════════════
// Centralized API entry layer that wraps route handlers with:
//   - Request ID injection
//   - Structured request/response logging
//   - Error normalization (catches unhandled exceptions)
//   - Consistent response contract
//
// Usage:
//   export const GET = withApiHandler(async (req) => { ... });
//   export const PATCH = withApiHandlerParams(async (req, { params }) => { ... });
//
// The gateway is a BOUNDARY — it handles cross-cutting concerns.
// It does NOT contain business logic.
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { getRequestId, REQUEST_ID_HEADER } from './request-context';
import { apiError, ErrorCode } from './response';
import { logRequest, logError } from '@/lib/observability/logger';

// ── Route Context ─────────────────────────────────────────────
// In Next.js 15, params is a Promise. We use `any` here because
// each route file defines its own typed RouteContext with the
// correct params shape. The gateway passes the context through
// transparently.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteContext = any;

// ── Handler Types ──────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  ctx?: RouteContext
) => Promise<Response> | Response;

type RouteHandlerWithParams = (
  req: NextRequest,
  ctx: RouteContext
) => Promise<Response> | Response;

// ── Gateway Implementation ─────────────────────────────────────

/**
 * Wrap a route handler with the API gateway layer.
 */
export function withApiHandler(
  handler: RouteHandler | RouteHandlerWithParams,
  options: { withParams?: boolean } = {}
): (req: NextRequest, ctx?: RouteContext) => Promise<Response> {
  return async (req: NextRequest, ctx?: RouteContext) => {
    const requestId = getRequestId(req);
    const startTime = Date.now();
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
      req.headers.set(REQUEST_ID_HEADER, requestId);

      const response = options.withParams
        ? await (handler as RouteHandlerWithParams)(req, ctx!)
        : await (handler as RouteHandler)(req, ctx);

      if (!response.headers.get(REQUEST_ID_HEADER)) {
        response.headers.set(REQUEST_ID_HEADER, requestId);
      }

      const duration = Date.now() - startTime;
      logRequest({
        requestId,
        method,
        path,
        status: response.status,
        duration,
      });

      return response;
    } catch (err) {
      const duration = Date.now() - startTime;

      logError({
        requestId,
        method,
        path,
        error: err,
        duration,
      });

      return apiError(
        req,
        ErrorCode.INTERNAL_ERROR,
        'เกิดข้อผิดพลาดภายในระบบ',
        { status: 500 }
      );
    }
  };
}

/**
 * Wrap a route handler that receives dynamic params (e.g. /api/events/[id]).
 */
export function withApiHandlerParams(
  handler: RouteHandlerWithParams
): (req: NextRequest, ctx: RouteContext) => Promise<Response> {
  return withApiHandler(handler, { withParams: true });
}
