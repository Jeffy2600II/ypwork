'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · FAB · Context (r50)
 * ═══════════════════════════════════════════════════════════════
 * "docking port" สำหรับ Floating Action Button (FAB / ปุ่ม +)
 *
 * หลักการ:
 *   - AppShell ใช้ FABContext เป็น "remote control" ของปุ่ม +
 *   - แต่ละหน้า (page client) สามารถ "รายงานตัว" ผ่าน useFabAction()
 *     ว่า "ถ้ากด + ในหน้านี้ ให้ทำอะไร" (navigate, pre-fill date, หรือเปิด sheet)
 *   - หากหน้าไหนไม่รายงานตัว ปุ่ม + จะใช้ default action คือ navigate /events/create
 *
 *★ r50: ย้ายจาก lib/core/fab-context.tsx มาอยู่ใน framework/fab/
 *       เพื่อรวมระบบ FAB ไว้ที่เดียว (context + component + scroll hook)
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
 * - 'hidden' → ซ่อนปุ่ม + ในหน้านี้
 */
export type FabAction =
  | { kind: 'navigate-create' }
  | { kind: 'navigate-create-with-date'; date: string }
  | { kind: 'callback'; fn: () => void }
  | { kind: 'hidden' };

interface FabContextValue {
  /** Action ปัจจุบันที่จะใช้เมื่อกด + */
  action: FabAction;
  /** ลูกใช้ register action ของตัวเอง */
  setAction: (action: FabAction) => void;
}

const FabContext = React.createContext<FabContextValue | null>(null);

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = React.useState<FabAction>({
    kind: 'navigate-create',
  });

  const value = React.useMemo<FabContextValue>(
    () => ({ action, setAction }),
    [action]
  );

  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

export function useFabAction(): FabAction {
  const ctx = React.useContext(FabContext);
  if (!ctx) {
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
 */
export function useFabRegister(action: FabAction): void {
  const ctx = React.useContext(FabContext);
  if (!ctx) return;

  const actionRef = React.useRef(action);
  React.useEffect(() => {
    actionRef.current = action;
  });
  React.useEffect(() => {
    ctx.setAction(action);
    return () => {
      ctx.setAction({ kind: 'navigate-create' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(action)]);
}
