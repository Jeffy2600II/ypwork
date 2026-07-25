'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · useScrollDirection (r50 — DEPRECATED, backward compat re-export)
// ═══════════════════════════════════════════════════════════════
// ★ r50: Hook ถูกย้ายไปอยู่ที่
//   src/components/framework/fab/use-scroll-direction.ts
//
//   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
//   สำหรับ code เดิมที่ import จาก '@/lib/hooks/use-scroll-direction'
//
//   สำหรับ code ใหม่ → import จาก '@/components/framework/fab'
//                    หรือ '@/components/framework' (top-level barrel)
// ═══════════════════════════════════════════════════════════════

export {
  useScrollDirection,
} from '@/components/framework/fab/use-scroll-direction';
export type {
  UseScrollDirectionOptions,
} from '@/components/framework/fab/use-scroll-direction';
