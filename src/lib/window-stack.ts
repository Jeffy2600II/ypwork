'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Window Stack (r50 — DEPRECATED, backward compat re-export)
// ═══════════════════════════════════════════════════════════════
// ★ r50: Stack manager ถูกย้ายไปอยู่ที่
//   src/components/framework/shared/overlay-stack.ts
//
//   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
//   สำหรับ code เดิมที่ import จาก '@/lib/window-stack'
//
//   สำหรับ code ใหม่ → import จาก '@/components/framework/shared'
//                    หรือ '@/components/framework' (top-level barrel)
// ═══════════════════════════════════════════════════════════════

export {
  useOverlayStack as useWindowStack,
  generateOverlayId as generateWindowId,
} from '@/components/framework/shared/overlay-stack';
export type {
  OverlayType as WindowType,
  OverlayEntry as WindowEntry,
} from '@/components/framework/shared/overlay-stack';
