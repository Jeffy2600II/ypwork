'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Central Core · Pending Delete Retry
 * ═══════════════════════════════════════════════════════════════
 * "self-healing module" — ลอง retry delete request ที่อาจ fail
 * ระหว่าง navigation (เช่น user ปิด tab ก่อน fetch เสร็จ)
 *
 * ปัญหาที่แก้ (r47, E5):
 *   - ใน event-detail-client handleDelete → fire fetch DELETE แล้ว
 *     navigate ทันที (เพื่อ UX เร็ว)
 *   - ถ้า fetch ยังไม่เสร็ยบร้อยตอน page unload → request อาจหาย
 *   - ถ้า network ล้มเหลว → event ยังอยู่ใน DB แต่ user คิดว่าลบแล้ว
 *
 * วิธีแก้:
 *   - ก่อน navigate เก็บ `ypwork:pending-delete:<id>` ใน sessionStorage
 *   - ถ้า fetch สำเร็จ → ลบ pending ออก
 *   - ถ้า fetch ล้มเหลว หรือ page unload ก่อน → pending ยังอยู่
 *   - AppShell mount → ลอง retry pending deletes (เงียบๆ ใน background)
 *
 * มุมมองผู้ใช้:
 *   - ไม่ต้องทำอะไร — ระบบ "ซ่อมแซมตัวเอง" อัตโนมัติ
 *   - ถ้า retry สำเร็จ → event หายไปจาก list ตอน realtime push
 *   - ถ้า retry ล้มเหลว → log error แล้วลบ pending (กัน loop)
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';

const PENDING_PREFIX = 'ypwork:pending-delete:';
const MAX_PENDING_AGE_MS = 5 * 60 * 1000; // 5 นาที — ถ้าเก่ากว่านี้ถือว่า stale

/**
 * ลอง retry pending deletes ที่ค้างอยู่ใน sessionStorage
 *
 * Pattern:
 * ```tsx
 * // ใน AppShell หรือ root layout
 * usePendingDeleteRetry();
 * ```
 *
 * ทำงาน:
 *   - mount → สแกน sessionStorage หา `ypwork:pending-delete:*`
 *   - ลบ entries ที่เก่าเกิน MAX_PENDING_AGE_MS
 *   - ลอง DELETE แต่ละ entry ใหม่ — ถ้าสำเร็จ → ลบ entry
 *   - ถ้าล้มเหลว → เก็บไว้ retry ครั้งถัดไป (จนกว่าจะเก่าเกิน limit)
 */
export function usePendingDeleteRetry() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.sessionStorage) return;

    let cancelled = false;

    async function retryPendingDeletes() {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(PENDING_PREFIX)) keys.push(k);
      }

      const now = Date.now();

      for (const key of keys) {
        if (cancelled) return;

        // ดึง event ID จาก key
        const eventId = key.substring(PENDING_PREFIX.length);
        if (!eventId) continue;

        // ตรวจอายุ — ถ้าเก่าเกิน limit ให้ลบทิ้ง (stale)
        let timestamp: number;
        try {
          timestamp = parseInt(sessionStorage.getItem(key) || '0', 10);
        } catch {
          timestamp = 0;
        }
        if (now - timestamp > MAX_PENDING_AGE_MS) {
          try { sessionStorage.removeItem(key); } catch {}
          continue;
        }

        // ลอง retry DELETE
        try {
          const res = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
          });
          if (res.ok || res.status === 404) {
            // 200 (deleted) หรือ 404 (already deleted) — ทั้งคู่ OK
            try { sessionStorage.removeItem(key); } catch {}
          } else if (res.status === 401 || res.status === 403) {
            // ไม่มีสิทธิ์ — ลบ pending (กัน loop ไม่รู้จบ)
            // eslint-disable-next-line no-console
            console.warn('[pending-delete-retry] no permission for', eventId, '— removing');
            try { sessionStorage.removeItem(key); } catch {}
          }
          // ถ้า 5xx → เก็บไว้ retry ครั้งถัดไป
        } catch {
          // network error → เก็บไว้ retry ครั้งถัดไป
          // (จนกว่าจะเก่าเกิน MAX_PENDING_AGE_MS)
        }
      }
    }

    // รอ 2s หลัง mount ก่อน retry — กัน compete กับ initial fetch ของ page
    const timer = setTimeout(retryPendingDeletes, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
}
