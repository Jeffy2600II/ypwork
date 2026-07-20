import type {
  EventStatus,
  TaskStatus,
  TaskPriority,
} from '@/lib/types';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Date Utilities (v3.9.4 — Thailand timezone-aware)
 * ═══════════════════════════════════════════════════════════════
 *
 * ★ v3.9.4: Thailand timezone (Asia/Bangkok, UTC+7) accuracy fix
 *
 * ปัญหาเดิม: การใช้ `new Date()` ตรง ๆ จะอ้างอิงเขตเวลาของเบราว์เซอร์
 *   ถ้า user เปิดเว็บจากต่างประเทศ (เช่น UTC-05:00 สหรัฐฯ) "วันนี้"
 *   จะไม่ตรงกับ "วันนี้" ในไทย → ปฏิทินแสดงวันที่ผิด
 *
 * วิธีแก้: บังคับใช้เขตเวลา Asia/Bangkok (UTC+7) สำหรับทุกการคำนวณ
 *   ที่เกี่ยวกับ "วันนี้", "วันไหนผ่านไปแล้ว", "อีกกี่วัน"
 *
 * หลักการ:
 *   - วันที่ในระบบเก็บเป็น YYYY-MM-DD (ไม่มี timezone)
 *   - การเปรียบเทียบ "วันนี้" ต้องใช้ "วันนี้ในไทย" เสมอ ไม่ใช่
 *     วันที่ของเครื่อง user
 *   - การ์ดงาน ปฏิทิน หน้า today — ทั้งหมดต้องเห็น "วันเดียวกัน" กับที่
 *     user ในไทยเห็น
 *   - เราจึงใช้ `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })`
 *     เพื่อดึง YYYY-MM-DD ของเวลาไทยเสมอ
 * ═══════════════════════════════════════════════════════════════
 */

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
 * ★ v3.9.4: แปลง Date ใด ๆ ให้เป็น "วันที่ในเขตเวลาไทย" (Asia/Bangkok, UTC+7)
 * คืนค่า { year, month (0-11), day, weekday (0=Sun..6=Sat), hours, minutes }
 *
 * ใช้ Intl.DateTimeFormat ซึ่งรองรับ timezone อย่างถูกต้อง
 * (ไม่ใช้ getDate()/getMonth() ของ Date ตรง ๆ เพราะจะอ้างอิง timezone เครื่อง user)
 */
export function getThailandParts(d: Date): {
  year: number;
  month: number;   // 0-11
  day: number;     // 1-31
  weekday: number; // 0=Sun .. 6=Sat
  hours: number;
  minutes: number;
} {
  // ใช้ en-CA เพราะ format คือ YYYY-MM-DD (เรียงตาม ISO 8601)
  // แล้ว split ออกมาเป็น parts
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10) - 1;
  const day = parseInt(map.day, 10);
  const hours = parseInt(map.hour ?? '0', 10) === 24 ? 0 : parseInt(map.hour ?? '0', 10);
  const minutes = parseInt(map.minute ?? '0', 10);

  // แปลง weekday string ("Sun", "Mon", ...) เป็น 0-6
  const weekdayStr = map.weekday ?? ''; // e.g. "Sun"
  const WEEKDAY_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = WEEKDAY_MAP[weekdayStr] ?? 0;

  return { year, month, day, weekday, hours, minutes };
}

/**
 * ★ v3.9.4: สร้าง Date ที่แทน "เที่ยงคืนของวันนั้นในเขตเวลาไทย"
 * เพื่อใช้คำนวณ diff วันแบบแม่นยำ
 *
 * เนื่องจาก Date ใน JS เก็บเป็น timestamp (UTC) เสมอ
 * การสร้าง "midnight Thailand" ต้องคำนวณ offset UTC+7
 */
function thailandMidnight(year: number, month: number, day: number): Date {
  // เที่ยงคืนของไทย = 17:00 UTC ของวันก่อนหน้า
  // เช่น 2024-01-15 00:00 +07:00 = 2024-01-14 17:00 UTC
  // ใช้ Date.UTC แล้วลบ 7 ชั่วโมง
  return new Date(Date.UTC(year, month, day) - 7 * 60 * 60 * 1000);
}

