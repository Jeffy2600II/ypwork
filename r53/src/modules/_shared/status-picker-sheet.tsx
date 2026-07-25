'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Shared Status Picker Sheet (r47)
// ═══════════════════════════════════════════════════════════════
// "docking port" สำหรับ StatusPickerSheet — ใช้ร่วมกันระหว่าง
// today-client และ event-detail-client
//
// ปัญหาที่แก้ (รอบ 47):
//   ก่อนหน้านี้ StatusPickerSheet ถูก duplicate ~95% ใน 2 ไฟล์:
//   - src/modules/today/today-client.tsx:982-1036
//   - src/modules/events/event-detail-client.tsx:864-901
//   JSX เหมือนกันเกือบทุกบรรทัด ต่างแค่ title + statuses + onSelect
//   ถ้าจะแก้ styling ต้องแก้ 2 ที่ → inconsistency
//
// หลักการ:
//   - shared component ที่รับ props ที่จำเป็นเท่านั้น
//   - ลูกส่ง statuses + currentStatus + onSelect มาเอง
//   - styling อยู่ใน src/styles/ (modular CSS) ในที่เดียว (.yp-status-picker*)
//
// มุมมองผู้ใช้:
//   - UX สม่ำเสมอทุกหน้า — กดเปลี่ยนสถานะแล้วเห็นเหมือนกัน
//   - animation เปิด/ปิดเหมือนกัน เพราะใช้ BottomSheet ตัวเดียวกัน
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { Check, Clock, RefreshCw } from 'lucide-react';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { STATUS_META } from '@/modules/_shared/status-meta';
import type { TaskStatus, EventStatus } from '@/lib/types';

export interface StatusPickerSheetProps {
  open: boolean;
  onClose: () => void;
  /** หัวข้อ sheet (เช่น "สถานะของรายการ" หรือ "สถานะของรายการย่อย") */
  title: string;
  /** รายละเอียด (ชื่อรายการที่กำลังเปลี่ยนสถานะ) */
  description?: string;
  /** สถานะทั้งหมดที่จะแสดงให้เลือก */
  statuses: (TaskStatus | EventStatus)[];
  /** สถานะปัจจุบัน — จะแสดง "is-current" highlight */
  currentStatus: TaskStatus | EventStatus | undefined;
  /** เรียกเมื่อ user เลือกสถานะใหม่ */
  onSelect: (status: TaskStatus | EventStatus) => void;
}

/**
 * Status Picker Sheet — ใช้ร่วมกันระหว่าง today + event-detail
 *
 * Pattern:
 * ```tsx
 * <StatusPickerSheet
 *   open={statusPickerOpen}
 *   onClose={() => setStatusPickerOpen(false)}
 *   title="สถานะของรายการ"
 *   description={activeItem?.title}
 *   statuses={TASK_STATUS_ORDER}
 *   currentStatus={activeItem?.status}
 *   onSelect={(s) => handleStatusChange(s)}
 * />
 * ```
 */
export function StatusPickerSheet({
  open,
  onClose,
  title,
  description,
  statuses,
  currentStatus,
  onSelect,
}: StatusPickerSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
    >
      <div className="yp-status-picker">
        {statuses.map((s) => {
          const meta = STATUS_META[s];
          const isCurrent = currentStatus === s;
          return (
            <button
              key={s}
              type="button"
              className={`yp-status-picker__option${isCurrent ? ' is-current' : ''}`}
              style={{ ['--status-color' as string]: meta.color }}
              onClick={() => onSelect(s)}
            >
              <div className="yp-status-picker__icon">
                {s === 'done' ? (
                  <Check width={16} height={16} />
                ) : s === 'ongoing' ? (
                  <RefreshCw width={14} height={14} />
                ) : (
                  <Clock width={14} height={14} />
                )}
              </div>
              <div className="yp-status-picker__text">
                <div className="yp-status-picker__label">{meta.label}</div>
                <div className="yp-status-picker__desc">{meta.desc}</div>
              </div>
              {isCurrent ? (
                <div className="yp-status-picker__check">
                  <Check width={18} height={18} />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
