/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Central Core · Sheet Timing Constants
 * ═══════════════════════════════════════════════════════════════
 * "docking port" มาตรฐานสำหรับ sheet/window animation timing
 *
 * ปัญหาที่แก้ (รอบ 47):
 *   ก่อนหน้านี้ magic numbers 280ms / 50ms / 2400ms กระจัดกระจาย
 *   ใน event-detail-client.tsx (4 จุด) และ today-client.tsx
 *   หาก CSS transition duration เปลี่ยน → bug ทันที เพราะไม่มี source of truth
 *
 * หลักการ:
 *   - ทุกค่า timing ที่ผูกกับ CSS ต้องประกาศที่นี่เป็น single source of truth
 *   - เลียนแบบแนวคิด "space station" — ทุก module มาต่อที่ docking port เดียวกัน
 *   - ห้าม hardcode ตัวเลข timing ใน component — ต้อง import จากที่นี่เสมอ
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Duration ที่ BottomSheet/Window ใช้สำหรับ close animation
 * ต้องตรงกับค่าใน CSS (transition-duration ของ .yp-sheet, .yp-window)
 *
 * ใช้เมื่อ: เปิด sheet ใหม่หลังจากปิด sheet เดิม — ต้องรอให้ animation
 * ปิดเสร็จก่อน ไม่งั้นจะเห็น 2 sheets ซ้อนกัน
 *
 * Pattern: `setTimeout(() => setOpen(true), SHEET_CLOSE_DURATION)`
 */
export const SHEET_CLOSE_DURATION = 280 as const;

/**
 * Duration สำหรับ React state ไปออกมาที่ DOM ก่อน navigation
 *
 * ใช้เมื่อ: ต้องการให้ React commit state ก่อนแล้วค่อย navigate
 * (เช่น optimistic update ก่อนไป /events ใหม่)
 *
 * Pattern: `setTimeout(() => window.location.href = '...', REACT_COMMIT_DURATION)`
 */
export const REACT_COMMIT_DURATION = 50 as const;

/**
 * Auto-dismiss duration สำหรับ inline toast (แบบ setToast + setTimeout)
 *
 * ใช้เมื่อ: today-client / event-detail-client แสดง toast แล้ว auto-dismiss
 *
 * Pattern: `setTimeout(() => setToast(null), TOAST_AUTO_DISMISS)`
 */
export const TOAST_AUTO_DISMISS = 2400 as const;

/**
 * Scroll velocity threshold (px) ที่ใช้ใน useScrollDirection
 * หาก scroll ลงมากกว่านี้ภายใน 1 frame จะซ่อน FAB
 */
export const SCROLL_HIDE_THRESHOLD = 120 as const;

/**
 * FAB show/hide transition duration (ต้องตรงกับ CSS)
 */
export const FAB_TRANSITION_DURATION = 200 as const;
