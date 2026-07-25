'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Core · FAB Context (r50 — DEPRECATED, backward compat re-export)
 * ═══════════════════════════════════════════════════════════════
 * ★ r50: FAB context ถูกย้ายไปอยู่ที่
 *   src/components/framework/fab/fab-context.tsx
 *
 *   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
 *   สำหรับ code เดิมที่ import จาก '@/lib/core/fab-context'
 * ═══════════════════════════════════════════════════════════════
 */

export {
  FabProvider,
  useFabAction,
  useFabRegister,
} from '@/components/framework/fab/fab-context';
export type { FabAction } from '@/components/framework/fab/fab-context';
