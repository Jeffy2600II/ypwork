'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Window (r50 — DEPRECATED, backward compat only)
// ═══════════════════════════════════════════════════════════════
// ★ r50: Window component ถูกแทนที่ด้วยระบบแยกส่วน:
//   - BottomSheet (mobile bottom sheet)
//   - Dialog (desktop centered modal)
//   - SidePanel (desktop slide-in panel)
//   - FullscreenOverlay (full-page overlay)
//   - AdaptiveOverlay (smart wrapper เลือก sheet/popup อัตโนมัติ)
//
//   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
//   สำหรับ code เดิมที่ import จาก '@/components/framework/window'
//
//   สำหรับ code ใหม่ → import จาก '@/components/framework' แทน
// ═══════════════════════════════════════════════════════════════

export {
  BottomSheet,
  BottomSheetCloseButton,
  Dialog as Modal,
  FullscreenOverlay,
  SidePanel,
  AdaptiveOverlay as Window,
  generateOverlayId,
  generateWindowId,
  useOverlayStack,
  useWindowStack,
} from './index';
export type {
  BottomSheetProps,
  DialogProps as ModalProps,
  PopupSize,
  SidePanelSide as WindowSide,
  AdaptiveOverlayProps as WindowProps,
  SheetSize as WindowSize,
  OverlayType as WindowType,
} from './index';
