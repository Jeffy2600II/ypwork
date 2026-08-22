// Barrel export for API boundary layer
export { apiCacheHeaders, apiJson } from './cache';
export {
  type ApiErrorCode,
  ApiError,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  internalError,
  rateLimited,
} from './errors';
export { apiSuccess, apiErrorResponse } from './response';
export {
  withAuth,
  withAdmin,
  withPublic,
  type AuthContext,
} from './handler';
