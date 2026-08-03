// ═══════════════════════════════════════════════════════════════
// YP WORK · Session Cache Utility (v3.9.9)
// ═══════════════════════════════════════════════════════════════
// ★ v3.9.9: Client-side sessionStorage cache สำหรับเก็บข้อมูลชั่วคราว
//   เพื่อลดการโหลดข้อมูลซ้ำจาก server เมื่อ user สลับหน้าไป-กลับ
//
// หลักการ:
//   - เก็บข้อมูลที่ฝั่งผู้ใช้ (browser sessionStorage) — ไม่ใช่ CDN
//   - อยู่เฉพาะใน session ปัจจุบัน (ปิด tab หาย)
//   - เมื่อกลับเข้าหน้าเดิม → ใช้ cache เป็น initial state (instant render)
//   - จากนั้น server จะ reload ข้อมูลล่าสุด + realtime subscription อัพเดตต่อ
//   - ข้อมูลยังคง realtime — cache แค่ช่วย render ระหว่างรอ fetch
//
// Cache key format:
//   ypwork:cache:v{VERSION}:{KEY}
//   - VERSION = cache schema version (เปลี่ยนเมื่อ structure ข้อมูลเปลี่ยน)
//   - KEY = ชื่อ cache entry (เช่น "events", "event:abc123")
//
// Cache entry shape:
//   { ts: number, data: T }
//   - ts = timestamp ตอนเขียน (สำหรับ TTL check ถ้าต้องการ)
// ═══════════════════════════════════════════════════════════════

'use client';

import * as React from 'react';

/** Cache schema version — เปลี่ยนเมื่อ structure ของ cached data เปลี่ยน */
const CACHE_VERSION = 1;

/** TTL ใน milliseconds (5 นาที — cache หมดอายุหลัง 5 นาที) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** สร้าง cache key แบบมี version prefix */
function buildKey(key: string): string {
  return `ypwork:cache:v${CACHE_VERSION}:${key}`;
}

/**
 * อ่านข้อมูลจาก sessionStorage cache
 * @param key cache key (ไม่รวม version prefix)
 * @returns cached data หรือ null ถ้าไม่มี / หมดอายุ / error
 */
export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(buildKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    // TTL check — ถ้าเก่าเกิน CACHE_TTL_MS ให้ถือว่าหมดอายุ
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(buildKey(key));
      return null;
    }
    return parsed.data;
  } catch {
    // sessionStorage อาจไม่พร้อมใช้งาน (private mode, quota exceeded, etc.)
    return null;
  }
}

/**
 * เขียนข้อมูลลง sessionStorage cache
 * @param key cache key (ไม่รวม version prefix)
 * @param data ข้อมูลที่จะเก็บ
 */
export function setCached<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry = { ts: Date.now(), data };
    window.sessionStorage.setItem(buildKey(key), JSON.stringify(entry));
  } catch {
    // quota exceeded หรือ sessionStorage ไม่พร้อม — ข้ามไป
    // (cache แค่ nice-to-have ไม่ใช่ critical)
  }
}

/**
 * ล้าง cache entry เดียว
 */
export function clearCached(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(buildKey(key));
  } catch {
    // ignore
  }
}

/**
 * ล้าง cache ทั้งหมดของ YP Work (เก็บไว้ใช้ตอน logout)
 * ล้างเฉพาะ key ที่ขึ้นต้นด้วย "ypwork:cache:" เท่านั้น
 * เพื่อไม่ให้กระทบข้อมูลอื่นใน sessionStorage (เช่น pending session)
 */
export function clearAllYPWorkCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const prefix = `ypwork:cache:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Hook: อ่าน cache ครั้งเดียวตอน mount (สำหรับ initial state)
 * ใช้ใน React component เพื่อ restore cached data เป็น initial state
 *
 * ใช้ lazy initializer ของ useState — ทำงานครั้งเดียวตอน mount เท่านั้น
 * ไม่ re-read ทุก render
 *
 * @param key cache key
 * @param fallback ค่าเริ่มต้นถ้าไม่มี cache
 * @returns cached data หรือ fallback
 */
export function useCachedInitialState<T>(
  key: string,
  fallback: T
): T {
  // useState with lazy initializer — reads cache once on mount
  const [value] = React.useState(() => getCached<T>(key) ?? fallback);
  return value;
}
