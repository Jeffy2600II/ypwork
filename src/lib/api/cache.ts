// ═══════════════════════════════════════════════════════════════
// YP WORK · API Cache Headers Helper (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// Centralized Cache-Control header policies for API routes.
//
// WHY THIS EXISTS
// ───────────────
// Before v3.8.0, only /api/events had a Cache-Control header (5s SWR).
// All other GET endpoints returned no cache headers → browser default
// behavior → potential refetch spam on navigation back/forward.
// All mutation endpoints (POST/PATCH/DELETE) also had no headers →
// some browsers would cache the 200 response and replay it on
// navigation (very bad for "create event" — could double-create).
//
// POLICIES
// ────────
// - list() — GET /api/events, /api/departments
//     private, max-age=5, stale-while-revalidate=10
//     5s cache + 10s SWR = up to 15s before re-fetch
//     Safe because realtime handles updates
//
// - detail() — GET /api/events/[id]/detail
//     private, max-age=2, stale-while-revalidate=5
//     Shorter (2s) because detail page is more likely to be re-fetched
//     when user navigates back from a task edit
//
// - staticList() — GET /api/departments (rarely changes)
//     private, max-age=30, stale-while-revalidate=300
//     30s cache + 5min SWR — departments change very rarely
//
// - noStore() — POST/PATCH/DELETE /api/...
//     no-store — never cache mutations
//     Critical: prevents browser from replaying POST on back button
//
// - auth() — /api/auth/*
//     no-store, must-revalidate — never cache auth responses
//
// USAGE
// ─────
//   import { apiCacheHeaders } from '@/lib/api/cache';
//   return NextResponse.json(data, { headers: apiCacheHeaders.list() });
//
// STABILITY NOTE
// ──────────────
// These policies are conservative — they only add caching where it's
// clearly safe (GET endpoints with realtime sync). They never remove
// caching that was already configured. All policies are private
// (browser-only, no CDN) because data is user-scoped.
// ═══════════════════════════════════════════════════════════════

/**
 * Cache-Control header policies for API routes.
 * Returns a Record<string, string> ready to spread into NextResponse headers.
 */
export const apiCacheHeaders = {
  /** List endpoints — GET /api/events, /api/profile/stats */
  list(): Record<string, string> {
    return {
      'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
    };
  },

  /** Detail endpoints — GET /api/events/[id]/detail */
  detail(): Record<string, string> {
    return {
      'Cache-Control': 'private, max-age=2, stale-while-revalidate=5',
    };
  },

  /** Static-ish endpoints — GET /api/departments, /api/council_years */
  staticList(): Record<string, string> {
    return {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
    };
  },

  /** Mutation endpoints — POST/PATCH/DELETE */
  noStore(): Record<string, string> {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };
  },

  /** Auth endpoints — /api/auth/* */
  auth(): Record<string, string> {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };
  },
};

/**
 * Build a NextResponse-like Response with cache headers + standard JSON body.
 * Convenience wrapper to keep route handlers terse.
 *
 *   return apiJson({ success: true, events }, { cache: 'list' });
 */
export function apiJson<T>(
  body: T,
  options: {
    status?: number;
    cache?: 'list' | 'detail' | 'staticList' | 'noStore' | 'auth';
    extraHeaders?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, cache, extraHeaders } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (cache) Object.assign(headers, apiCacheHeaders[cache]());
  if (extraHeaders) Object.assign(headers, extraHeaders);
  return new Response(JSON.stringify(body), { status, headers });
}
