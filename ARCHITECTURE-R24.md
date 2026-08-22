# YP Work · Architecture Upgrade (Round 24)

## Summary

Platform-level architecture upgrade focused on:
Centralization · Consistency · Security · Observability · Real-time · Scalability · Maintainability

---

## What Changed

### 1. API Gateway / Entry Layer

**New files:**
- `src/lib/api/gateway.ts` — `withApiHandler()` / `withApiHandlerParams()` HOC
- `src/lib/api/response.ts` — `apiSuccess()`, `apiError()`, `apiCreated()`, `apiPaginated()` + `ErrorCode` enum
- `src/lib/api/request-context.ts` — Request ID generation and extraction
- `src/lib/api/auth-context.ts` — Gateway-compatible auth context (`requireAuthUser`, `requireAuthAdmin`)
- `src/lib/api/index.ts` — Barrel export

**What it does:**
Every API route is now wrapped with `withApiHandler()` which provides:
- Request ID generation/injection (X-Request-Id header on every response)
- Structured request/response logging (method, path, status, duration)
- Error normalization (unhandled exceptions → standardized 500 response)
- Timing measurement

**Backward compatible:**
- Response shape: `{ success: true, ...dataFields, meta: { requestId } }`
- Error shape: `{ success: false, error: "message", errorCode: "CODE", meta: { requestId } }`
- `error` remains a string (frontend reads `data.error` directly)
- `errorCode` and `meta.requestId` are additive — no frontend changes needed

### 2. Middleware Wiring

**New file:**
- `src/middleware.ts` — Properly wires `proxy.ts` as Next.js middleware

**Problem fixed:**
The `proxy.ts` file existed but was never wired as middleware (no `middleware.ts`).
Rate limiting, security headers, and session refresh were not running at the middleware level.

### 3. Data Access Layer (Repositories)

**New files:**
- `src/lib/repositories/event-repository.ts`
- `src/lib/repositories/task-repository.ts`
- `src/lib/repositories/department-repository.ts`
- `src/lib/repositories/user-repository.ts`
- `src/lib/repositories/index.ts`

**What it does:**
API routes no longer directly use Supabase clients. Instead, they call repository methods that encapsulate data access. This separates business logic from data access logic.

### 4. Observability

**New files:**
- `src/lib/observability/logger.ts` — Structured logging with request context
- `src/lib/observability/index.ts` — Barrel export

**What it does:**
- `logRequest()` — logs every API request with requestId, method, path, status, duration
- `logError()` — logs unhandled errors with full context
- PII-safe logging (uses existing `sanitizeForLog`)
- Level-based filtering (debug in dev, info+ in prod)

### 5. Permission Matrix

**New file:**
- `src/lib/auth/permissions.ts`

**What it does:**
Centralized permission definitions and role→permission matrix.
The existing admin/member role system is preserved (as requested).
Provides `hasPermission(role, permission)` instead of scattered hard-coded checks.

### 6. Real-time Event Registry

**New files:**
- `src/lib/realtime/registry.ts` — Canonical event types, table names, channel prefixes
- `src/lib/realtime/index.ts` — Barrel export

**What it does:**
Single source of truth for real-time event types, channel naming conventions, and connection status mapping.
The existing real-time hooks are NOT changed — they continue to work as-is.

### 7. Migrated API Routes

All 15 API routes migrated to the gateway pattern:
- `GET/POST /api/events`
- `PATCH/DELETE /api/events/[id]`
- `GET /api/events/[id]/detail`
- `POST /api/events/[id]/tasks`
- `PATCH/DELETE /api/tasks/[id]`
- `PUT /api/tasks/[id]/assignee`
- `GET /api/departments`
- `GET /api/departments/members`
- `GET /api/profile/stats`
- `GET /api/admin/requests`
- `POST /api/admin/approve-request`
- `POST /api/admin/requests/[id]/reject`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/auto-login`
- `GET /api/auth/csrf`
- `GET /api/auth/check-pending-status`
- `GET /api` (root — API metadata)

---

## Architecture Before → After

### Before (Round 21)
```
Client → Next.js (no middleware) → API routes (individual auth checks, inline validation, direct Supabase calls, inconsistent response formats, no request IDs, console.error logging)
```

### After (Round 24)
```
Client → Middleware (request ID, rate limit, security headers, session refresh)
       → API Gateway (withApiHandler — logging, error normalization, request context)
       → Auth Context (requireAuthUser / requireAuthAdmin — standardized auth)
       → Repositories (event/task/department/user — data access layer)
   → Supabase (PostgreSQL + Realtime)
```

---

## What Was Preserved

1. **User roles** — admin/member system unchanged (as explicitly requested)
2. **Frontend** — no changes needed; response format is backward compatible
3. **Real-time hooks** — existing use-realtime/* hooks unchanged
4. **Security modules** — rate-limit, headers, CSRF, PII, validation all kept
5. **Cache policies** — apiCacheHeaders unchanged
6. **Event loader** — fetchEventsWithRelations / fetchEventById still used via repository
7. **Data Sync Context** — in-app mutation broadcasting unchanged
8. **Audit logging** — existing auditLog() still used; new logger adds structured app logs

---

## What Was NOT Done (Intentional)

- **Message broker / Event bus** — not needed at current scale; in-process events suffice
- **Microservices** — modular monolith is the right architecture at this scale
- **External webhook integrations** — prepared extension points but not implemented
- **Redis-backed rate limiting** — in-memory is sufficient for internal app
- **Full API versioning** — X-Request-Id added; path-based versioning deferred
- **Resource-level authorization** — permission matrix defined but not enforced everywhere yet (future evolution)

---

## Future Evolution Path

1. **Enforce permission checks** — wire `hasPermission()` into route handlers
2. **API versioning** — add `/v1/` prefix when breaking changes are needed
3. **External log aggregation** — swap `console.log` in logger.ts to external service
4. **Redis rate limiting** — when multiple instances are needed
5. **Event-driven architecture** — when async workers are needed
6. **WebSocket gateway** — if Supabase Realtime is replaced
