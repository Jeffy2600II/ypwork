'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Core · Window-Open State (r50 — DEPRECATED, backward compat re-export)
 * ═══════════════════════════════════════════════════════════════
 * ★ r50: Reactive overlay state ถูกย้ายไปอยู่ที่
 *   src/components/framework/shared/use-overlay-state.ts
 *
 *   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
 *   สำหรับ code เดิมที่ import จาก '@/lib/core/window-open-state'
 * ═══════════════════════════════════════════════════════════════
 */

export {
  useIsOverlayOpen as useIsWindowOpen,
  useIsSheetOpen,
  useIsPopupOpen,
  isOverlayOpenRightNow as isWindowOpenRightNow,
  isSheetOpenRightNow,
  onOverlayOpenChange as onWindowOpenChange,
  onSheetOpenChange,
} from '@/components/framework/shared/use-overlay-state';
