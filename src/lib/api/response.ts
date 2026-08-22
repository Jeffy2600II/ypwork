// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Response Envelope (Round 22)
// ═══════════════════════════════════════════════════════════════
// Standardized response helpers for all API routes.
//
// Success: { success: true, data: T, meta: { requestId, ... } }
// Error:  { success: false, error: { code, message, details? }, requestId }
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { apiCacheHeaders } from './cache';
import { ApiError } from './errors';
import { REQUEST_ID_HEADER } from '@/lib/observability/request-id';

export function apiSuccess<T>(
  data: T,
  requestId: string,
  options: {
    status?: number;
    cache?: 'list' | 'detail' | 'staticList' | 'noStore' | 'auth';
    meta?: Record<string, any>;
  } = {}
): NextResponse {
  const { status = 200, cache, meta } = options;
  const headers: Record<string, string> = {
    [REQUEST_ID_HEADER]: requestId,
  };
  if (cache) Object.assign(headers, apiCacheHeaders[cache]());

  return NextResponse.json(
    { success: true, data, meta: { requestId, ...meta } },
    { status, headers }
  );
}

export function apiErrorResponse(
  error: ApiError | Error,
  requestId: string
): NextResponse {
  const headers: Record<string, string> = {
    [REQUEST_ID_HEADER]: requestId,
    ...apiCacheHeaders.noStore(),
  };

  if (error instanceof ApiError) {
    const body: any = {
      success: false,
      error: { code: error.code, message: error.message },
      requestId,
    };
    if (error.details) body.error.details = error.details;
    return NextResponse.json(body, { status: error.statusCode, headers });
  }

  // Unknown error — never leak internal details
  return NextResponse.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' },
      requestId,
    },
    { status: 500, headers }
  );
}
