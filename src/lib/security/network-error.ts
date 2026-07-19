// ═══════════════════════════════════════════════════════════════
// YP WORK · Network Error Handler (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// จัดการ network error ที่อาจเกิดขึ้นจาก:
//   - fetch ล้มเหลว (offline, server down)
//   - rate limit (HTTP 429)
//   - server error (HTTP 5xx)
//   - timeout
//
// แปลง error ให้เป็น message ภาษาไทยที่ user เข้าใจ
// พร้อม action ที่ user ทำได้ต่อ (ลองใหม่ / ติดต่อผู้ดูแล)
// ═══════════════════════════════════════════════════════════════

export interface NetworkErrorInfo {
  /** ประเภท error */
  type: 'offline' | 'rate_limited' | 'server_error' | 'timeout' | 'unknown';
  /** ข้อความภาษาไทยที่ user เข้าใจ */
  message: string;
  /** action ที่แนะนำ */
  action?: 'retry' | 'wait' | 'contact_admin';
}

/**
 * แปลง fetch error เป็น NetworkErrorInfo ที่ user เข้าใจ
 */
export function classifyNetworkError(err: any, responseStatus?: number): NetworkErrorInfo {
  // Rate limited (HTTP 429)
  if (responseStatus === 429) {
    return {
      type: 'rate_limited',
      message: 'ลงทะเบียนบ่อยเกินไป — กรุณารอสักครู่แล้วลองใหม่',
      action: 'wait',
    };
  }

  // Server error (HTTP 5xx)
  if (responseStatus && responseStatus >= 500) {
    return {
      type: 'server_error',
      message: 'เซิร์ฟเวอร์มีปัญหา — กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลหากยังไม่ได้',
      action: 'retry',
    };
  }

  // Network error (offline, DNS failure, CORS, etc.)
  const errMsg = err?.message || String(err || '');
  if (
    errMsg.includes('Failed to fetch') ||
    errMsg.includes('NetworkError') ||
    errMsg.includes('network') ||
    errMsg.includes('ERR_INTERNET_DISCONNECTED') ||
    errMsg.includes('ERR_NAME_NOT_RESOLVED')
  ) {
    return {
      type: 'offline',
      message: 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
      action: 'retry',
    };
  }

  // Timeout
  if (errMsg.includes('timeout') || errMsg.includes('aborted')) {
    return {
      type: 'timeout',
      message: 'การเชื่อมต่อใช้เวลานานเกินไป — กรุณาลองใหม่อีกครั้ง',
      action: 'retry',
    };
  }

  return {
    type: 'unknown',
    message: 'เกิดข้อผิดพลาดที่ไม่คาดคิด — กรุณาลองใหม่',
    action: 'retry',
  };
}

/**
 * ตรวจสอบสถานะออนไลน์ของ browser
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * ฟังก์ชัน retry สำหรับเรียกใช้ซ้ำเมื่อ fail
 * ใช้ exponential backoff: 1s, 2s, 4s, 8s (max 3 retries)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 1000;

  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) break;

      // ไม่ retry ถ้าเป็น 4xx error (ยกเว้น 429)
      const errStatus = (err as any)?.status;
      if (errStatus && errStatus >= 400 && errStatus < 500 && errStatus !== 429) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}
