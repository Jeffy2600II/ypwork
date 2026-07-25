'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - Shared Types & Constants (r48)
 * ============================================================
 * รวม types และ constants ที่ใช้ร่วมกันระหว่าง components ใน event-detail module
 * - EventDetailClientProps, TaskPayload, EventPatch (types)
 * - PRIORITY_META, ESTIMATED_TIME_OPTIONS, COLOR_OPTIONS (constants)
 * - getEstimatedTimeSelectValue (helper)
 * ============================================================
 */

import type {
  YPEvent,
  Task,
  TaskPriority,
  Department,
  UserProfile,
} from '@/lib/types';

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

export const COLOR_OPTIONS = [
  '#4F46E5',
  '#7C3AED',
  '#A855F7',
  '#14B8A6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#D946EF',
  '#F43F5E',
];

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

/** Payload สำหรับ edit event */
export interface EventPatch {
  title: string;
  date: string;
  start_date: string | null;
  time: string;
  location: string;
  description: string;
  departmentId: string;
  color: string;
}
