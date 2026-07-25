'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Core · Scroll Lock (no-warp edition)
 * ═══════════════════════════════════════════════════════════════
 * ปัญหาที่แก้:
 *   ก่อนหน้านี้ใช้ "body position:fixed + top:-savedY" ตอน lock
 *   แล้วค่อย window.scrollTo(savedY) ตอน unlock — ทำให้เกิด layout shift
 *   ที่มองเห็นเป็น "วาร์ป" เมื่อ sheet ปิดลง (body กลับเป็น static + scroll
 *   ถูก set ใหม่ → ทุก element บนหน้าเลื่อนขึ้นลงกะทันหัน)
 *
 * วิธีแก้ใหม่:
 *   1. ใช้ "overflow:hidden" บน <html> เท่านั้น — body ยังคง position เดิม
 *   2. บันทึก scrollY ไว้ แต่ไม่ย้าย body ไปไหน
 *   3. ตอน unlock — แค่คืน overflow เดิม ไม่ต้อง scrollTo เพราะ scroll position
 *      ไม่เคยถูก reset (เพราะเราไม่ได้ทำ body fixed)
 *   4. เก็บ scrollbar width ด้วย padding-right บน <html> เพื่อกัน content
 *      reflow เมื่อ scrollbar หายไป
 *
 * ผลลัพธ์:
 *   - scroll position ค้างที่เดิมตลอดเวลา — ไม่มี jump
 *   - bottom-nav / FAB / ทุก fixed element ไม่เคลื่อนที่
 *   - เหมาะกับการทำงานร่วมกับ bottom sheet close animation
 *   - รองรับ nested windows (count-based)
 * ═══════════════════════════════════════════════════════════════
 */

const SCROLL_LOCK_DATA_ATTR = 'data-yp-scroll-locked';
const SCROLL_LOCK_PADDING_ATTR = 'data-yp-scroll-lock-padding';

let _lockCount = 0;
let _savedHtmlStyle = '';
let _savedBodyStyle = '';
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
  _savedHtmlStyle = html.getAttribute('style') || '';
  _savedBodyStyle = body.getAttribute('style') || '';
  _savedHtmlOverflowY = html.style.overflowY;
  _savedHtmlOverflowX = html.style.overflowX;
  _savedHtmlPaddingRight = html.style.paddingRight;

  // คำนวณ scrollbar width
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  // ล็อค scroll ผ่าน overflow:hidden บน html
  // (ไม่ touch body เลย — กัน layout shift)
  html.style.overflowY = 'hidden';
  html.style.overflowX = 'hidden';
  html.style.overscrollBehavior = 'none';

  // เพิ่ม padding-right เท่ากับ scrollbar width เพื่อกัน content จาก
  // ขยายออกด้านขวาเมื่อ scrollbar หายไป (reflow)
  if (scrollbarWidth > 0) {
    const currentPaddingRight = html.style.paddingRight;
    const currentPad = currentPaddingRight
      ? parseFloat(currentPaddingRight) || 0
      : 0;
    html.style.paddingRight = currentPad + scrollbarWidth + 'px';
    html.setAttribute(SCROLL_LOCK_PADDING_ATTR, scrollbarWidth + 'px');
  }

  html.setAttribute(SCROLL_LOCK_DATA_ATTR, 'true');

  // body ยังคง position เดิม — ไม่ touch อะไรเลย
  // แต่ป้องกัน overscroll-behavior เผื่อมี nested scroll context
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
  if (_lockCount !== 0) return; // ยังมี window เปิดอยู่ — ไม่ unlock จริง

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

  // ไม่ต้อง window.scrollTo() — เพราะเราไม่เคยย้าย scroll position
  // scroll position ค้างที่เดิมตลอดเวลา

  // Safety: ตรวจสอบว่า scroll position ยังอยู่ที่เดิม
  // (บางครั้ง browser อาจ reset ตอน overflow เปลี่ยน)
  const currentY = window.scrollY || window.pageYOffset || 0;
  if (currentY !== _savedScrollY) {
    // กู้คืนอย่างเงียบ ๆ โดยไม่ trigger layout shift
    // (ใช้ 'auto' เพื่อ skip smooth-scroll animation)
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(_savedScrollX, _savedScrollY);
    html.style.scrollBehavior = prevBehavior;
  }
}

/**
 * ดึงค่า scroll position ที่ถูกบันทึกไว้ตอน lock (ใช้สำหรับ debugging)
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
