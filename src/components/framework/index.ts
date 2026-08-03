'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Public Airlock (r50)
 * ═══════════════════════════════════════════════════════════════
 * Top-level barrel export สำหรับทั้ง framework system
 *
 *★ r50: โครงสร้างใหม่แยกตามหน้าที่ชัดเจน (aerospace-grade modular)
 *
 *   framework/
 *   ├── shared/      → utilities ร่วม (overlay stack, scroll lock, timing)
 *   ├── sheet/       → mobile bottom sheet (slide + drag-to-dismiss)
 *   ├── popup/       → desktop centered dialog + side panel + fullscreen
 *   ├── adaptive/    → smart wrapper เลือก sheet หรือ popup ตาม viewport
 *   ├── fab/         → floating action button system
 *   ├── avatar.tsx   → avatar component
 *   └── network-status-banner.tsx → offline indicator
 *
 * หลักการ (NASA/SpaceX style):
 *   - "Public Airlock" pattern: code ภายนอก import ผ่าน barrel เท่านั้น
 *   - Single Responsibility: แต่ละ module ทำงานอย่างเดียวให้ดีที่สุด
 *   - Fault Isolation: module หนึ่งล้มเหลว ไม่ทำลายทั้งระบบ
 *   - Backward Compat: alias เก่า (BottomSheet/Modal/Window) ยังใช้ได้
 * ═══════════════════════════════════════════════════════════════
 */

// ── Shared (utilities) ──
export {
  // Timing constants
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
  // Scroll lock
  lockScroll,
  unlockScroll,
  getSavedScrollY,
  isScrollLocked,
  getScrollLockCount,
  // Overlay stack
  useOverlayStack,
  generateOverlayId,
  useWindowStack,
  generateWindowId,
  // Reactive overlay state
  useIsOverlayOpen,
  useIsSheetOpen,
  useIsPopupOpen,
  isOverlayOpenRightNow,
  isSheetOpenRightNow,
  onOverlayOpenChange,
  onSheetOpenChange,
  useIsWindowOpen,
  isWindowOpenRightNow,
  onWindowOpenChange,
} from './shared';
export type {
  OverlayType,
  OverlayEntry,
  WindowType,
  WindowEntry,
} from './shared';

// ── Sheet (mobile bottom sheet) ──
export {
  BottomSheet,
  BottomSheetCloseButton,
  useSheetDrag,
} from './sheet';
export type { BottomSheetProps, SheetSize } from './sheet';

// ── Popup (desktop dialog) ──
export {
  Dialog,
  Modal,
  SidePanel,
  FullscreenOverlay,
} from './popup';
export type {
  DialogProps,
  PopupSize,
  SidePanelProps,
  SidePanelSide,
  FullscreenOverlayProps,
} from './popup';

// ── Adaptive (smart wrapper) ──
export {
  AdaptiveOverlay,
  useViewport,
  useIsDesktop,
} from './adaptive';
export type {
  AdaptiveOverlayProps,
  ViewportState,
} from './adaptive';

// ── FAB system ──
export {
  FabProvider,
  useFabAction,
  useFabRegister,
  useScrollDirection,
} from './fab';
export type {
  FabAction,
  UseScrollDirectionOptions,
} from './fab';

// ── Auth components (r52) ──
export { PasswordField } from './auth';
export type { PasswordFieldProps } from './auth';

// ── Standalone components ──
export { Avatar } from './avatar';
export { NetworkStatusBanner } from './network-status-banner';

// ═══════════════════════════════════════════════════════════════
// Backward compatibility (r49 → r50)
// ═══════════════════════════════════════════════════════════════
// r49 มี Window component ที่รวม sheet/modal/fullscreen/sidepanel ไว้ในไฟล์เดียว
// r50 แยกออกเป็น BottomSheet + Dialog + SidePanel + FullscreenOverlay
//
// เพื่อรักษา backward compat สำหรับ code เดิมที่ import Window:
//   - Window component ใหม่ = AdaptiveOverlay (smart wrapper)
//   - ใช้ type prop เพื่อ force type ใด type หนึ่ง (ถ้าต้องการ)
//
// Code ใหม่ควร import ตรง:
//   - BottomSheet (mobile-only)
//   - Dialog (desktop-only)
//   - AdaptiveOverlay (auto-pick)
// ═══════════════════════════════════════════════════════════════

export { AdaptiveOverlay as Window } from './adaptive';
export type { AdaptiveOverlayProps as WindowProps } from './adaptive';
