'use client';

/**
 * ============================================================
 * YP WORK - Window Framework - Barrel Export (r48)
 * ============================================================
 * "Public Airlock" ของ window framework — popup/sheet infrastructure
 *
 * Files:
 *   window.tsx               - Window component (4 types: sheet/modal/fullscreen/sidepanel)
 *   bottom-sheet.tsx         - Backward compat re-export (alias for Window type="sheet")
 *   avatar.tsx               - Avatar component
 *   network-status-banner.tsx - Network status banner (offline indicator)
 *
 * Module dependencies:
 *   - lib/window-stack.ts (Zustand store for window stack)
 *   - lib/core/window-open-state.ts (reactive view of stack)
 * ============================================================
 */

export {
  Window,
  BottomSheet,
  Modal,
  FullscreenOverlay,
  SidePanel,
  BottomSheetCloseButton,
  generateWindowId,
  useWindowStack,
} from './window';
export type {
  WindowProps,
  BottomSheetProps,
  WindowSize,
  WindowSide,
  WindowType,
} from './window';
export { Avatar } from './avatar';
export { NetworkStatusBanner } from './network-status-banner';
