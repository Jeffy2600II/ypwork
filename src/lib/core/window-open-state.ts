'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Central Core · Window-Open State (r48)
 * ═══════════════════════════════════════════════════════════════
 * "docking port" สำหรับบอกว่า ณ ตอนนี้มี Window/Sheet เปิดอยู่หรือไม่
 *
 * ปัญหาที่แก้ (r48, Bug #1 — FAB flash):
 *   - ก่อนหน้านี้ useScrollDirection ไม่รู้ว่ามี window เปิดอยู่
 *   - เมื่อ bottom sheet เปิด → lockScroll ทำให้ body เป็น position:fixed
 *     → window.scrollY กลายเป็น 0 → useScrollDirection ตั้ง fabHidden=false
 *   - เมื่อ sheet ปิด → body.yp-window-open ถูกลบ → FAB แสดง (flash)
 *     ก่อนที่ scroll event ถัดไปจะ set fabHidden=true ใหม่
 *
 * หลักการแก้:
 *   - Window Stack Manager (lib/window-stack.ts) จัดการ stack อยู่แล้ว
 *     และ sync body.yp-window-open class
 *   - Hook นี้เป็น "reactive view" ของ stack สำหรับ component ที่ต้องการ
 *     รู้สถานะแบบ reactive (เช่น useScrollDirection, AppShell)
 *   - ไม่ต้อง poll — subscribe ผ่าน Zustand selector
 *
 * มุมมองผู้ใช้:
 *   - ถ้า FAB ซ่อนอยู่ (เลื่อนลง) → ต้องซ่อนตลอด แม้จะเปิด/ปิด sheet
 *   - ไม่ควรมี "แวบ" ใดๆ เกิดขึ้น
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';
import { useWindowStack } from '@/lib/window-stack';

/**
 * Hook ที่บอกว่า ณ ตอนนี้มี Window/Sheet เปิดอยู่ในระบบหรือไม่
 *
 * ใช้สำหรับ:
 *   - useScrollDirection: ปิด scroll listener ขณะ window เปิด
 *   - AppShell: ปิด FAB visibility tracking ขณะ window เปิด
 *   - อนาคต: ปิด keyboard shortcuts, analytics tracking, ฯลฯ
 *
 * @returns true ถ้ามี window อย่างน้อย 1 ตัวเปิดอยู่
 */
export function useIsWindowOpen(): boolean {
  return useWindowStack((s) => s.stack.length > 0);
}

/**
 * ตรวจสอบแบบ non-reactive ว่าตอนนี้มี window เปิดอยู่ไหม
 * ใช้ใน situations ที่ไม่สามารถใช้ hook ได้ (เช่น ใน event handler)
 */
export function isWindowOpenRightNow(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains('yp-window-open');
}

/**
 * Subscribe ไปยัง window-open state changes (สำหรับ module ที่ไม่ใช่ React)
 * คืนค่า unsubscribe function
 *
 * @example
 * const unsub = onWindowOpenChange((isOpen) => {
 *   console.log('window open:', isOpen);
 * });
 * // ... later
 * unsub();
 */
export function onWindowOpenChange(
  callback: (isOpen: boolean) => void,
): () => void {
  let lastOpen = isWindowOpenRightNow();
  // Zustand subscribe fires on every stack change
  return useWindowStack.subscribe((state) => {
    const nowOpen = state.stack.length > 0;
    if (nowOpen !== lastOpen) {
      lastOpen = nowOpen;
      callback(nowOpen);
    }
  });
}
