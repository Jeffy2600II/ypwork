import type {
  EventStatus,
  TaskStatus,
  TaskPriority,
} from '@/lib/types';

/** Thai month names */
export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/**
 * แปลงวันที่เป็น "พ.ศ."
 * @param dateStr YYYY-MM-DD
 * @param long true = "12 มกราคม 2568", false = "12 ม.ค. 68"
 */
export function formatDate(dateStr: string, opts: { long?: boolean } = {}): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = opts.long ? THAI_MONTHS[d.getMonth()] : THAI_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear() + 543;
  if (opts.long) {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month} ${String(year).slice(-2)}`;
}

/** คำนวณ relative day เช่น "วันนี้", "พรุ่งนี้", "เมื่อวาน", "อีก 3 วัน" */
export function relativeDay(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'พรุ่งนี้';
  if (diffDays === -1) return 'เมื่อวาน';
  if (diffDays > 0 && diffDays <= 7) return `อีก ${diffDays} วัน`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} วันที่แล้ว`;
  return formatDate(dateStr, { long: false });
}

/** ตรวจว่าวันที่เป็นวันนี้หรือไม่ */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return today.getTime() === target.getTime();
}

/** ตรวจว่าวันที่เป็นอดีตหรือไม่ */
export function isPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return target.getTime() < today.getTime();
}

/** คำนวณความคืบหน้าของงาน (group) เป็นเปอร์เซ็นต์ */
export function eventProgress(tasks: { status: string }[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

/** แปลง status code เป็น label ภาษาไทย */
export function statusLabel(status: EventStatus | TaskStatus): string {
  const labels: Record<string, string> = {
    planning: 'วางแผน',
    todo: 'ยังไม่เริ่ม',
    ongoing: 'กำลังทำ',
    done: 'เสร็จแล้ว',
  };
  return labels[status] || status;
}

/** แปลง status code เป็น CSS class สำหรับ chip */
export function statusChipClass(status: EventStatus | TaskStatus): string {
  const classes: Record<string, string> = {
    planning: 'chip--planning',
    todo: 'chip--todo',
    ongoing: 'chip--ongoing',
    done: 'chip--done',
  };
  return classes[status] || 'chip--todo';
}

/** แปลง priority เป็น label */
export function priorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'ต่ำ',
    medium: 'ปานกลาง',
    high: 'สูง',
  };
  return labels[priority];
}

/** สร้างวันที่แบบ relative (offset จากวันนี้) คืน YYYY-MM-DD */
export function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** คำนวณจำนวนวันระหว่างวันที่ 2 วัน */
export function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** สรุปตามช่วงเวลา: "สวัสดีตอนเช้า/สาย/บ่าย/เย็น/ค่ำ" */
export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนสาย';
  if (h < 19) return 'สวัสดีตอนบ่าย';
  if (h < 22) return 'สวัสดีตอนเย็น';
  return 'สวัสดีตอนค่ำ';
}
