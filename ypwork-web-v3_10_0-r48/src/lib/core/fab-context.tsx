'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Central Core · FAB Context
 * ═══════════════════════════════════════════════════════════════
 * "docking port" สำหรับ Floating Action Button (FAB / ปุ่ม +)
 *
 * ปัญหาที่แก้ (รอบ 47):
 *   - ก่อนหน้านี้ AppShell FAB เป็น <Link href="/events/create"> เสมอ
 *   - ในหน้า day-view (/events/day/[date]) empty state บอก
 *     "กดปุ่ม + เพื่อสร้างรายการใหม่สำหรับวันนี้" แต่:
 *       1) day-view ไม่ได้ส่ง showFAB ให้ AppShell → ไม่มีปุ่ม + โผล่มา
 *       2) ถ้ามีปุ่ม + ก็พาไป /events/create ที่ไม่ pre-fill วันที่
 *     → empty state CTA โกหกผู้ใช้
 *
 * หลักการ:
 *   - AppShell ใช้ FABContext เป็น "remote control" ของปุ่ม +
 *   - แต่ละหน้า (page client) สามารถ "รายงานตัว" ผ่าน useFabAction()
 *     ว่า "ถ้ากด + ในหน้านี้ ให้ทำอะไร" (navigate, pre-fill date, หรือเปิด sheet)
 *   - หากหน้าไหนไม่รายงานตัว ปุ่ม + จะใช้ default action คือ navigate /events/create
 *
 * มุมมองผู้ใช้:
 *   - ผู้ใช้ไม่ต้องรู้ว่าอยู่หน้าไหน — ปุ่ม + ทำงานสม่ำเสมอ
 *   - ในหน้า day-view กด + แล้วเปิด form ที่มีวันที่ pre-fill อยู่แล้ว
 *   - ในหน้า event-detail ไม่มีปุ่ม + (เพราะมี "+เพิ่มรายการย่อย" ในหน้าอยู่แล้ว)
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';

/**
 * Action ที่ FAB จะทำเมื่อถูกกด
 * - 'navigate-create' (default) → ไป /events/create ปกติ
 * - 'navigate-create-with-date' → ไป /events/create?date=YYYY-MM-DD (pre-fill)
 * - 'callback' → เรียก callback ที่ลูกส่งมา (เช่น เปิด AddTaskSheet)
 * - 'hidden' → ซ่อนปุ่ม + ในหน้านี้ (เช่น event-detail มี + ของตัวเอง)
 */
export type FabAction =
  | { kind: 'navigate-create' }
  | { kind: 'navigate-create-with-date'; date: string }
  | { kind: 'callback'; fn: () => void }
  | { kind: 'hidden' };

interface FabContextValue {
  /** Action ปัจจุบันที่จะใช้เมื่อกด + (default: navigate-create) */
  action: FabAction;
  /** ลูกใช้ register action ของตัวเอง — คืน cleanup function */
  setAction: (action: FabAction) => void;
}

const FabContext = React.createContext<FabContextValue | null>(null);

/**
 * Provider ที่ AppShell ครอบ — เก็บ action ปัจจุบัน
 */
export function FabProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = React.useState<FabAction>({ kind: 'navigate-create' });

  const value = React.useMemo<FabContextValue>(
    () => ({ action, setAction }),
    [action]
  );

  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

/**
 * Hook ที่ AppShell ใช้อ่าน action ปัจจุบัน เพื่อตั้งพฤติกรรมปุ่ม +
 * ถ้า action เป็น 'hidden' → AppShell จะไม่ render FAB
 */
export function useFabAction(): FabAction {
  const ctx = React.useContext(FabContext);
  if (!ctx) {
    // ถ้าไม่มี provider (ควรไม่เกิด) → fallback ไป navigate-create
    return { kind: 'navigate-create' };
  }
  return ctx.action;
}

/**
 * Hook ที่ลูก (page client) ใช้ register action ของหน้าตัวเอง
 *
 * Pattern:
 * ```tsx
 * function DayViewClient({ date }: { date: string }) {
 *   useFabRegister({ kind: 'navigate-create-with-date', date });
 *   return <div>...</div>;
 * }
 * ```
 *
 * ถ้า action ส่งมาเป็น callback (fn) จะ update ทุกครั้งที่ fn เปลี่ยน
 * ดังนั้นลูกควรใช้ useCallback สำหรับ fn
 */
export function useFabRegister(action: FabAction): void {
  const ctx = React.useContext(FabContext);
  if (!ctx) return; // ไม่มี provider — skip silently

  // เก็บ action ล่าสุดใน ref เพื่อกัน re-render loop
  const actionRef = React.useRef(action);
  React.useEffect(() => {
    actionRef.current = action;
  });
  React.useEffect(() => {
    ctx.setAction(action);
    return () => {
      // เมื่อ unmount หรือ action เปลี่ยน → reset เป็น default
      // (default จะถูก override โดยหน้าใหม่ที่ mount ทันทีอยู่แล้ว)
      ctx.setAction({ kind: 'navigate-create' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(action)]);
}
