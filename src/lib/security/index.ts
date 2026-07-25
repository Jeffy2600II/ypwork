// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · Index (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// Barrel export สำหรับ security utilities
// ═══════════════════════════════════════════════════════════════

export {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  type RateLimitOptions,
  type RateLimitResult,
} from './rate-limit';

export {
  SECURITY_HEADERS,
  securityHeadersForNextConfig,
  applySecurityHeaders,
} from './headers';

export {
  validateThaiNationalId,
  validateNationalIdInput,
  validateStudentCodeInput,
  validateEmailInput,
  validatePasswordInput,
  validateFullNameInput,
  validateUuidInput,
  validateYearInput,
  escapeHtml,
  looksLikeSqlInjection,
  type ValidationResult,
} from './validation';

export {
  maskNationalId,
  maskStudentCode,
  maskEmail,
  maskFullName,
  sanitizeForLog,
  redactPiiFromMessage,
  shortHash,
} from './pii';

export { auditLog, type AuditEvent, type AuditLogEntry } from './audit-log';

export {
  classifyNetworkError,
  isOnline,
  withRetry,
  type NetworkErrorInfo,
} from './network-error';

// ★ v3.4.0: CSRF protection
export {
  issueCsrfToken,
  validateCsrfToken,
  isMutationMethod,
} from './csrf';
