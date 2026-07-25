'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Bottom Sheet (r50 — backward compat re-export)
// ═══════════════════════════════════════════════════════════════
// ★ r50: BottomSheet ถูกแยกเป็น module เดี่ยว (mobile-only)
//   ไม่ใช่ alias ของ Window อีกต่อไป
//
//   ไฟล์นี้เป็น barrel re-export เพื่อรักษา backward compatibility
//   สำหรับ code เดิมที่ import จาก '@/components/framework/bottom-sheet'
//
//   สำหรับ code ใหม่ → import จาก '@/components/framework/sheet'
//                    หรือ '@/components/framework' (top-level barrel)
// ═══════════════════════════════════════════════════════════════

export {
  BottomSheet,
  BottomSheetCloseButton,
  useSheetDrag,
} from './sheet';
export type { BottomSheetProps, SheetSize } from './sheet';

// Backward compat: export Window/Modal/FullscreenOverlay/SidePanel ด้วย
// (code เดิมอาจ import จากไฟล์นี้)
export {
  Dialog as Modal,
  SidePanel,
  FullscreenOverlay,
  AdaptiveOverlay as Window,
  generateOverlayId,
  generateWindowId,
  useOverlayStack,
  useWindowStack,
} from './index';
export type {
  DialogProps,
  PopupSize,
  SidePanelProps,
  SidePanelSide,
  FullscreenOverlayProps,
  AdaptiveOverlayProps as WindowProps,
  OverlayType as WindowType,
} from './index';
