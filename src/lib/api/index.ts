// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Barrel Export (Round 24)
// ═══════════════════════════════════════════════════════════════

// Gateway / Handler wrapper
export { withApiHandler, withApiHandlerParams, type RouteContext } from './gateway';

// Standardized responses
export {
  apiSuccess,
  apiCreated,
  apiPaginated,
  apiError,
  apiErrors,
  ErrorCode,
  type ResponseMeta,
} from './response';

// Request context
export { getRequestId, generateRequestId, REQUEST_ID_HEADER } from './request-context';

// Auth context (gateway-compatible)
export { requireAuthUser, requireAuthAdmin, type AuthUserContext, type AuthAdminContext, type AuthFail } from './auth-context';

// Cache headers (re-exported for convenience)
export { apiCacheHeaders, apiJson } from './cache';
