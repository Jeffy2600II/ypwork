// Path:    src/lib/constants.ts
// Purpose: App-wide constants — status labels, colors, default categories.

import type { TaskPriority, TaskStatus, SubtaskStatus, TaskType } from '@/lib/types';

// ─── App metadata ─────────────────────────────────────────────────

export const APP_NAME = 'ypwork';
export const APP_DESCRIPTION = 'ระบบจัดการงานสภานักเรียน โรงเรียนคำยางพิทยา';
export const APP_VERSION = '1.0.0';

// ─── Status metadata ──────────────────────────────────────────────

export interface StatusMeta {
  value: TaskStatus;
  label: string;
  badgeClass: string;
}

export const TASK_STATUSES: StatusMeta[] = [
  { value: 'todo',            label: 'ยังไม่เริ่ม', badgeClass: 'badge-gray'  },
  { value: 'in_progress',     label: 'กำลังทำ',    badgeClass: 'badge-blue'  },
  { value: 'pending_review',  label: 'รอตรวจ',     badgeClass: 'badge-amber' },
  { value: 'done',            label: 'เสร็จแล้ว',   badgeClass: 'badge-green' },
  { value: 'cancelled',       label: 'ยกเลิก',     badgeClass: 'badge-red'   },
];

export function getStatusMeta(status: TaskStatus): StatusMeta {
  return TASK_STATUSES.find(s => s.value === status) ?? TASK_STATUSES[0];
}

// ─── Subtask status (subset — no pending_review/cancelled) ────────

export interface SubtaskStatusMeta {
  value: SubtaskStatus;
  label: string;
}

export const SUBTASK_STATUSES: SubtaskStatusMeta[] = [
  { value: 'todo',        label: 'ยังไม่เริ่ม' },
  { value: 'in_progress', label: 'กำลังทำ'    },
  { value: 'done',        label: 'เสร็จแล้ว'   },
];

// ─── Priority metadata ────────────────────────────────────────────

export interface PriorityMeta {
  value: TaskPriority;
  label: string;
  shortLabel: string;
  badgeClass: string;
  color: string;
}

export const PRIORITIES: PriorityMeta[] = [
  { value: 'high',   label: 'สูง (P1)',   shortLabel: 'P1', badgeClass: 'badge-red',   color: '#E5484D' },
  { value: 'medium', label: 'กลาง (P2)',  shortLabel: 'P2', badgeClass: 'badge-amber', color: '#E07C12' },
  { value: 'low',    label: 'ต่ำ (P3)',    shortLabel: 'P3', badgeClass: 'badge-gray',  color: '#7A7A7A' },
];

export function getPriorityMeta(priority: TaskPriority): PriorityMeta {
  return PRIORITIES.find(p => p.value === priority) ?? PRIORITIES[1];
}

// ─── Task type metadata ───────────────────────────────────────────

export interface TaskTypeMeta {
  value: TaskType;
  label: string;
  icon: string;
}

export const TASK_TYPES: TaskTypeMeta[] = [
  { value: 'checklist', label: 'Checklist', icon: '✅' },
  { value: 'activity',  label: 'กิจกรรม',    icon: '🎉' },
];

export function getTaskTypeMeta(type: TaskType): TaskTypeMeta {
  return TASK_TYPES.find(t => t.value === type) ?? TASK_TYPES[0];
}

// ─── Kanban columns (5 คอลัมน์ตามสถานะ) ───────────────────────────

export const KANBAN_COLUMNS: TaskStatus[] = [
  'todo',
  'in_progress',
  'pending_review',
  'done',
  'cancelled',
];

// ─── Sidebar navigation items ─────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  view?: 'month' | 'week' | 'day' | 'kanban' | 'list' | 'activities';
}

export const SIDEBAR_NAV: NavItem[] = [
  { id: 'home',        label: 'หน้าแรก',     icon: '🏠' },
  { id: 'all-tasks',   label: 'งานทั้งหมด',   icon: '📋', view: 'list' },
  { id: 'activities',  label: 'กิจกรรม',      icon: '🎉', view: 'activities' },
];

// ─── Mobile bottom nav ────────────────────────────────────────────

export const BOTTOM_NAV: NavItem[] = [
  { id: 'calendar', label: 'ปฏิทิน', icon: '📅', view: 'month' },
  { id: 'tasks',    label: 'งาน',     icon: '📋', view: 'kanban' },
  { id: 'create',   label: 'สร้าง',   icon: '➕' },
  { id: 'profile',  label: 'โปรไฟล์', icon: '👤' },
];

// ─── View tabs (desktop topbar) ───────────────────────────────────

export const VIEW_TABS: { id: 'month' | 'week' | 'day' | 'kanban'; label: string }[] = [
  { id: 'month',  label: 'เดือน'   },
  { id: 'week',   label: 'สัปดาห์'  },
  { id: 'day',    label: 'รายวัน'  },
  { id: 'kanban', label: 'Kanban' },
];

// ─── Default categories (8 ตามแผน) ───────────────────────────────

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'งานประชุม',          icon: '🏫', color: '#3B82F6' },
  { name: 'งานเอกสาร',          icon: '📋', color: '#8B5CF6' },
  { name: 'งานจัดงาน/กิจกรรม',    icon: '🎉', color: '#F59E0B' },
  { name: 'งานประชาสัมพันธ์',     icon: '📢', color: '#22C55E' },
  { name: 'งานดูแลความสะอาด',    icon: '🧹', color: '#6B7280' },
  { name: 'งานการเงิน',          icon: '💰', color: '#EF4444' },
  { name: 'งานวิชาการ',          icon: '📚', color: '#06B6D4' },
  { name: 'อื่นๆ',               icon: '⚙️', color: '#6B7280' },
];

// ─── Thai date formatting ─────────────────────────────────────────

export const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

// ─── Filter options ───────────────────────────────────────────────

export const FILTER_TYPE_OPTIONS: { value: 'all' | TaskType; label: string }[] = [
  { value: 'all',       label: 'ทั้งหมด'    },
  { value: 'checklist', label: 'Checklist' },
  { value: 'activity',  label: 'กิจกรรม'    },
];

export const FILTER_STATUS_OPTIONS: { value: 'all' | TaskStatus; label: string }[] = [
  { value: 'all',            label: 'ทั้งหมด'    },
  { value: 'todo',           label: 'ยังไม่เริ่ม' },
  { value: 'in_progress',    label: 'กำลังทำ'    },
  { value: 'pending_review', label: 'รอตรวจ'     },
  { value: 'done',           label: 'เสร็จแล้ว'   },
  { value: 'cancelled',      label: 'ยกเลิก'     },
];

export const FILTER_PRIORITY_OPTIONS: { value: 'all' | TaskPriority; label: string }[] = [
  { value: 'all',     label: 'ทั้งหมด'    },
  { value: 'high',    label: 'สูง (P1)'   },
  { value: 'medium',  label: 'กลาง (P2)'  },
  { value: 'low',     label: 'ต่ำ (P3)'    },
];
