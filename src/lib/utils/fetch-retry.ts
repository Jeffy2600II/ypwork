'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Fetch with Retry (v3.6.0)
// ═══════════════════════════════════════════════════════════════
// Wrapper สำหรับ fetch ที่มี retry logic + exponential backoff
// ใช้สำหรับ critical API calls ที่ต้องการความเสถียรสูง
//
// ★ คุณสมบัติ:
//   - Auto retry บน network error หรือ 5xx (สูงสุด 3 ครั้ง)
//   - Exponential backoff (500ms → 1000ms → 2000ms)
//   - ไม่ retry บน 4xx (client error — ควรแสดง error ทันที)
//   - ไม่ retry บน 429 (rate limited — รอตาม Retry-After header)
//   - Timeout 10 วินาที (กัน hang 无限)
//   - ใช้ AbortController สำหรับ cancellation
//
// ★ Usage:
//   import { fetchWithRetry } from '@/lib/utils/fetch-retry';
//   const res = await fetchWithRetry('/api/events', { method: 'POST', ... });
// ═══════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 10000; // 10 วินาที
const DEFAULT_RETRIES = 3;
const BACKOFF_BASE = 500; // เริ่มที่ 500ms

interface FetchWithRetryOptions extends RequestInit {
  /** จำนวน retry สูงสุด (default: 3) */
  retries?: number;
  /** timeout ในมิลลิวินาที (default: 10000) */
  timeoutMs?: number;
  /** ฟังก์ชันเรียกก่อน retry — ส่ง backoff ที่จะรอ */
  onRetry?: (attempt: number, backoffMs: number) => void;
}

/**
 * Sleep ที่รองรับ cancellation ผ่าน AbortSignal
 */
function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/**
 * ตรวจสอบว่า error ควร retry หรือไม่
 */
function shouldRetry(err: any, status?: number): boolean {
  // AbortError / timeout → retry
  if (err?.name === 'AbortError') return true;
  // Network error (Failed to fetch) → retry
  if (err?.message?.includes('Failed to fetch')) return true;
  if (err?.message?.includes('NetworkError')) return true;
  // 5xx server error → retry
  if (status && status >= 500) return true;
  // 4xx client error → ไม่ retry
  if (status && status >= 400 && status < 500) return false;
  // 429 rate limited → ไม่ retry (รอตาม Retry-After)
  if (status === 429) return false;
  // Default: retry
  return true;
}

/**
 * fetch พร้อม retry + timeout
 */
export async function fetchWithRetry(
  input: string | URL,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT,
    onRetry,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  let lastError: any;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // สร้าง AbortController สำหรับ timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // ถ้ามี external signal ให้ link เข้าด้วย
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    try {
      const res = await fetch(input, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // ถ้า response สำเร็จ หรือเป็น 4xx → ไม่ retry
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }

      // 5xx → retry ถ้ายังมี attempts เหลือ
      lastResponse = res;
      lastError = new Error(`HTTP ${res.status}`);

      if (attempt < retries && shouldRetry(lastError, res.status)) {
        const backoff = BACKOFF_BASE * Math.pow(2, attempt);
        onRetry?.(attempt + 1, backoff);
        await sleep(backoff, externalSignal);
        continue;
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      lastResponse = undefined;

      if (attempt < retries && shouldRetry(err)) {
        const backoff = BACKOFF_BASE * Math.pow(2, attempt);
        onRetry?.(attempt + 1, backoff);
        try {
          await sleep(backoff, externalSignal);
          continue;
        } catch {
          // Aborted during sleep
          throw err;
        }
      }

      throw err;
    }
  }

  // ถ้า retry หมดแล้วและมี response → ส่ง response กลับ
  if (lastResponse) return lastResponse;
  throw lastError;
}
