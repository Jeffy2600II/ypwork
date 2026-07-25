/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Core · Sheet Timing Constants (r50 — DEPRECATED, backward compat re-export)
 * ═══════════════════════════════════════════════════════════════
 * ★ r50: Timing constants ถูกรวมไว้ที่
 *   src/components/framework/shared/timing-constants.ts
 *
 *   ไฟล์นี้เป็น re-export เพื่อรักษา backward compatibility
 *   สำหรับ code เดิมที่ import จาก '@/lib/core/sheet-timing'
 *
 *   ค่าที่ export ที่นี่เป็น alias ของค่าจริงใน timing-constants.ts
 *   เพื่อรักษา interface เดิมไว้
 * ═══════════════════════════════════════════════════════════════
 */

import {
  SHEET_TIMING,
  REACT_COMMIT_DURATION as _REACT_COMMIT,
  TOAST_TIMING,
} from '@/components/framework/shared/timing-constants';

/** @deprecated ใช้ SHEET_TIMING.CLOSE_DURATION จาก '@/components/framework/shared' แทน */
export const SHEET_CLOSE_DURATION = SHEET_TIMING.CLOSE_DURATION;

/** @deprecated ใช้ REACT_COMMIT_DURATION จาก '@/components/framework/shared' แทน */
export const REACT_COMMIT_DURATION = _REACT_COMMIT;

/** @deprecated ใช้ TOAST_TIMING.AUTO_DISMISS จาก '@/components/framework/shared' แทน */
export const TOAST_AUTO_DISMISS = TOAST_TIMING.AUTO_DISMISS;

/** @deprecated ใช้ DRAG_THRESHOLDS จาก '@/components/framework/shared' แทน */
export const SCROLL_HIDE_THRESHOLD = 120;

/** @deprecated ใช้ FAB_TIMING จาก '@/components/framework/shared' แทน */
export const FAB_TRANSITION_DURATION = 200;