/**
 * แปลงวันที่เป็น "พ.ศ."
 * @param dateStr YYYY-MM-DD
 * @param long true = "12 มกราคม 2568", false = "12 ม.ค. 68"
 */
export function formatDate(dateStr: string, opts: { long?: boolean } = {}): string {
  if (!dateStr) return '';
  // ★ v3.9.4: parse date string เป็น UTC midnight (date-only ไม่มี timezone)
  // แล้วใช้ getThailandParts เพื่อ extract year/month/day ในเขตเวลาไทย
  // อย่างไรก็ตาม เนื่องจาก dateStr เป็น YYYY-MM-DD ไม่มีเวลา
  // เรา parse ตรง ๆ ก็พอ (midnight UTC ของ dateStr ยังคงเป็นวันเดียวกันในไทย)
  const [yStr, mStr, dStr] = dateStr.split('-');
  if (!yStr || !mStr || !dStr) return '';
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
  const monthName = opts.long ? THAI_MONTHS[month] : THAI_MONTHS_SHORT[month];
  const yearBE = year + 543;
  if (opts.long) {
    return `${day} ${monthName} ${yearBE}`;
  }
  return `${day} ${monthName} ${String(yearBE).slice(-2)}`;
}

/**
 * คำนวณ relative day เช่น "วันนี้", "พรุ่งนี้", "เมื่อวาน", "อีก 3 วัน"
 *
 * ★ v3.9.4: ใช้เขตเวลาไทยสำหรับ "วันนี้" และคำนวณ diff แบบแม่นยำ
 *   ผ่าน midnight timestamps ของไทย ไม่ใช้ timezone เครื่อง user
 */
