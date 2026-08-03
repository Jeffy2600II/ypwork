// ═══════════════════════════════════════════════════════════════
// YP WORK · Shared Status Metadata (r47)
// ═══════════════════════════════════════════════════════════════
// "shared docking port" สำหรับ status picker — ใช้ร่วมกันระหว่าง
// today-client และ event-detail-client
//
// ปัญหาที่แก้ (รอบ 47):
//   ก่อนหน้านี้ STATUS_META ถูก duplicate ใน 2 ไฟล์:
//   - src/modules/today/today-client.tsx:111
//   - src/modules/events/event-detail-client.tsx:67
//   ถ้าจะเพิ่ม/แก้ status (เช่น "รอการตรวจสอบ") ต้องแก้ 2 ที่
//   → ลืมที่หนึ่ง → inconsistency ระหว่าง module
//
// หลักการ:
//   - shared metadata ที่ใช้ร่วมกันหลาย module ต้องอยู่ในที่เดียว
//   - เหมือน "warehouse" ของ space station ที่ทุกสถานีมาเบิกของ
// ═══════════════════════════════════════════════════════════════

import type { TaskStatus, EventStatus } from '@/lib/types';

export interface StatusMeta {
  color: string;
  label: string;
  desc: string;
}

/**
 * Status metadata — consistent across card & detail sheet & status picker
 *
 * ใช้ใน:
 *   - today-client.tsx (timeline cards + detail sheet)
 *   - event-detail-client.tsx (task rows + status picker)
 *   - status-picker-sheet.tsx (shared component)
 */
export const STATUS_META: Record<TaskStatus | EventStatus, StatusMeta> = {
  planning: {
    color: '#A78BFA',
    label: 'วางแผน',
    desc: 'ยังอยู่ในขั้นวางแผน',
  },
  todo: {
    color: '#F59E0B',
    label: 'รอเริ่ม',
    desc: 'ยังไม่ได้เริ่มทำ',
  },
  ongoing: {
    color: '#6366F1',
    label: 'กำลังดำเนินการ',
    desc: 'กำลังดำเนินการอยู่',
  },
  done: {
    color: '#10B981',
    label: 'เสร็จสมบูรณ์',
    desc: 'ทำเสร็จเรียบร้อยแล้ว',
  },
};

/**
 * ลำดับสถานะสำหรับ task — ใช้ใน StatusPickerSheet
 */
export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'ongoing', 'done'];

/**
 * ลำดับสถานะสำหรับ event — ใช้ใน StatusPickerSheet
 */
export const EVENT_STATUS_ORDER: EventStatus[] = ['planning', 'todo', 'ongoing', 'done'];
