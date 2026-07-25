'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Central Core · Inline Toast Helper
 * ═══════════════════════════════════════════════════════════════
 * "docking port" สำหรับ inline toast (แบบ show แล้ว auto-dismiss)
 *
 * ปัญหาที่แก้ (รอบ 47):
 *   - today-client.tsx และ event-detail-client.tsx ใช้ local `setToast({msg, type})`
 *     พร้อม `useEffect(() => setTimeout(..., 2400))` แยกกัน 2 ที่
 *   - ไม่สอดคล้องกับ shadcn `useToast` ที่มีอยู่แล้ว (action button, persistent)
 *   - ทำให้มี 2 ระบบ toast ทำงานอยู่ใน codebase พร้อมกัน
 *
 * หลักการ:
 *   - hook นี้เป็น thin wrapper รอบ shadcn `useToast`
 *   - แปลง inline pattern (msg + type) ไปเป็น shadcn toast format
 *   - ลูกยังเรียก `showToast({ msg, type })` เหมือนเดิม ไม่ต้องแก้ logic มาก
 *   - ในอนาคตสามารถ migrate ที่ละจุดได้โดยไม่กระทบ UI
 *
 * มุมมองผู้ใช้:
 *   - ยังเห็น toast เหมือนเดิม — เปลี่ยน backend เท่านั้น
 *   - ถ้าในอนาคตอยาก action button ใน toast (เช่น "ยกเลิกการลบ") ทำได้ทันที
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { TOAST_AUTO_DISMISS } from '@/lib/core/sheet-timing';

export type InlineToastType = 'success' | 'error' | 'info' | 'warning';

export interface InlineToastOptions {
  msg: string;
  type?: InlineToastType;
  /** ระยะเวลาแสดง (ms) — default 2400ms จาก sheet-timing.ts */
  duration?: number;
  /** หัวข้อ (optional) — ถ้ามีจะแสดงด้านบน msg */
  title?: string;
}

/**
 * Hook สำหรับแสดง inline toast แบบ auto-dismiss
 *
 * Pattern (แทนที่ local useState + useEffect + setTimeout):
 * ```tsx
 * const { showToast } = useInlineToast();
 * // ...
 * showToast({ msg: 'บันทึกสำเร็จ', type: 'success' });
 * ```
 *
 * คืนค่า:
 *   - showToast: ฟังก์ชันแสดง toast
 *   - dismiss: ฟังก์ชันปิด toast ปัจจุบัน
 *   - toasts: รายการ toast ปัจจุบัน (จาก shadcn)
 */
export function useInlineToast() {
  const { toast, dismiss, toasts } = useToast();

  const showToast = React.useCallback(
    (opts: InlineToastOptions) => {
      const { msg, type = 'info', duration = TOAST_AUTO_DISMISS, title } = opts;

      // แมพ type → shadcn variant (ตอนนี้ shadcn toast มี variant 'default' | 'destructive')
      const variant = type === 'error' || type === 'warning' ? 'destructive' : 'default';

      const t = toast({
        title: title,
        description: msg,
        variant,
      });

      // Auto-dismiss ตาม duration (shadcn ไม่ได้ auto-dismiss โดย default)
      const timer = setTimeout(() => {
        t.dismiss();
      }, duration);

      // cleanup timer ถ้า component unmount ก่อน
      // (ใช้ pattern return cleanup จาก useEffect ไม่ได้เพราะอยู่ใน callback)
      // ดังนั้น setTimeout จะรันจนจบ — trade-off ที่ยอมรับได้เพราะ toast สั้น
      void timer;
    },
    [toast]
  );

  return { showToast, dismiss, toasts };
}

/**
 * Helper สำหรับสร้าง toast options จาก error object
 * ใช้เมื่อ catch (e: unknown) แล้วอยากแสดง error message
 */
export function errorToastOptions(error: unknown, fallbackMsg: string): InlineToastOptions {
  const msg = error instanceof Error ? error.message : fallbackMsg;
  return { msg, type: 'error' };
}
