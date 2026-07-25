'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Shared · Overlay State Hook (r50)
 * ═══════════════════════════════════════════════════════════════
 * Reactive view ของ overlay stack สำหรับ component ที่ต้องการรู้
 * ว่า ณ ตอนนี้มี overlay เปิดอยู่ไหม
 *
 * ใช้สำหรับ:
 *   - FAB: ซ่อนเมื่อมี overlay เปิด (reactive)
 *   - Bottom nav: ซ่อนเมื่อมี sheet เปิด (reactive)
 *   - useScrollDirection: ปิด scroll listener ขณะ overlay เปิด
 *   - อนาคต: ปิด keyboard shortcuts, analytics, ฯลฯ
 *
 *★ r50: เพิ่ม useIsSheetOpen() และ useIsPopupOpen() แยกจาก useIsOverlayOpen()
 *       เพื่อให้ FAB/nav ตอบสนองต่างกัน (sheet ซ่อนทั้งคู่, popup ซ่อนแค่ FAB)
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';
import { useOverlayStack } from './overlay-stack';

/**
 * Hook ที่บอกว่า ณ ตอนนี้มี overlay เปิดอยู่ในระบบหรือไม่ (ทุกประเภท)
 */
export function useIsOverlayOpen(): boolean {
  return useOverlayStack((s) => s.stack.length > 0);
}

/**
 * Hook ที่บอกว่า มี sheet หรือ fullscreen เปิดอยู่ไหม
 * (ใช้สำหรับซ่อน bottom-nav — sheet บนมือถือต้องซ่อนแถบนำทาง)
 */
export function useIsSheetOpen(): boolean {
  return useOverlayStack((s) =>
    s.stack.some((w) => w.type === 'sheet' || w.type === 'fullscreen')
  );
}

/**
 * Hook ที่บอกว่า มี popup หรือ sidepanel เปิดอยู่ไหม
 * (desktop — ไม่จำเป็นต้องซ่อน bottom-nav เพราะเป็น left-rail)
 */
export function useIsPopupOpen(): boolean {
  return useOverlayStack((s) =>
    s.stack.some((w) => w.type === 'popup' || w.type === 'sidepanel')
  );
}

/**
 * ตรวจสอบแบบ non-reactive ว่าตอนนี้มี overlay เปิดอยู่ไหม
 * ใช้ใน situations ที่ไม่สามารถใช้ hook ได้ (เช่น event handler)
 */
export function isOverlayOpenRightNow(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains('yp-overlay-open');
}

/**
 * ตรวจสอบแบบ non-reactive ว่ามี sheet เปิดอยู่ไหม
 */
export function isSheetOpenRightNow(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains('yp-overlay-open--sheet');
}

/**
 * Subscribe ไปยัง overlay-open state changes (สำหรับ module ที่ไม่ใช่ React)
 * คืนค่า unsubscribe function
 */
export function onOverlayOpenChange(
  callback: (isOpen: boolean) => void,
): () => void {
  let lastOpen = isOverlayOpenRightNow();
  return useOverlayStack.subscribe((state) => {
    const nowOpen = state.stack.length > 0;
    if (nowOpen !== lastOpen) {
      lastOpen = nowOpen;
      callback(nowOpen);
    }
  });
}

/**
 * Subscribe เฉพาะ sheet-open state changes
 */
export function onSheetOpenChange(
  callback: (isOpen: boolean) => void,
): () => void {
  let lastOpen = isSheetOpenRightNow();
  return useOverlayStack.subscribe((state) => {
    const nowOpen = state.stack.some(
      (w) => w.type === 'sheet' || w.type === 'fullscreen'
    );
    if (nowOpen !== lastOpen) {
      lastOpen = nowOpen;
      callback(nowOpen);
    }
  });
}

// ── Backward compatibility ──
export const useIsWindowOpen = useIsOverlayOpen;
export const isWindowOpenRightNow = isOverlayOpenRightNow;
export const onWindowOpenChange = onOverlayOpenChange;
