'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Window Stack Manager (v3.1.0)
// ═══════════════════════════════════════════════════════════════
// Centralized store สำหรับจัดการ stack ของ Window ที่เปิดอยู่ทั้งหมด
// รองรับการเปิดซ้อนกัน (nested popups) อย่างถูกต้อง:
//   - แต่ละ Window ลงทะเบียนตัวเองเมื่อ mount + open
//   - z-index ถูก assign อัตโนมัติตามลำดับ stack
//   - ESC / back-button ถูกส่งเฉพาะ Window บนสุดเท่านั้น
//   - body class 'yp-window-open' เปิดอยู่ตราบใดที่ stack ไม่ว่าง
//   - เมื่อ top window ปิด → focus กลับไป window ด้านล่าง
//
// ฟีเจอร์เด่น:
// ✓ Nested popups — เปิด sheet แล้วคลิกในนั้นเปิด sheet ละเอียดขึ้นได้
// ✓ Auto z-index — ไม่ต้องจัดการเอง
// ✓ Single source of truth — body class และ scroll lock จัดการรวมศูนย์
// ✓ Top-window-only events — กด ESC ที่ sheet ใน → ปิดแค่ sheet ใน
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

export type WindowType = 'sheet' | 'modal' | 'fullscreen' | 'sidepanel';

export interface WindowEntry {
  /** unique id สำหรับแต่ละ window instance */
  id: string;
  /** type ของ window — ใช้สำหรับ analytics / debugging */
  type: WindowType;
  /** dismissable — ถ้า false, จะไม่ถูกปิดด้วย ESC/backdrop/back-button */
  dismissable: boolean;
  /** callback เมื่อ stack manager สั่งปิด (เช่น ESC) */
  requestClose: () => void;
  /** z-index ที่ถูก assign สำหรับ window นี้ */
  zIndex: number;
}

interface WindowStackState {
  stack: WindowEntry[];
  /** register window ใหม่ — return entry ที่ assign z-index แล้ว */
  register: (entry: Omit<WindowEntry, 'zIndex'>) => WindowEntry;
  /** unregister window ที่ id ตรง — return ว่ามันเป็น top หรือไม่ */
  unregister: (id: string) => { wasTop: boolean; newTop: WindowEntry | null };
  /** ดึง top window (สำหรับ event targeting) */
  top: () => WindowEntry | null;
  /** สั่งปิด top window (ใช้สำหรับ global ESC handler) */
  closeTop: () => boolean;
  /** สั่งปิดทุก window (emergency — เช่น user logout) */
  closeAll: () => void;
  /** check ว่า stack ว่างไหม */
  isEmpty: () => boolean;
}

const BASE_Z = 18000;
const Z_STEP = 10;

function _assignZ(stackLen: number): number {
  return BASE_Z + (stackLen + 1) * Z_STEP;
}

export const useWindowStack = create<WindowStackState>((set, get) => ({
  stack: [],

  register: (entry) => {
    const stack = get().stack;
    const zIndex = _assignZ(stack.length);
    const full: WindowEntry = { ...entry, zIndex };
    set({ stack: [...stack, full] });
    _syncBodyClass(get().stack);
    return full;
  },

  unregister: (id) => {
    const stack = get().stack;
    const idx = stack.findIndex((w) => w.id === id);
    if (idx === -1) {
      return { wasTop: false, newTop: get().stack.length ? get().stack[get().stack.length - 1] : null };
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
    // ตัวที่ไม่ dismissable จะถูกข้าม (ผู้ใช้ต้องปิดเอง)
    [...stack].reverse().forEach((w) => {
      if (w.dismissable) w.requestClose();
    });
  },

  isEmpty: () => get().stack.length === 0,
}));

// ═══════════════════════════════════════════════════════════════
// Body class sync — เปิด 'yp-window-open' ตราบใดที่มี window เปิดอยู่
// ใช้สำหรับ: ซ่อน bottom-nav / FAB ผ่าน CSS
// ═══════════════════════════════════════════════════════════════
function _syncBodyClass(stack: WindowEntry[]) {
  if (typeof document === 'undefined') return;
  if (stack.length > 0) {
    document.body.classList.add('yp-window-open');
    // นับจำนวน sheet/fullscreen เพื่อใช้ใน CSS สำหรับ variant
    const hasSheet = stack.some((w) => w.type === 'sheet' || w.type === 'fullscreen');
    if (hasSheet) {
      document.body.classList.add('yp-window-open--sheet');
    } else {
      document.body.classList.remove('yp-window-open--sheet');
    }
  } else {
    document.body.classList.remove('yp-window-open');
    document.body.classList.remove('yp-window-open--sheet');
  }
}

// ═══════════════════════════════════════════════════════════════
// Global ESC handler — ส่ง ESC เฉพาะ top window เท่านั้น
// ติดตั้งครั้งเดียวที่ module load (singleton)
// ═══════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = useWindowStack.getState().top();
    if (!top) return;
    if (!top.dismissable) return;
    // ไม่ preventDefault ที่นี่ — ให้ window ที่รับเป็นคนตัดสินใจ
    // (เผื่อบาง window ต้องการทำอย่างอื่นก่อนปิด)
    top.requestClose();
  }, { capture: true });
}

// ═══════════════════════════════════════════════════════════════
// Unique id generator — ใช้สำหรับ Window instance id
// ═══════════════════════════════════════════════════════════════
let _idCounter = 0;
export function generateWindowId(): string {
  _idCounter += 1;
  return `ypw-${Date.now().toString(36)}-${_idCounter.toString(36)}`;
}
