// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Route Handler Wrapper (Round 22)
// ═══════════════════════════════════════════════════════════════
// Centralized API boundary layer. Wraps every route handler to
// provide consistent auth, error handling, request ID, and
// response envelope — without moving business logic.
//
// Usage:
//   export const GET = withAuth(async (ctx, request) => {
//     const events = await eventsRepo.findAll(ctx.adminClient);
//     return apiSuccess(events, ctx.requestId, { cache: 'list' });
//   });
//
//   export const PATCH = withAuth(async (ctx, request, routeCtx) => {
//     const { id } = await routeCtx!.params;
//     // ... business logic ...
//     return apiSuccess(null, ctx.requestId, { cache: 'noStore' });
//   });
//
//   export const POST = withAdmin(async (ctx, request) => { ... });
//   export const GET = withPublic(async (request, requestId) => { ... });
// ═══════════════════════════════════════════════════════════════

import type { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth/user-guard';
import { requireAdmin } from '@/lib/auth/api-guard';
import { getRequestId } from '@/lib/observability/request-id';
import { apiErrorResponse } from './response';
import { ApiError, unauthorized } from './errors';

export interface AuthContext {
  adminClient: SupabaseClient;
  userClient: SupabaseClient;
  userAuthUid: string;
  userFullName: string;
  userRole: 'admin' | 'member';
  userDepartmentId: string | null;
  requestId: string;
}

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  ctx: AuthContext,
  request: NextRequest,
  context?: RouteContext
) => Promise<NextResponse>;

type PublicRouteHandler = (
  request: NextRequest,
  requestId: string
) => Promise<NextResponse>;

function handleError(err: unknown, requestId: string): NextResponse {
  if (err instanceof ApiError) return apiErrorResponse(err, requestId);
  console.error(`[${requestId}] Unhandled error:`, err);
  return apiErrorResponse(
    new ApiError('INTERNAL_ERROR', 'เกิดข้อผิดพลาดภายในระบบ', 500),
    requestId
  );
}

/** Wrap a route handler with user authentication */
export function withAuth(handler: RouteHandler) {
  return async (
    request: NextRequest,
    context?: RouteContext
  ): Promise<NextResponse> => {
    const requestId = getRequestId(request);
    const guard = await requireUser();
    if (!guard.ok) return apiErrorResponse(unauthorized(), requestId);
    try {
      return await handler(
        {
          adminClient: guard.adminClient,
          userClient: guard.userClient,
          userAuthUid: guard.userAuthUid,
          userFullName: guard.userFullName,
          userRole: guard.userRole,
          userDepartmentId: guard.userDepartmentId,
          requestId,
        },
        request,
        context
      );
    } catch (err) {
      return handleError(err, requestId);
    }
  };
}

/** Wrap a route handler with admin authentication */
export function withAdmin(handler: RouteHandler) {
  return async (
    request: NextRequest,
    context?: RouteContext
  ): Promise<NextResponse> => {
    const requestId = getRequestId(request);
    const guard = await requireAdmin();
    if (!guard.ok) return apiErrorResponse(unauthorized(), requestId);
    try {
      return await handler(
        {
          adminClient: guard.adminClient,
          userClient: null as any,
          userAuthUid: guard.userAuthUid,
          userFullName: guard.userFullName,
          userRole: 'admin',
          userDepartmentId: null,
          requestId,
        },
        request,
        context
      );
    } catch (err) {
      return handleError(err, requestId);
    }
  };
}

/** Wrap a public route handler (no auth, but gets request ID) */
export function withPublic(handler: PublicRouteHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId(request);
    try {
      return await handler(request, requestId);
    } catch (err) {
      return handleError(err, requestId);
    }
  };
}
