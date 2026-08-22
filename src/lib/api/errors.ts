// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Error Codes & ApiError (Round 22)
// ═══════════════════════════════════════════════════════════════
// Standardized error types for API responses.
// Every API error flows through ApiError → response envelope.
// ═══════════════════════════════════════════════════════════════

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const unauthorized = (msg = 'ไม่ได้เข้าสู่ระบบ') =>
  new ApiError('UNAUTHORIZED', msg, 401);

export const forbidden = (msg = 'ไม่มีสิทธิ์เข้าถึง') =>
  new ApiError('FORBIDDEN', msg, 403);

export const notFound = (msg = 'ไม่พบข้อมูล') =>
  new ApiError('NOT_FOUND', msg, 404);

export const validationError = (msg: string, details?: Record<string, any>) =>
  new ApiError('VALIDATION_ERROR', msg, 400, details);

export const internalError = (msg = 'เกิดข้อผิดพลาดภายในระบบ') =>
  new ApiError('INTERNAL_ERROR', msg, 500);

export const rateLimited = (msg = 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่') =>
  new ApiError('RATE_LIMITED', msg, 429);
