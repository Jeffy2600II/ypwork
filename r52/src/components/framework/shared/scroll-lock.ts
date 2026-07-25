'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Shared · Scroll Lock (r50)
 * ═══════════════════════════════════════════════════════════════
 * No-warp scroll lock — ไม่ทำให้หน้าเว็บกระตุกหรือวาร์ปตอน sheet ปิด
 *
 * หลักการ (Aerospace Software Standard):
 *   - ใช้ overflow:hidden บน <html> เท่านั้น ไม่ touch body position
 *   - count-based lock รองรับ nested overlays (sheet เปิดซ้อน sheet)
 *   - บันทีก scroll position ไว้ แต่ไม่ย้าย body
 *   - เพิ่ม padding-right กัน content reflow เมื่อ scrollbar หาย
 *
 * มุมมองผู้ใช้:
 *   - ตอน sheet เปิด: หน้าเว็บด้านหลังหยุด scroll ได้
 *   - ตอน sheet ปิด: หน้าเว็บยังอยู่ที่เดิม ไม่กระตุก
 *   - ทุกอย่างลื่นไหล ไม่มี jump หรือ warp
 * ═══════════════════════════════════════════════════════════════
 */

const SCROLL_LOCK_DATA_ATTR = 'data-yp-scroll-locked';
const SCROLL_LOCK_PADDING_ATTR = 'data-yp-scroll-lock-padding';

let _lockCount = 0;
let _savedScrollY = 0;
let _savedScrollX = 0;
let _savedHtmlOverflowY = '';
let _savedHtmlOverflowX = '';
let _savedHtmlPaddingRight = '';

/**
 * Lock scroll โดยไม่ทำให้เกิด layout shift
 * - ใช้ overflow:hidden บน <html> เท่านั้น
 * - ไม่ touch body position — กัน bottom-nav/FAB เคลื่อนที่
 * - เพิ่ม padding-right บน <html> เท่ากับ scrollbar width เพื่อกัน reflow
 *
 * Count-based: ถ้าเรียกซ้อนกัน (nested) จะนับ count และ unlock ตอน count=0 เท่านั้น
 */
export function lockScroll(): void {
  if (typeof window === 'undefined') return;
  if (typeof document === 'undefined') return;

  _lockCount++;
  if (_lockCount !== 1) return; // already locked — เก็บ count ไว้สำหรับ nested

  const html = document.documentElement;
  const body = document.body;

  // บันทึก state เดิมไว้
  _savedScrollY = window.scrollY || window.pageYOffset || 0;
  _savedScrollX = window.scrollX || window.pageXOffset || 0;
  _savedHtmlOverflowY = html.style.overflowY;
  _savedHtmlOverflowX = html.style.overflowX;
  _savedHtmlPaddingRight = html.style.paddingRight;

  // คำนวณ scrollbar width
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  // ล็อค scroll ผ่าน overflow:hidden บน html (ไม่ touch body)
  html.style.overflowY = 'hidden';
  html.style.overflowX = 'hidden';
  html.style.overscrollBehavior = 'none';

  // เพิ่ม padding-right กัน content ขยายออกด้านขวาเมื่อ scrollbar หาย
  if (scrollbarWidth > 0) {
    const currentPaddingRight = html.style.paddingRight;
    const currentPad = currentPaddingRight
      ? parseFloat(currentPaddingRight) || 0
      : 0;
    html.style.paddingRight = currentPad + scrollbarWidth + 'px';
    html.setAttribute(SCROLL_LOCK_PADDING_ATTR, scrollbarWidth + 'px');
  }

  html.setAttribute(SCROLL_LOCK_DATA_ATTR, 'true');

  // body — ป้องกัน overscroll-behavior เผื่อมี nested scroll context
  body.style.overscrollBehavior = 'none';
}

/**
 * Unlock scroll — คืนค่าเดิมทั้งหมด โดยไม่ scrollTo (กัน warp)
 *
 * NOTE: เนื่องจากเราไม่ได้ทำ body position:fixed → scroll position
 * ไม่เคยถูก reset → ไม่ต้อง window.scrollTo() ที่จะทำให้เกิด jump
 */
export function unlockScroll(): void {
  if (typeof window === 'undefined') return;
  if (typeof document === 'undefined') return;

  _lockCount = Math.max(0, _lockCount - 1);
  if (_lockCount !== 0) return; // ยังมี overlay เปิดอยู่ — ไม่ unlock จริง

  const html = document.documentElement;
  const body = document.body;

  // คืนค่า padding-right ที่เพิ่มไว้
  const addedPadding = html.getAttribute(SCROLL_LOCK_PADDING_ATTR);
  if (addedPadding) {
    const added = parseFloat(addedPadding) || 0;
    const currentPad = parseFloat(html.style.paddingRight) || 0;
    const newPad = Math.max(0, currentPad - added);
    if (newPad > 0) {
      html.style.paddingRight = newPad + 'px';
    } else {
      html.style.paddingRight = _savedHtmlPaddingRight;
    }
    html.removeAttribute(SCROLL_LOCK_PADDING_ATTR);
  } else {
    html.style.paddingRight = _savedHtmlPaddingRight;
  }

  // คืนค่า overflow
  html.style.overflowY = _savedHtmlOverflowY;
  html.style.overflowX = _savedHtmlOverflowX;

  // คืนค่า overscroll-behavior
  body.style.overscrollBehavior = '';

  html.removeAttribute(SCROLL_LOCK_DATA_ATTR);

  // Safety: ตรวจสอบว่า scroll position ยังอยู่ที่เดิม
  const currentY = window.scrollY || window.pageYOffset || 0;
  if (currentY !== _savedScrollY) {
    // กู้คืนอย่างเงียบ ๆ (auto behavior — skip smooth-scroll animation)
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(_savedScrollX, _savedScrollY);
    html.style.scrollBehavior = prevBehavior;
  }
}

/**
 * ดึงค่า scroll position ที่ถูกบันทึกไว้ตอน lock (debugging)
 */
export function getSavedScrollY(): number {
  return _savedScrollY;
}

/**
 * ตรวจสอบว่า scroll ถูก lock อยู่หรือไม่
 */
export function isScrollLocked(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute(SCROLL_LOCK_DATA_ATTR);
}

/**
 * ดึงจำนวน overlay ที่กำลังล็อค scroll อยู่ (debugging)
 */
export function getScrollLockCount(): number {
  return _lockCount;
}
