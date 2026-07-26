/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Shared · Timing Constants (r50)
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth สำหรับ animation timing ทุกตัวใน framework
 *
 * หลักการ (Aerospace Software Standard — NASA/SpaceX style):
 *   - ทุก magic number ต้องประกาศที่นี่
 *   - ทุกไฟล์ต้อง import จากที่นี่ ห้าม hardcoded ตัวเลข
 *   - ค่าต้องตรงกับ CSS เป๊ะ (ใช้ data-attribute sync ถ้าจำเป็น)
 *   - แยกหมวดตามหน้าที่ เพื่อความชัดเจน
 *
 * มุมมองผู้ใช้:
 *   - การเคลื่อนไหวต้องลื่นไหล ไม่กระตุก
 *   - duration สั้นพอที่จะไม่น่าเบื่อ แต่ยาวพอที่จะเห็นชัด
 *   - easing ต้อง match กับ motion intent (enter/exit/emphasize)
 * ═══════════════════════════════════════════════════════════════
 */

// ── Sheet (mobile bottom sheet) ──
export const SHEET_TIMING = {
  /** Open animation duration (slide up from bottom) */
  OPEN_DURATION: 380,
  /** Close animation duration (slide down to bottom) — fix r50: ใช้ค่าเดียวกับ open เพื่อความสม่ำเสมอ */
  CLOSE_DURATION: 320,
  /** Snap-back spring duration (หลัง drag แล้วปล่อยไม่ถึง threshold) */
  SNAP_BACK_DURATION: 320,
  /** Drag-to-close safety timeout (กัน transitionend ไม่ firing) */
  DRAG_CLOSE_SAFETY: 420,
  /** Open delay (double rAF) เพื่อ ensure DOM commit ก่อน trigger transition */
  OPEN_TRIGGER_DELAY: 32,
} as const;

// ── Popup (desktop centered dialog) ──
export const POPUP_TIMING = {
  /** Open animation duration (scale + fade in) */
  OPEN_DURATION: 340,
  /** Close animation duration (scale + fade out) */
  CLOSE_DURATION: 240,
  /** Backdrop fade duration */
  BACKDROP_DURATION: 280,
} as const;

// ── Side Panel (desktop) ──
export const SIDEPANEL_TIMING = {
  OPEN_DURATION: 320,
  CLOSE_DURATION: 240,
} as const;

// ── FAB (floating action button) ──
export const FAB_TIMING = {
  /** Hide duration เมื่อ sheet/popup เปิด (visibility instant, opacity/transform fade) */
  HIDE_DURATION: 180,
  /** Show duration เมื่อ sheet/popup ปิด */
  SHOW_DURATION: 220,
  /** Scroll-based hide duration (velocity-aware) */
  SCROLL_HIDE_DURATION: 220,
  /** Scroll-based show duration (spring-like) */
  SCROLL_SHOW_DURATION: 280,
} as const;

// ── Bottom Nav (mobile) ──
export const NAV_TIMING = {
  /** Hide duration เมื่อ sheet เปิด */
  HIDE_DURATION: 180,
  /** Show duration เมื่อ sheet ปิด */
  SHOW_DURATION: 220,
} as const;

// ── Page transition (route change) ──
export const PAGE_TIMING = {
  ENTER_DURATION: 320,
} as const;

// ── Toast ──
export const TOAST_TIMING = {
  AUTO_DISMISS: 2400,
  ENTER_DURATION: 200,
  EXIT_DURATION: 160,
} as const;

// ── React commit duration (สำหรับ optimistic update ก่อน navigation) ──
export const REACT_COMMIT_DURATION = 50;

// ── Drag thresholds ──
export const DRAG_THRESHOLDS = {
  /**
   * ระยะ activation (px) — น้อยกว่านี้จะไม่เริ่ม drag
   * ★ r52: ยกจาก 1px → 6px
   *   1px ไวเกินไป — แค่แตะปุ่ม X แล้วนิ้วขยับ 1-2px ก็ activate drag
   *   ทำให้เกิด inline transform ที่รบกวน close animation
   *   6px เป็นค่ามาตรฐานที่ user ตั้งใจจะ drag จริง ๆ
   */
  ACTIVATION: 6,
  /** Edge resistance เมื่อ drag เกิน sheet height */
  EDGE_RESISTANCE: 0.35,
  /** ถ้า drag เกิน sheet_height * นี้ → ปิด */
  CLOSE_RATIO: 0.25,
  /** Fling velocity (px/sec) ที่จะปิด sheet แม้ drag น้อย */
  FLING_VELOCITY: 400,
  /** ถ้า fling และ drag เกิน sheet_height * นี้ → ปิด */
  FLING_CLOSE_RATIO: 0.08,
} as const;

// ── Viewport breakpoints ──
export const VIEWPORT = {
  /** Desktop popup mode: sheet จะกลายเป็น popup ที่ความกว้าง ≥ 768px */
  DESKTOP_POPUP_MIN: 768,
  /** Desktop left-rail: bottom-nav จะกลายเป็น left-rail ที่ ≥ 900px */
  DESKTOP_RAIL_MIN: 900,
} as const;
