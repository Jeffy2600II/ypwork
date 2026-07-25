/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Shared · Public Airlock (r50)
 * ═══════════════════════════════════════════════════════════════
 * Barrel export สำหรับ shared framework utilities
 *
 * ใช้โดย: sheet/, popup/, adaptive/, fab/ และ app-shell
 *
 * ห้าม import ไฟล์ภายในโดยตรง — ให้ import ผ่าน barrel นี้เท่านั้น
 * ═══════════════════════════════════════════════════════════════
 */

// ── Timing constants (single source of truth) ──
export {
  SHEET_TIMING,
  POPUP_TIMING,
  SIDEPANEL_TIMING,
  FAB_TIMING,
  NAV_TIMING,
  PAGE_TIMING,
  TOAST_TIMING,
  REACT_COMMIT_DURATION,
  DRAG_THRESHOLDS,
  VIEWPORT,
} from './timing-constants';

// ── Scroll lock (no-warp) ──
export {
  lockScroll,
  unlockScroll,
  getSavedScrollY,
  isScrollLocked,
  getScrollLockCount,
} from './scroll-lock';

// ── Overlay stack (Zustand store) ──
export {
  useOverlayStack,
  generateOverlayId,
  // backward compat
  useWindowStack,
  generateWindowId,
} from './overlay-stack';
export type {
  OverlayType,
  OverlayEntry,
  WindowType,
  WindowEntry,
} from './overlay-stack';

// ── Reactive overlay state hooks ──
export {
  useIsOverlayOpen,
  useIsSheetOpen,
  useIsPopupOpen,
  isOverlayOpenRightNow,
  isSheetOpenRightNow,
  onOverlayOpenChange,
  onSheetOpenChange,
  // backward compat
  useIsWindowOpen,
  isWindowOpenRightNow,
  onWindowOpenChange,
} from './use-overlay-state';
