'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - Shared Types & Constants (r51)
 * ============================================================
 * รวม types และ constants ที่ใช้ร่วมกันระหว่าง components ใน event-detail module
 * - EventDetailClientProps, TaskPayload, EventPatch (types)
 * - PRIORITY_META, ESTIMATED_TIME_OPTIONS (constants)
 * - getEstimatedTimeSelectValue (helper)
 *
 * ★ r51 (aerospace refactor):
 *   - COLOR_OPTIONS ย้ายไป event-colors.ts (single source of truth)
 *   - EventPatch เพิ่ม field `type` (EditEventSheet สามารถเปลี่ยน type ได้)
 *   - EventPatch.date เป็น string (empty string แทน null สำหรับ group type)
 * ============================================================
 */

import type {
  YPEvent,
  Task,
  TaskPriority,
  Department,
  UserProfile,
  EventType,
} from '@/lib/types';

// ★ r51: re-export COLOR_OPTIONS จาก event-colors.ts (single source of truth)
//   เพื่อไม่ให้ไฟล์อื่นที่ import จาก event-detail-types พัง
export { EVENT_COLOR_OPTIONS as COLOR_OPTIONS } from './event-colors';

export interface EventDetailClientProps {
  event: YPEvent;
  department: Department | null;
  /** รายชื่อ users สำหรับเลือก assignee (จาก council_users) */
  users?: UserProfile[];
  /** รายชื่อ departments สำหรับเลือกใน edit event */
  departments?: Department[];
}

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; desc: string; dotClass: string }
> = {
  low: { label: 'ไม่เร่ง', desc: 'ทำเมื่อมีเวลาว่าง', dotClass: 'is-low' },
  medium: { label: 'ปกติ', desc: 'ความเร่งด่วนมาตรฐาน', dotClass: 'is-medium' },
  high: { label: 'เร่งด่วน', desc: 'ต้องทำก่อนอื่น', dotClass: 'is-high' },
};

// ★ v3.10.0 รอบที่ 26: Predefined options สำหรับ "ระยะเวลาที่คาดการณ์"
export const ESTIMATED_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— ไม่ระบุ —' },
  { value: '15 นาที', label: '15 นาที' },
  { value: '30 นาที', label: '30 นาที' },
  { value: '45 นาที', label: '45 นาที' },
  { value: '1 ชม.', label: '1 ชั่วโมง' },
  { value: '2 ชม.', label: '2 ชั่วโมง' },
  { value: '3 ชม.', label: '3 ชั่วโมง' },
  { value: '4 ชม.', label: '4 ชั่วโมง' },
  { value: 'ครึ่งวัน', label: 'ครึ่งวัน (≈ 4 ชม.)' },
  { value: '1 วัน', label: '1 วัน' },
  { value: '2 วัน', label: '2 วัน' },
  { value: '1 สัปดาห์', label: '1 สัปดาห์' },
  { value: 'มากกว่า 1 สัปดาห์', label: 'มากกว่า 1 สัปดาห์' },
];

/**
 * Normalize estimated time value for select.
 *   - '' หรือ null → '' (เลือก "— ไม่ระบุ —")
 *   - ค่าอื่น → ส่งค่าเดิมไป select (ยังแสดงในกรณีที่ตรง option)
 */
export function getEstimatedTimeSelectValue(stored: string | null | undefined): string {
  return stored || '';
}

/** Payload สำหรับ add/edit task */
export interface TaskPayload {
  title: string;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  /** เวลาเริ่มทำ (HH:MM) — ไม่บังคับ */
  startTime: string | null;
  /** วันที่เริ่มลงมือทำ (YYYY-MM-DD) — ไม่บังคับ */
  startDate: string | null;
  estimatedTime: string;
  tags: string[];
  notes: string;
}

/**
 * Payload สำหรับ edit event
 *
 * ★ r51: เพิ่ม field `type` (ก่อนหน้านี้ไม่มี ทำให้ EditEventSheet ไม่สามารถ
 *   เปลี่ยน type ระหว่าง group/task ได้)
 *
 * ★ r51: `date` เป็น string (empty string '' แทน null สำหรับ group type)
 *   เพื่อให้ตรงกับ form state และส่งผ่าน JSON ได้ง่าย
 */
export interface EventPatch {
  type: EventType;
  title: string;
  /** YYYY-MM-DD สำหรับ task type, '' (empty) สำหรับ group type */
  date: string;
  start_date: string | null;
  time: string;
  location: string;
  description: string;
  departmentId: string;
  color: string;
}