export function relativeDay(dateStr: string): string {
  if (!dateStr) return '';

  // ★ v3.9.4: ดึง "วันนี้ในไทย"
  const todayStr = getLocalTodayStr();
  const today = thailandMidnightFromStr(todayStr);
  const target = thailandMidnightFromStr(dateStr);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'พรุ่งนี้';
  if (diffDays === -1) return 'เมื่อวาน';
  if (diffDays > 0 && diffDays <= 7) return `อีก ${diffDays} วัน`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} วันที่แล้ว`;
  return formatDate(dateStr, { long: false });
}

/** แปลง dateStr (YYYY-MM-DD) เป็น thailand midnight Date */
function thailandMidnightFromStr(dateStr: string): Date {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  return thailandMidnight(year, month, day);
}

/** ตรวจว่าวันที่เป็นวันนี้หรือไม่ (★ v3.9.4: เทียบกับเขตเวลาไทย) */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayStr = getLocalTodayStr();
  return dateStr === todayStr;
}

/** ตรวจว่าวันที่เป็นอดีตหรือไม่ (★ v3.9.4: เทียบกับเขตเวลาไทย) */
export function isPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayStr = getLocalTodayStr();
  return dateStr < todayStr;
}

/** คำนวณความคืบหน้าของงาน (group) เป็นเปอร์เซ็นต์ */
export function eventProgress(tasks: { status: string }[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

/**
 * ★ v3.10.0 (รอบ 8): สถานะที่ควรแสดงผลจริงของ "กลุ่มรายการ"
 * ─────────────────────────────────────────────────────────────
 * ปัญหาเดิม: การ์ดของกลุ่มรายการใน หน้าโฮม/today ใช้ค่า `event.status`
 * ที่เก็บไว้ใน DB ตรง ๆ ซึ่งเป็นค่าที่ตั้งไว้ตอนสร้างกลุ่มรายการเท่านั้น
 * และไม่เคยถูกอัปเดตอัตโนมัติเมื่อรายการย่อยข้างในเปลี่ยนสถานะ — ทำให้
 * กลุ่มรายการที่ทำเสร็จไปแล้วยังคงขึ้นป้าย "ยังไม่เริ่ม" ค้างอยู่
 *
 * ฟังก์ชันนี้คำนวณสถานะของกลุ่มรายการจากรายการย่อยจริง ๆ แทน (ดึงมาจาก
 * event.tasks ที่อัปเดตแบบเรียลไทม์อยู่แล้วผ่าน useRealtimeEvents) กฎ:
 *   - ไม่ใช่กลุ่มรายการ (type === 'task') → ใช้ status ที่เก็บไว้ตามเดิม
 *     (รายการเดี่ยวเปลี่ยนสถานะเองได้โดยตรงอยู่แล้ว ไม่ต้องคำนวณ)
 *   - กลุ่มรายการที่ยังไม่มีรายการย่อยเลย → ใช้ status ที่เก็บไว้ (fallback)
 *   - ทุกรายการย่อยเสร็จหมด → 'done'
 *   - ยังไม่มีรายการย่อยไหนเริ่มเลย (ทุกอันเป็น 'todo') → 'todo'
 *   - นอกเหนือจากนั้น (เสร็จบางส่วน/กำลังทำอยู่บางส่วน) → 'ongoing'
 */
export function resolveEventStatus(event: {
  type: string;
  status: EventStatus;
  tasks?: { status: string }[];
}): EventStatus {
  if (event.type !== 'group') return event.status;

  const tasks = event.tasks || [];
  if (tasks.length === 0) return event.status;

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  if (doneCount === tasks.length) return 'done';

  const noneStarted = tasks.every((t) => t.status === 'todo');
  if (noneStarted) return 'todo';

  return 'ongoing';
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

/**
 * สร้างวันที่แบบ relative (offset จากวันนี้) คืน YYYY-MM-DD
 * ★ v3.9.4: ใช้เขตเวลาไทยสำหรับ "วันนี้"
 */
export function getRelativeDate(offsetDays: number): string {
  const todayStr = getLocalTodayStr();
  const today = thailandMidnightFromStr(todayStr);
  const target = new Date(today.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return getLocalDateStr(target);
}

/**
 * ★ v3.9.4: คืนวันที่ YYYY-MM-DD จาก Date object โดยอ้างอิงเขตเวลาไทย
 * (ก่อนหน้านี้ใช้ getFullYear/getMonth/getDate ซึ่งเป็น timezone เครื่อง user)
 *
 * ถ้า d ถูกสร้างจาก timestamp ใด ๆ จะถูกตีความเป็น "เวลาไทย" เสมอ
 */
export function getLocalDateStr(d: Date): string {
  // ★ v3.9.4: ใช้ getThailandParts เพื่อรับ year/month/day ในไทย
  const parts = getThailandParts(d);
  const y = parts.year;
  const m = String(parts.month + 1).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * ★ v3.9.4: คืน "วันนี้" ในรูปแบบ YYYY-MM-DD โดยใช้เขตเวลาไทย (Asia/Bangkok)
 * ไม่ใช้ toISOString() หรือ new Date().getDate() ตรง ๆ เพราะจะอ้างอิง timezone เครื่อง user
 */
export function getLocalTodayStr(): string {
  return getLocalDateStr(new Date());
}

/** คำนวณจำนวนวันระหว่างวันที่ 2 วัน (★ v3.9.4: ใช้ thailand midnight แม่นยำขึ้น) */
export function daysBetween(startStr: string, endStr: string): number {
  const start = thailandMidnightFromStr(startStr);
  const end = thailandMidnightFromStr(endStr);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * สรุปตามช่วงเวลา: "สวัสดีตอนเช้า/สาย/บ่าย/เย็น/ค่ำ"
 * ★ v3.9.4: ใช้ชั่วโมงในเขตเวลาไทย (UTC+7) แทนชั่วโมงของเครื่อง user
 */
export function getTimeGreeting(): string {
  const parts = getThailandParts(new Date());
  const h = parts.hours;
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนสาย';
  if (h < 19) return 'สวัสดีตอนบ่าย';
  if (h < 22) return 'สวัสดีตอนเย็น';
  return 'สวัสดีตอนค่ำ';
}

/**
 * ★ v3.9.4: คืน parts ของ "วันนี้ในไทย" สำหรับ calendar และ today dashboard
 * สะดวกกว่าเรียก getThailandParts(new Date()) ทุกครั้ง
 */
export function getThailandTodayParts(): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const parts = getThailandParts(new Date());
  return { year: parts.year, month: parts.month, day: parts.day, weekday: parts.weekday };
}
