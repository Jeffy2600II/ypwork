'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Core · Scroll Lock (r50 — DEPRECATED, backward compat re-export)
 * ═══════════════════════════════════════════════════════════════
 * ★ r50: Scroll lock ถูกย้ายไปอยู่ที่
 *   src/components/framework/shared/scroll-lock.ts
 *
 *   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
 *   สำหรับ code เดิมที่ import จาก '@/lib/core/scroll-lock'
 * ═══════════════════════════════════════════════════════════════
 */

export {
  lockScroll,
  unlockScroll,
  getSavedScrollY,
  isScrollLocked,
  getScrollLockCount,
} from '@/components/framework/shared/scroll-lock';
