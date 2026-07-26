'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Adaptive · AdaptiveOverlay (r50)
// ═══════════════════════════════════════════════════════════════
// Smart wrapper ที่เลือก BottomSheet (mobile) หรือ Dialog (desktop)
// ตามขนาด viewport
//
// ★ r50 การออกแบบ:
//   - Wrapper นี้เป็น "airlock" ระหว่าง consumer กับ sheet/popup
//   - ตัดสินใจเลือกตอน mount และตอน resize
//   - ถ้า resize ระหว่างที่ overlay เปิดอยู่ → ปิดก่อนแล้วค่อยเปิดใหม่
//     (เพื่อกัน state ปนกันระหว่าง 2 ระบบ)
//   - Props เหมือน BottomSheet ทุกอย่าง (interface compat)
//
// มุมมองผู้ใช้:
//   - บนมือถือ: slide จากล่าง + drag-to-dismiss
//   - บน desktop: centered modal + scale animation
//   - ไม่ต้องคิดเองว่าจะใช้อันไหน
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { BottomSheet, type BottomSheetProps, type SheetSize } from '../sheet';
import { Dialog, type PopupSize } from '../popup';
import { useIsDesktop } from './use-viewport';

// ── size mapping: sheet → popup ──
const SHEET_TO_POPUP_SIZE: Record<SheetSize, PopupSize> = {
  auto: 'auto',
  sm: 'sm',
  md: 'md',
  tall: 'lg',
  full: 'full',
};

export interface AdaptiveOverlayProps extends Omit<BottomSheetProps, 'size'> {
  /** บังคับใช้ type ใด type หนึ่ง (skip adaptive) */
  forceType?: 'sheet' | 'popup';
  /** size สำหรับ sheet */
  size?: SheetSize;
  /** size สำหรับ popup (default: mapped จาก size) */
  popupSize?: PopupSize;
}

export function AdaptiveOverlay({
  forceType,
  size = 'auto',
  popupSize,
  ...rest
}: AdaptiveOverlayProps) {
  const isDesktop = useIsDesktop();

  // ★ ถ้า forceType ระบุ → ใช้ type นั้น
  //   ถ้าไม่ → ใช้ adaptive (sheet บน mobile, popup บน desktop)
  const usePopup =
    forceType === 'popup' || (forceType !== 'sheet' && isDesktop);

  if (usePopup) {
    return (
      <Dialog
        {...rest}
        size={popupSize ?? SHEET_TO_POPUP_SIZE[size]}
      />
    );
  }

  return <BottomSheet {...rest} size={size} />;
}
