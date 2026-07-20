'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Bottom Sheet (v3.1.0 — re-export จาก Window Framework)
// ═══════════════════════════════════════════════════════════════
// v3.1.0: BottomSheet ถูกยกเลิกการเป็น component เดี่ยวๆ และกลายเป็น
// ส่วนหนึ่งของ Window Framework ที่รองรับ sheet/modal/fullscreen/sidepanel
// รวมถึง nested popups (เปิดซ้อนกันได้)
//
// ไฟล์นี้เป็น barrel re-export เพื่อรักษา backward compatibility
// สำหรับ code เดิมที่ import จาก '@/components/framework/bottom-sheet'
//
// สำหรับ code ใหม่ → import จาก '@/components/framework/window' แทน
// ═══════════════════════════════════════════════════════════════

export {
  BottomSheet,
  BottomSheetCloseButton,
  Modal,
  FullscreenOverlay,
  SidePanel,
  Window,
  generateWindowId,
  useWindowStack,
} from './window';
export type {
  BottomSheetProps,
  WindowProps,
  WindowSize,
  WindowSide,
  WindowType,
} from './window';
