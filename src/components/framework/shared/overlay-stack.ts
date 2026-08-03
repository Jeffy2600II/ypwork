'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Shared · Overlay Stack (r50)
 * ═══════════════════════════════════════════════════════════════
 * Centralized Zustand store สำหรับจัดการ stack ของ overlay ทั้งหมด
 * (sheet + popup + sidepanel + fullscreen) ที่เปิดอยู่ในระบบ
 *
 * หลักการ (Aerospace Software Standard):
 *   - Single source of truth สำหรับ "มี overlay เปิดอยู่ไหม"
 *   - รองรับ nested overlays (sheet เปิดซ้อน sheet ได้ไม่จำกัด)
 *   - Auto z-index — แต่ละ overlay ได้ z-index ตามลำดับ stack
 *   - Top-only events — ESC ส่งเฉพาะ overlay บนสุด
 *   - Body class sync — 'yp-overlay-open' ถูกเพิ่ม/ลดตาม stack
 *
 * มุมมองผู้ใช้:
 *   - เปิด sheet แล้วเปิด sheet อื่นซ้อนได้ — ปิดทีละอันได้
 *   - กด ESC ปิดแค่ overlay บนสุด ไม่ใช่ปิดทั้งหมด
 *   - FAB และ bottom-nav ซ่อนอัตโนมัติเมื่อมี overlay เปิด
 *   - Backdrop click ปิดแค่ overlay บนสุด
 *
 *★ r50: เปลี่ยนชื่อจาก 'yp-window-open' → 'yp-overlay-open' เพื่อความชัดเจน
 *       แยกออกจาก 'yp-sheet-open' เฉพาะ sheet (mobile)
 * ═══════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

// ── Types ──

export type OverlayType = 'sheet' | 'popup' | 'fullscreen' | 'sidepanel';

export interface OverlayEntry {
  /** unique id สำหรับแต่ละ overlay instance */
  id: string;
  /** type ของ overlay */
  type: OverlayType;
  /** dismissable — ถ้า false จะไม่ถูกปิดด้วย ESC/backdrop/back-button */
  dismissable: boolean;
  /** callback เมื่อ stack manager สั่งปิด (เช่น ESC) */
  requestClose: () => void;
  /** z-index ที่ถูก assign */
  zIndex: number;
}

interface OverlayStackState {
  stack: OverlayEntry[];
  /** register overlay ใหม่ — return entry ที่ assign z-index แล้ว */
  register: (entry: Omit<OverlayEntry, 'zIndex'>) => OverlayEntry;
  /** unregister overlay ที่ id ตรง */
  unregister: (id: string) => { wasTop: boolean; newTop: OverlayEntry | null };
  /** ดึง top overlay */
  top: () => OverlayEntry | null;
  /** สั่งปิด top overlay (ใช้สำหรับ global ESC handler) */
  closeTop: () => boolean;
  /** สั่งปิดทุก overlay (emergency — เช่น user logout) */
  closeAll: () => void;
  /** check ว่า stack ว่างไหม */
  isEmpty: () => boolean;
}

// ── Constants ──

const BASE_Z = 18000;
const Z_STEP = 10;

function _assignZ(stackLen: number): number {
  return BASE_Z + (stackLen + 1) * Z_STEP;
}

// ── Store ──

export const useOverlayStack = create<OverlayStackState>((set, get) => ({
  stack: [],

  register: (entry) => {
    const stack = get().stack;
    const zIndex = _assignZ(stack.length);
    const full: OverlayEntry = { ...entry, zIndex };
    set({ stack: [...stack, full] });
    _syncBodyClass(get().stack);
    return full;
  },

  unregister: (id) => {
    const stack = get().stack;
    const idx = stack.findIndex((w) => w.id === id);
    if (idx === -1) {
      return {
        wasTop: false,
        newTop: get().stack.length
          ? get().stack[get().stack.length - 1]
          : null,
      };
    }
    const wasTop = idx === stack.length - 1;
    const next = stack.filter((w) => w.id !== id);
    set({ stack: next });
    _syncBodyClass(next);
    return {
      wasTop,
      newTop: next.length ? next[next.length - 1] : null,
    };
  },

  top: () => {
    const stack = get().stack;
    return stack.length ? stack[stack.length - 1] : null;
  },

  closeTop: () => {
    const t = get().top();
    if (!t) return false;
    if (!t.dismissable) return false;
    t.requestClose();
    return true;
  },

  closeAll: () => {
    const stack = get().stack;
    // ปิดจาก top ลงมา — เรียก requestClose ของทุกตัวที่ dismissable
    [...stack].reverse().forEach((w) => {
      if (w.dismissable) w.requestClose();
    });
  },

  isEmpty: () => get().stack.length === 0,
}));

// ── Body class sync ──

const BODY_CLASS_OVERLAY = 'yp-overlay-open';
const BODY_CLASS_SHEET = 'yp-overlay-open--sheet';
const BODY_CLASS_POPUP = 'yp-overlay-open--popup';

function _syncBodyClass(stack: OverlayEntry[]) {
  if (typeof document === 'undefined') return;
  if (stack.length > 0) {
    document.body.classList.add(BODY_CLASS_OVERLAY);

    const hasSheet = stack.some((w) => w.type === 'sheet');
    const hasPopup = stack.some(
      (w) => w.type === 'popup' || w.type === 'sidepanel'
    );
    const hasFullscreen = stack.some((w) => w.type === 'fullscreen');

    // ★ sheet และ popup มีผลต่อ FAB/nav ต่างกัน — แยก class
    document.body.classList.toggle(BODY_CLASS_SHEET, hasSheet || hasFullscreen);
    document.body.classList.toggle(BODY_CLASS_POPUP, hasPopup);
  } else {
    document.body.classList.remove(BODY_CLASS_OVERLAY);
    document.body.classList.remove(BODY_CLASS_SHEET);
    document.body.classList.remove(BODY_CLASS_POPUP);
  }
}

// ── Global ESC handler (singleton — ติดตั้งครั้งเดียว) ──

if (typeof window !== 'undefined') {
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return;
      const top = useOverlayStack.getState().top();
      if (!top) return;
      if (!top.dismissable) return;
      // ไม่ preventDefault — ให้ overlay เป็นคนตัดสินใจ
      top.requestClose();
    },
    { capture: true }
  );
}

// ── Unique id generator ──

let _idCounter = 0;
export function generateOverlayId(): string {
  _idCounter += 1;
  return `ypo-${Date.now().toString(36)}-${_idCounter.toString(36)}`;
}

// ── Backward compatibility (r49 → r50) ──
// ใช้สำหรับ code เดิมที่ยัง import จาก '@/lib/window-stack'

export const useWindowStack = useOverlayStack;
export const generateWindowId = generateOverlayId;
export type WindowType = OverlayType;
export type WindowEntry = OverlayEntry;
