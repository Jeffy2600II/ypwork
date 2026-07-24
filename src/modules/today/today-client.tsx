'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r41 — Card Menu + Footer Redesign)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 41: ปรับปรุงการ์ดในหน้า Today รอบนี้โดยเน้น
//   "ลดความสับสน เพิ่มความชัดเจน" เป็นหลักการออกแบบสูงสุด
//   พร้อมเสริม interaction ที่ทันสมัยแบบระดับ award-winning UX
//
//   การปรับปรุงครั้งนี้:
//
//   1. ลบ status dot ที่มุมซ้ายบนของการ์ด "รายการย่อย" ออกทั้งหมด
//      เพราะไม่จำเป็นและทำให้ดูไม่สมดุล — badge "รายการย่อย"
//      ก็บอกอยู่แล้ว ไม่ต้องมี status dot ที่มุมซ้ายบนอีก
//      (การ์ดธรรมดายังคงมี status dot อยู่ เพราะเป็นจุดเริ่มต้นของ
//      card scan และเป็นที่สำหรับคลิกเปลี่ยนสถานะ)
//
//   2. มุมขวาบน: เปลี่ยนจาก chevron arrow เป็น "3 จุดแนวนอน"
//      (MoreHorizontal icon) เป็น pattern มาตรฐานสากล (Material Design,
//      iOS, Linear, Notion ใช้กันหมด) สำหรับ "actions menu"
//      กด 3 จุด → เปิด popup ใต้ปุ่ม → ใน popup มีปุ่ม "ดูเพิ่มเติม"
//
//   3. ปุ่ม "ดูเพิ่มเติม" ใน popup → เปิด Bottom Sheet ขึ้นมา
//      แสดงข้อมูลทั้งหมดของรายการนั้น (status, กำหนดการ, จากกลุ่ม,
//      ผู้รับผิดชอบ, ระยะเวลา, สถานที่, ความสำคัญ) ในรูปแบบที่อ่านง่าย
//      พร้อมปุ่ม "ดูหน้าเต็ม" ที่ลิงก์ไปหน้ารายละเอียด
//      → ผู้ใช้เห็นข้อมูลได้โดยไม่ต้องออกจากหน้า Today
//
//   4. "จากกลุ่ม: XXX" — ย้ายจากด้านบน (subtag row) มาอยู่ด้านล่าง
//      (footer row) และไม่ใช้ Link อีกต่อไป (เป็น text ธรรมดา) เพราะ
//      การคลิกที่ card body จะไปเปิด status picker อยู่แล้ว และการ
//      คลิก "ดูเพิ่มเติม" จะเปิด bottom sheet ที่มีลิงก์ไปกลุ่มอยู่แล้ว
//      → ลด confusion ของ click target
//
//   5. "เวลา" — ย้ายจากมุมขวาบนมาอยู่ด้านล่างฝั่งขวา (footer row)
//      แสดงเป็น "กำหนดการ {วันที่สัมพันธ์} {เวลา} น." แทนการแสดง
//      แค่เวลา เพราะผู้ใช้สับสนว่าตัวเลขนั้นคืออะไร
//      → ตัวคำว่า "กำหนดการ" ต้องแสดงเสมอ เพื่อให้ชัดเจน
//      → สำหรับรายการที่เลยกำหนดแล้ว: ไม่แสดงเวลา เพราะเวลาที่
//        เลยไปแล้วทำให้สับสน (ยังเป็นเวลาเดิมหรือเวลาใหม่?) แสดง
//        เป็น "เลยกำหนด {X วัน}" ใน meta row แทน
//
//   6. การ์ดทั้งหมดมี "footer row" ที่แยกจาก meta row ด้วยเส้นบางๆ
//      (subtle divider) — เพื่อให้ visual hierarchy ชัดเจน:
//      - Top: badge + title + meta (status, priority, assignee, est, location)
//      - Bottom: จากกลุ่ม (left) + กำหนดการ (right)
//
//   หลักการออกแบบ: "มั่นคง นิ่ง สะอาดตา สวยงาม น่าใช้งาน"
//   ใช้แนวทางจากงานวิจัย UX ระดับโลก (Apple HIG, Material Design 3,
//   Linear, Things 3, Notion) แต่ปรับให้เข้ากับแพลตฟอร์มของเรา
//   เป็นไปในทิศทางเดียวกับแพลตฟอร์มของเรา ไม่ก็อปปี้ใคร 100%
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 40 (สืบทอดมา): Pure white card background, ลด
//   decoration ทุกชนิด (accent bar, accent blob, accent guide line)
//   ใช้ typography มาตรฐาน --yp-text-xs (12px) ทุกที่ — ยังคงไว้
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 38 (สืบทอดมา): แก้การแบ่ง section ตาม effectiveStart/
//   effectiveDue (รายการที่เริ่มแล้วแต่ยังไม่ถึงวันส่ง ต้องอยู่ใน "วันนี้")
//   + sub-header เป็น "subtle divider" แทน "section header"
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 37 (สืบทอดมา): ลบ hint "แตะรายการเพื่อเปลี่ยนสถานะ"
//   + section title accent bar + indigo-tinted section count
//   + yp-today-time-section accent-tinted icon และ count chip
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 36: ย้อนกลับการเปลี่ยนแปลงของรอบที่ 35 ทั้งหมด
//   (พื้นหลังขาว มุมโค้ง เต็มขอบจอ) กลับไปเหมือนรอบที่ 33
//   คงไว้แค่อย่างเดียว: ระยะห่างระหว่าง 3 section หลัก
//   (เลยกำหนด / วันนี้ / กำลังจะถึง) ที่เพิ่มขึ้นจากรอบที่ 35
//   class "yp-today-section--panel" ยังคงอยู่ในหน้านี้ (ใช้เป็นตัวช่วย
//   เลือก selector สำหรับระยะห่างเท่านั้น ไม่มีผลด้าน background อีกต่อไป)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 33: ปรับปรุงครั้งใหญ่
//
//   ปัญหารอบที่ 32:
//   1. รายการย่อยในกลุ่มแสดงเป็น list แบบธรรมดา (compact)
//      → ไม่สวยเท่าการ์ดในหน้ารายละเอียดกลุ่มรายการ
//   2. มีกรอบใหญ่ (yp-today-group) ครอบกลุ่มรายการ → รก ซ้ำซ้อน
//   3. รายการย่อยที่คนละวันเริ่ม แต่อยู่กลุ่มเดียวกัน → ถูกรวม
//      อยู่วันที่เดียวกันในส่วน "กำลังจะถึง"
//   4. ไม่ชัดเจนพอว่าอันไหนคือรายการย่อย vs รายการธรรมดา
//
//   สิ่งที่เปลี่ยนรอบที่ 33:
//   - ลบ SmartGroupCard / yp-today-group ทิ้งทั้งหมด
//   - ทุกรายการเป็นการ์ดเดี่ยว (เหมือน TaskRow ในหน้ารายละเอียด)
//     มี border, shadow, pill chips, 2-line layout
//   - รายการย่อยมีตัวบอก "รายการย่อย" + ชื่อกลุ่มที่คลิกได้
//   - แยกตาม start_date อย่างเคร่งครัด — งานที่คนละวันเริ่ม
//     ต้องอยู่คนละวัน/คนละ section อย่างเด็ดขาด
//   - คลิกชื่อกลุ่มรายการ → ไปหน้ารายละเอียดงาน
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import {
  getTimeGreeting,
  getLocalTodayStr,
  getThailandTodayParts,
  resolveEventStatus,
  THAI_DAYS,
  THAI_MONTHS,
  relativeDay,
  statusLabel,
  statusChipClass,
} from '@/lib/utils/date';
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalIcon,
  Flag,
  Check,
  Clock,
  Layers,
  Sunrise,
  Sunset,
  CircleDashed,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  MoreHorizontal,
  Eye,
  MapPin,
  User as UserIcon,
  Timer,
} from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import type { YPEvent, Department, UserProfile, SessionUser, Task, TaskStatus, EventStatus } from '@/lib/types';
import { useRealtimeEvents, useRealtimeDepartments, useRealtimeDeptMembers, useRealtimeSessionUser } from '@/lib/hooks/use-realtime';

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number; done: number; ongoing: number; overdue: number };
}

// ★ v3.10.0: STATUS_META — เหมือน event-detail-client.tsx
const STATUS_META: Record<
  TaskStatus | EventStatus,
  { color: string; label: string; desc: string }
> = {
  planning: { color: '#A78BFA', label: 'วางแผน', desc: 'ยังอยู่ในขั้นวางแผน' },
  todo: { color: '#F59E0B', label: 'รอเริ่ม', desc: 'ยังไม่ได้เริ่มทำ' },
  ongoing: { color: '#6366F1', label: 'กำลังดำเนินการ', desc: 'กำลังดำเนินการอยู่' },
  done: { color: '#10B981', label: 'เสร็จสมบูรณ์', desc: 'ทำเสร็จเรียบร้อยแล้ว' },
};

const PRIORITY_LBL: Record<string, string> = {
  high: 'เร่งด่วน',
  medium: 'ปกติ',
  low: 'ไม่เร่ง',
};

// ═══════════════════════════════════════════════════════════════
// TYPE: TimelineItem — รายการที่จะแสดงใน timeline
// ═══════════════════════════════════════════════════════════════
interface TimelineItem {
  id: string;
  startTime: string | null;
  title: string;
  status: TaskStatus | EventStatus;
  accent: string;
  parentEvent: YPEvent | null;
  task: Task | null;
  event: YPEvent | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string | null;
  dueDate: string | null;
  location: string | null;
  eventTime: string | null;
  /** วันที่ที่รายการนี้อยู่ (สำหรับจัดกลุ่มแสดงผล) */
  dateContext: string;
  /** ★ v3.10.0 รอบที่ 33: วันที่เริ่มจริงของรายการ (สำหรับแยกกลุ่มตามวันที่) */
  itemDate: string;
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 38: การแบ่ง section ตาม effectiveStart / effectiveDue
//   ก่อนหน้านี้ระบบใช้ e.date (วันกำหนดส่ง) เป็นหลักในการแบ่งว่า
//   รายการจะอยู่ใน section ไหน (เลยกำหนด / วันนี้ / กำลังจะถึง)
//   ทำให้รายการที่เริ่มทำแล้วแต่ยังไม่ถึงวันกำหนดส่ง ไปอยู่ใน "กำลังจะถึง"
//   ทั้งที่จริงๆ ผู้ใช้กำลังทำอยู่แล้ว — ผิดจากความตั้งใจของผู้ใช้
//
//   รอบที่ 38 แก้: แบ่งตาม effectiveStart และ effectiveDue ของแต่ละรายการ
//     - "เลยกำหนด": effectiveDue < วันนี้ และยังไม่เสร็จ
//     - "วันนี้":     effectiveStart ≤ วันนี้ ≤ effectiveDue
//     - "กำลังจะถึง": effectiveStart > วันนี้ (ยังไม่เริ่ม)
//
//   กรณีพิเศษ:
//     - ถ้า status === 'done' และ effectiveDue < วันนี้ → ไม่แสดง
//       (ทำเสร็จแล้วและเลยวันกำหนด ไม่ต้องแสดงใน "เลยกำหนด")
//     - ถ้า status === 'done' และ effectiveStart > วันนี้ → ไม่แสดง
//       (ทำเสร็จก่อนวันเริ่ม — กรณีแปลกๆ ไม่ต้องแสดง)
//     - ถ้า status === 'done' และ effectiveStart ≤ วันนี้ ≤ effectiveDue
//       → แสดงใน "วันนี้" (ทำเสร็จแล้วแต่ยังอยู่ในช่วงเวลาที่กำหนด)
// ═══════════════════════════════════════════════════════════════
type ItemDateContext = 'overdue' | 'today' | 'upcoming';

function categorizeByDates(
  effectiveStart: string,
  effectiveDue: string,
  todayStr: string,
  isDone: boolean
): ItemDateContext | null {
  // ถ้าเลยกำหนดส่งและยังไม่เสร็จ → "เลยกำหนด"
  if (effectiveDue < todayStr && !isDone) return 'overdue';

  // ถ้าเริ่มไปแล้วและยังไม่เลยกำหนด → "วันนี้"
  // (รวม done ที่อยู่ในช่วงเวลาที่กำหนดด้วย)
  if (effectiveStart <= todayStr && effectiveDue >= todayStr) return 'today';

  // ถ้ายังไม่เริ่ม → "กำลังจะถึง" (เฉพาะที่ยังไม่เสร็จ)
  if (effectiveStart > todayStr && !isDone) return 'upcoming';

  // กรณีที่เหลือ: done ในอดีต หรือ done ในอนาคต → ไม่แสดง
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Helper: สร้าง TimelineItem จาก standalone event
//   (group ที่ไม่มี task หรือ event ประเภท task)
// ═══════════════════════════════════════════════════════════════
function buildStandaloneEventItem(ev: YPEvent, dateContext: ItemDateContext): TimelineItem {
  return {
    id: `ev-${ev.id}`,
    startTime: ev.time || null,
    title: ev.title,
    status: ev.type === 'group' ? resolveEventStatus(ev) : ev.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev.type === 'group' ? ev : null,
    task: null,
    event: ev.type === 'group' ? null : ev,
    assigneeName: null,
    assigneeColor: null,
    priority: 'medium',
    estimatedTime: null,
    dueDate: ev.date,
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    itemDate: ev.start_date || ev.date,
  };
}

// ═══════════════════════════════════════════════════════════════
// Helper: สร้าง TimelineItem จาก task ในกลุ่ม
//   effectiveStart/effectiveDue คำนวณจาก task ก่อน ถ้าไม่มี fallback ไป event
// ═══════════════════════════════════════════════════════════════
function buildTaskItem(ev: YPEvent, t: Task, dateContext: ItemDateContext): TimelineItem {
  return {
    id: `task-${t.id}`,
    startTime: t.start_time || ev.time || null,
    title: t.title,
    status: t.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev,
    task: t,
    event: null,
    assigneeName: t.assignees?.[0]?.full_name?.split(' ')[0] || null,
    assigneeColor: t.assignees?.[0]?.color || null,
    priority: t.priority || 'medium',
    estimatedTime: t.estimated_time || null,
    dueDate: t.due_date || ev.date,
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    // ★ itemDate ใช้ start_date เป็นหลัก สำหรับจัดกลุ่มแสดงผล
    itemDate: t.start_date || ev.start_date || ev.date,
  };
}

// ═══════════════════════════════════════════════════════════════
// Helper: เรียงลำดับ items — priority → time → title
// ═══════════════════════════════════════════════════════════════
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriorityTimeTitle(a: TimelineItem, b: TimelineItem): number {
  const pa = PRIORITY_ORDER[a.priority] ?? 3;
  const pb = PRIORITY_ORDER[b.priority] ?? 3;
  if (pa !== pb) return pa - pb;
  const sa = a.startTime || '';
  const sb = b.startTime || '';
  if (sa && sb && sa !== sb) return sa.localeCompare(sb);
  if (sa && !sb) return -1;
  if (!sa && sb) return 1;
  return a.title.localeCompare(b.title, 'th');
}

function sortByDatePriorityTimeTitle(a: TimelineItem, b: TimelineItem): number {
  const da = a.itemDate;
  const db = b.itemDate;
  if (da && db && da !== db) return da.localeCompare(db);
  return sortByPriorityTimeTitle(a, b);
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 33: DateCluster — จัดกลุ่ม items ตาม itemDate
//   ใช้แทน SmartGroup + UpcomingDateCluster เดิม
//   แยกตาม itemDate (start_date เป็นหลัก) อย่างเคร่งครัด
//   งานที่คนละวันเริ่ม จะอยู่คนละ cluster อย่างเด็ดขาด
// ═══════════════════════════════════════════════════════════════
interface DateCluster {
  dateKey: string;
  items: TimelineItem[];
  itemCount: number;
}

function buildDateClusters(items: TimelineItem[]): DateCluster[] {
  const clusters: DateCluster[] = [];
  for (const item of items) {
    const dateKey = item.itemDate;
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster && lastCluster.dateKey === dateKey) {
      lastCluster.items.push(item);
      lastCluster.itemCount++;
    } else {
      clusters.push({ dateKey, items: [item], itemCount: 1 });
    }
  }
  return clusters;
}

/** แคปชั่นวันที่เต็ม สำหรับแถบคั่น */
function formatFullDateCaption(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = THAI_DAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `วัน${weekday}ที่ ${day} ${month} ${yearBE}`;
}

// ═══════════════════════════════════════════════════════════════
// Helper: จัดกลุ่ม timeline items ตามช่วงเวลา
// ═══════════════════════════════════════════════════════════════
function buildTimeGroups(items: TimelineItem[]) {
  const morning: TimelineItem[] = [];
  const afternoon: TimelineItem[] = [];
  const unscheduled: TimelineItem[] = [];

  for (const item of items) {
    if (!item.startTime) {
      unscheduled.push(item);
      continue;
    }
    const hour = parseInt(item.startTime.split(':')[0] || '', 10);
    if (!Number.isNaN(hour) && hour < 12) {
      morning.push(item);
    } else {
      afternoon.push(item);
    }
  }
  return { morning, afternoon, unscheduled };
}

export function TodayClient({
  initialEvents,
  user: initialUser,
  dept: initialDept,
  deptMembers: initialDeptMembers,
  deptStats: initialDeptStats,
}: TodayClientProps) {
  const { events, patchEvent, patchTask } = useRealtimeEvents(initialEvents);
  const { user } = useRealtimeSessionUser(initialUser);
  const { departments: liveDepartments } = useRealtimeDepartments(initialDept ? [initialDept] : []);
  const liveDept = user.department_id ? liveDepartments.find((d) => d.id === user.department_id) ?? null : null;
  const { members: liveDeptMembers } = useRealtimeDeptMembers(user.department_id, initialDeptMembers);

  const dept = liveDept ?? initialDept;
  const deptMembers = liveDeptMembers;

  const todayParts = getThailandTodayParts();
  const greeting = getTimeGreeting();
  const dayName = THAI_DAYS[todayParts.weekday];
  const dayNum = todayParts.day;
  const monthName = THAI_MONTHS[todayParts.month];
  const yearBE = todayParts.year + 543;
  const todayLong = `${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
  const todayStr = getLocalTodayStr();

  // ═══════════════════════════════════════════════════════════════
  // ★ v3.10.0 รอบที่ 38: สร้าง timeline items แยกตาม dateContext
  //   โดยใช้ effectiveStart / effectiveDue ของแต่ละรายการ
  //
  //   ก่อนหน้านี้ (รอบที่ 33-37): แบ่ง section ตาม e.date (วันกำหนดส่ง)
  //     - รายการที่เริ่มแล้ว แต่ยังไม่ถึงวันกำหนดส่ง → ไป "กำลังจะถึง"
  //       ทั้งที่จริงๆ ผู้ใช้กำลังทำอยู่แล้ว → ผิด!
  //
  //   รอบที่ 38: แบ่งตาม effectiveStart / effectiveDue ของแต่ละรายการ
  //     - "เลยกำหนด": effectiveDue < วันนี้ และยังไม่เสร็จ
  //     - "วันนี้":     effectiveStart ≤ วันนี้ ≤ effectiveDue
  //     - "กำลังจะถึง": effectiveStart > วันนี้
  //
  //   แต่ละ task ในกลุ่มจะถูกแบ่งด้วยวันที่ของตัวเอง (ถ้ามี) ไม่ใช่
  //   ของ parent event ทั้งกลุ่ม → ทำให้ task ที่เริ่มแล้วในกลุ่มที่ยัง
  //   ไม่ถึงวันส่ง จะไปอยู่ใน "วันนี้" ของผู้ใช้ ไม่ใช่ "กำลังจะถึง"
  // ═══════════════════════════════════════════════════════════════
  const categorizedItems = React.useMemo(() => {
    const overdue: TimelineItem[] = [];
    const today: TimelineItem[] = [];
    const upcoming: TimelineItem[] = [];

    for (const ev of events) {
      if (ev.type === 'group') {
        const tasks = ev.tasks || [];
        if (tasks.length === 0) {
          // Empty group → ใช้วันที่ของ event เอง
          const effectiveStart = ev.start_date || ev.date;
          const effectiveDue = ev.date;
          const isDone = resolveEventStatus(ev) === 'done';
          const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr, isDone);
          if (!ctx) continue;
          const item = buildStandaloneEventItem(ev, ctx);
          if (ctx === 'overdue') overdue.push(item);
          else if (ctx === 'today') today.push(item);
          else upcoming.push(item);
        } else {
          // แต่ละ task แบ่ง section ตามวันที่ของตัวเอง (fallback ไป event)
          for (const t of tasks) {
            const effectiveStart = t.start_date || ev.start_date || ev.date;
            const effectiveDue = t.due_date || ev.date;
            const isDone = t.status === 'done';
            const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr, isDone);
            if (!ctx) continue;
            const item = buildTaskItem(ev, t, ctx);
            if (ctx === 'overdue') overdue.push(item);
            else if (ctx === 'today') today.push(item);
            else upcoming.push(item);
          }
        }
      } else {
        // Standalone task event
        const effectiveStart = ev.start_date || ev.date;
        const effectiveDue = ev.date;
        const isDone = ev.status === 'done';
        const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr, isDone);
        if (!ctx) continue;
        const item = buildStandaloneEventItem(ev, ctx);
        if (ctx === 'overdue') overdue.push(item);
        else if (ctx === 'today') today.push(item);
        else upcoming.push(item);
      }
    }

    // เรียงลำดับ: overdue/upcoming ใช้ date → priority → time → title
    // today ใช้ priority → time → title (ทุกรายการอยู่ในวันเดียวกัน)
    overdue.sort(sortByDatePriorityTimeTitle);
    today.sort(sortByPriorityTimeTitle);
    upcoming.sort(sortByDatePriorityTimeTitle);

    return { overdue, today, upcoming };
  }, [events, todayStr]);

  const overdueTimelineItems = categorizedItems.overdue;
  const todayTimelineItems = categorizedItems.today;
  const upcomingTimelineItems = categorizedItems.upcoming;

  const timeGroups = React.useMemo(
    () => buildTimeGroups(todayTimelineItems),
    [todayTimelineItems]
  );

  // ★ v3.10.0 รอบที่ 33: ใช้ buildDateClusters แทน buildSmartGroups
  //   แยกตาม itemDate อย่างเคร่งครัด
  const overdueDateClusters = React.useMemo(
    () => buildDateClusters(overdueTimelineItems),
    [overdueTimelineItems]
  );

  const upcomingDateClusters = React.useMemo(
    () => buildDateClusters(upcomingTimelineItems),
    [upcomingTimelineItems]
  );

  const todayTotalCount = todayTimelineItems.length;
  const overdueCount = overdueTimelineItems.length;
  const upcomingCount = upcomingTimelineItems.length;

  const deptStats = React.useMemo(() => {
    if (!dept) return initialDeptStats;
    const deptEvents = events.filter((e) => e.department_id === dept.id);
    return {
      total: deptEvents.length,
      done: deptEvents.filter((e) => resolveEventStatus(e) === 'done').length,
      ongoing: deptEvents.filter((e) => { const s = resolveEventStatus(e); return s === 'ongoing' || s === 'planning'; }).length,
      overdue: deptEvents.filter((e) => e.date < todayStr && resolveEventStatus(e) !== 'done').length,
    };
  }, [events, dept, todayStr, initialDeptStats]);

  // ═══════════════════════════════════════════════════════════════
  // STATUS PICKER
  // ═══════════════════════════════════════════════════════════════
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<TimelineItem | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ★ v3.10.0 รอบที่ 41: state สำหรับ 3-dot menu popup และ detail sheet
  //   - menuOpenFor: item ที่กำลังเปิด popup อยู่ (null = ปิด popup)
  //   - detailSheetItem: item ที่กำลังแสดงใน Bottom Sheet "ดูเพิ่มเติม"
  //   ทั้งสองอย่างเป็น singleton — เปิดได้ทีละอัน
  const [menuOpenFor, setMenuOpenFor] = React.useState<TimelineItem | null>(null);
  const [detailSheetItem, setDetailSheetItem] = React.useState<TimelineItem | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleOpenStatusPicker = (item: TimelineItem) => {
    setActiveItem(item);
    setStatusPickerOpen(true);
  };

  // ★ v3.10.0 รอบที่ 41: handler สำหรับ 3-dot menu
  //   - handleOpenCardMenu: เปิด popup ของ item ที่ระบุ (toggle ถ้าเปิดอยู่แล้ว)
  //   - handleCloseCardMenu: ปิด popup
  //   - handleOpenDetailSheet: ปิด popup แล้วเปิด Bottom Sheet แสดงรายละเอียด
  const handleOpenCardMenu = (item: TimelineItem) => {
    setMenuOpenFor((prev) => (prev?.id === item.id ? null : item));
  };
  const handleCloseCardMenu = () => setMenuOpenFor(null);
  const handleOpenDetailSheet = (item: TimelineItem) => {
    setMenuOpenFor(null);
    setDetailSheetItem(item);
  };
  const handleCloseDetailSheet = () => setDetailSheetItem(null);

  const handleStatusChange = async (newStatus: TaskStatus | EventStatus) => {
    if (!activeItem) return;
    const item = activeItem;
    const oldStatus = item.status;
    const isTask = !!item.task;
    const isEvent = !!item.event;

    if (isTask && item.task) patchTask(item.task.id, { status: newStatus as TaskStatus });
    else if (isEvent && item.event) patchEvent(item.event.id, { status: newStatus as EventStatus });

    setStatusPickerOpen(false);
    setActiveItem(null);

    try {
      if (isTask && item.task) {
        const res = await fetch(`/api/tasks/${item.task.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
      } else if (isEvent && item.event) {
        const res = await fetch(`/api/events/${item.event.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
      }
      setToast({ msg: `เปลี่ยนสถานะ "${item.title}" เป็น ${statusLabel(newStatus)}`, type: 'success' });
    } catch (e: any) {
      if (isTask && item.task) patchTask(item.task.id, { status: oldStatus as TaskStatus });
      else if (isEvent && item.event) patchEvent(item.event.id, { status: oldStatus as EventStatus });
      setToast({ msg: `ไม่สามารถเปลี่ยนสถานะ: ${e.message || 'unknown'}`, type: 'error' });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // ★ รอบที่ 33: render การ์ดแต่ละใบ
  //   ★ รอบที่ 37: ลบ hint "แตะรายการเพื่อเปลี่ยนสถานะ" ออกทั้งหมด
  //     เพราะผู้ใช้เข้าใจการโต้ตอบได้เองจากการแตะ ไม่ต้องการ hint ซ้ำ
  //   ★ v3.10.0 รอบที่ 41: ส่ง props ใหม่ให้ TodayItemCard
  //     - isMenuOpen: บอกว่า popup ของการ์ดนี้เปิดอยู่หรือไม่
  //     - onOpenMenu / onCloseMenu: เปิด/ปิด popup
  //     - onViewMore: เปิด Bottom Sheet แสดงรายละเอียด
  const renderCardList = (items: TimelineItem[]) => (
    <div className="yp-today-card-list">
      {items.map((item) => (
        <TodayItemCard
          key={item.id}
          item={item}
          onOpenStatusPicker={handleOpenStatusPicker}
          todayStr={todayStr}
          isMenuOpen={menuOpenFor?.id === item.id}
          onOpenMenu={handleOpenCardMenu}
          onCloseMenu={handleCloseCardMenu}
          onViewMore={handleOpenDetailSheet}
        />
      ))}
    </div>
  );

  // ★ รอบที่ 33: render date cluster (สำหรับ overdue และ upcoming)
  //   แยกตาม itemDate อย่างชัดเจน แต่ละวันมีแถบคั่นของตัวเอง
  const renderDateClusterSection = (
    clusters: DateCluster[],
    icon: React.ReactNode,
    getLabel: (dateKey: string) => string,
    isOverdue = false
  ) => (
    <>
      {clusters.map((cluster) => (
        <div className="yp-today-time-section" key={cluster.dateKey || 'no-date'}>
          <div className="yp-today-time-section__head">
            <span className="yp-today-time-section__icon" aria-hidden="true">
              {icon}
            </span>
            <div className="yp-today-time-section__text">
              <div className="yp-today-time-section__label">
                {cluster.dateKey ? getLabel(cluster.dateKey) : 'ไม่ระบุวันที่'}
              </div>
              <div className="yp-today-time-section__caption">
                {cluster.dateKey ? formatFullDateCaption(cluster.dateKey) : 'ยังไม่ได้กำหนดวันที่'}
              </div>
            </div>
            <span className="yp-today-time-section__count">{cluster.itemCount}</span>
          </div>
          {renderCardList(cluster.items)}
        </div>
      ))}
    </>
  );

  const renderOverdueSection = () => {
    if (overdueCount === 0) return null;
    return (
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title yp-today-section__title--overdue">
            รายการที่เลยกำหนด
          </h2>
          <span className="yp-today-section__count yp-today-section__count--overdue">{overdueCount} รายการ</span>
        </div>
        {/* ★ รอบที่ 33: แยกตามวันที่ด้วย date cluster */}
        {overdueDateClusters.length <= 1 ? (
          renderCardList(overdueTimelineItems)
        ) : (
          renderDateClusterSection(overdueDateClusters, <AlertTriangle width={16} height={16} strokeWidth={2} />, (dk) => relativeDay(dk), true)
        )}
      </section>
    );
  };

  const renderTimeSection = (
    label: string,
    caption: string,
    icon: React.ReactNode,
    items: TimelineItem[],
    sectionKey: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="yp-today-time-section">
        <div className="yp-today-time-section__head">
          <span className="yp-today-time-section__icon" aria-hidden="true">{icon}</span>
          <div className="yp-today-time-section__text">
            <div className="yp-today-time-section__label">{label}</div>
            <div className="yp-today-time-section__caption">{caption}</div>
          </div>
          <span className="yp-today-time-section__count">{items.length}</span>
        </div>
        {renderCardList(items)}
      </div>
    );
  };

  return (
    <div className="yp-page yp-page-enter">
      {/* ── HERO ── */}
      <div className="yp-today-hero yp-hero-enter">
        <div className="yp-today-hero__content">
          <div className="yp-today-hero__greeting">{greeting}</div>
          <div className="yp-today-hero__name">{user.full_name}</div>
          <div className="yp-today-hero__date">{todayLong}</div>
          <div className="yp-today-hero__stats">
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{todayTotalCount}</div>
              <div className="yp-today-hero__stat-label">รายการวันนี้</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{upcomingCount}</div>
              <div className="yp-today-hero__stat-label">กำลังจะถึง</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{overdueCount}</div>
              <div className="yp-today-hero__stat-label">เลยกำหนด</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── OVERDUE ── */}
      {renderOverdueSection()}

      {/* ── TODAY ── */}
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">รายการวันนี้</h2>
          <span className="yp-today-section__count">{todayTotalCount} รายการ</span>
        </div>
        {todayTotalCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true"><span role="img" aria-label="ว่าง">🌤️</span></div>
            <div className="yp-empty__title">ไม่มีรายการวันนี้</div>
            <div className="yp-empty__desc">ว่าง ๆ ลองดูรายการที่กำลังจะถึงด้านล่าง</div>
          </div>
        ) : (
          <>
            {renderTimeSection('ช่วงเช้า', 'เริ่มก่อน 12:00 น.', <Sunrise width={16} height={16} strokeWidth={2} />, timeGroups.morning, 'morning')}
            {renderTimeSection('ช่วงบ่าย', 'เริ่มตั้งแต่ 12:00 น. เป็นต้นไป', <Sunset width={16} height={16} strokeWidth={2} />, timeGroups.afternoon, 'afternoon')}
            {renderTimeSection('ไม่ระบุเวลา', 'ยังไม่ได้กำหนดเวลาเริ่ม', <CircleDashed width={16} height={16} strokeWidth={2} />, timeGroups.unscheduled, 'unscheduled')}
          </>
        )}
      </section>

      {/* ── UPCOMING ── */}
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">กำลังจะถึง</h2>
          <span className="yp-today-section__count">{upcomingCount} รายการ</span>
        </div>
        {upcomingCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true"><span role="img" aria-label="ว่าง">📅</span></div>
            <div className="yp-empty__title">ยังไม่มีรายการที่กำลังจะถึง</div>
            <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างรายการใหม่</div>
          </div>
        ) : (
          /* ★ v3.10.0 รอบที่ 33: แยกตาม itemDate (start_date) อย่างเคร่งครัด
             รายการย่อยที่คนละวันเริ่ม จะอยู่คนละแถบคั่นวันที่อย่างเด็ดขาด */
          renderDateClusterSection(
            upcomingDateClusters,
            <CalIcon width={16} height={16} strokeWidth={2} />,
            (dk) => relativeDay(dk),
            false
          )
        )}
      </section>

      {/* ── DEPARTMENT OVERVIEW ── */}
      {dept ? (
        <section className="yp-today-section">
          <div className="yp-today-section__head">
            <h2 className="yp-today-section__title">{dept.icon || '◎'} ภาพรวม{dept.name}</h2>
          </div>
          <div className="yp-stat-grid">
            <div className="yp-stat" style={{ ['--accent' as string]: dept.color }}>
              <div className="yp-stat__icon"><Flag width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.total}</div>
              <div className="yp-stat__label">รายการทั้งหมด</div>
            </div>
            <div className="yp-stat" style={{ ['--accent' as string]: '#10B981' }}>
              <div className="yp-stat__icon"><Check width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.done}</div>
              <div className="yp-stat__label">เสร็จสมบูรณ์</div>
            </div>
            <div className="yp-stat" style={{ ['--accent' as string]: dept.color }}>
              <div className="yp-stat__icon"><Clock width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.ongoing}</div>
              <div className="yp-stat__label">กำลังดำเนินการ</div>
            </div>
            <div className="yp-stat" style={{ ['--accent' as string]: '#F43F5E' }}>
              <div className="yp-stat__icon"><AlertCircle width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.overdue}</div>
              <div className="yp-stat__label">เลยกำหนด</div>
            </div>
          </div>
          <div className="yp-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div className="yp-avatar-group">
                {deptMembers.slice(0, 6).map((m) => (
                  <span key={m.auth_uid} className="yp-avatar" style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 'var(--yp-radius-pill)', overflow: 'hidden', boxShadow: 'var(--yp-shadow-xs)', border: '2px solid white' }} title={m.full_name}>
                    <Avatar name={m.full_name} color={m.color} size={28} />
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 'var(--yp-text-xs)', color: 'var(--yp-text-muted)' }}>สมาชิก {deptMembers.length} คน</div>
            </div>
            {dept.description ? (
              <div style={{ fontSize: 'var(--yp-text-xs)', color: 'var(--yp-text-body)', lineHeight: 1.5 }}>{dept.description}</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── STATUS PICKER SHEET ── */}
      <BottomSheet
        open={statusPickerOpen}
        onClose={() => { setStatusPickerOpen(false); setActiveItem(null); }}
        title="สถานะของรายการ"
        description={activeItem?.title}
      >
        <div className="yp-status-picker">
          {activeItem ? (
            (activeItem.task
              ? (['todo', 'ongoing', 'done'] as TaskStatus[])
              : (['todo', 'ongoing', 'done'] as EventStatus[])
            ).map((s) => {
              const meta = STATUS_META[s];
              const isCurrent = activeItem.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  className={`yp-status-picker__option${isCurrent ? ' is-current' : ''}`}
                  style={{ ['--status-color' as string]: meta.color }}
                  onClick={() => handleStatusChange(s)}
                >
                  <div className="yp-status-picker__icon">
                    {s === 'done' ? <Check width={16} height={16} /> : s === 'ongoing' ? <RefreshCw width={14} height={14} /> : <Clock width={14} height={14} />}
                  </div>
                  <div className="yp-status-picker__text">
                    <div className="yp-status-picker__label">{meta.label}</div>
                    <div className="yp-status-picker__desc">{meta.desc}</div>
                  </div>
                  {isCurrent ? <div className="yp-status-picker__check"><Check width={18} height={18} /></div> : null}
                </button>
              );
            })
          ) : null}
        </div>
      </BottomSheet>

      {/* ── ★ v3.10.0 รอบที่ 41: DETAIL SHEET (เปิดจากปุ่ม "ดูเพิ่มเติม") ──
         แสดงข้อมูลทั้งหมดของรายการในรูปแบบที่อ่านง่าย พร้อมปุ่ม
         "ดูหน้าเต็ม" ที่ลิงก์ไปหน้ารายละเอียดแบบเต็ม */}
      <BottomSheet
        open={!!detailSheetItem}
        onClose={handleCloseDetailSheet}
        title={detailSheetItem?.title}
        description={detailSheetItem && (detailSheetItem.task && detailSheetItem.parentEvent) ? 'รายการย่อย' : 'รายการ'}
      >
        {detailSheetItem ? (() => {
          const di = detailSheetItem;
          const diIsSubItem = !!di.parentEvent && !!di.task;
          const diDetailHref = di.event ? `/events/${di.event.id}` : (di.parentEvent ? `/events/${di.parentEvent.id}` : '#');
          const diIsOverdue = di.dateContext === 'overdue';
          const diIsToday = di.dateContext === 'today';
          const diIsUpcoming = di.dateContext === 'upcoming';
          const diStatusMeta = STATUS_META[di.status];
          const diPriorityLbl = PRIORITY_LBL[di.priority || 'medium'] || 'ปกติ';
          // ★ คำนวณ schedule text สำหรับ detail sheet (เหมือนในการ์ด)
          const diScheduleText: string | null = (() => {
            if (diIsOverdue) {
              // สำหรับ overdue: แสดงวันที่เดิมที่ครบกำหนด ไม่ใช่เวลา
              if (di.itemDate && di.itemDate !== todayStr) {
                return `เลยกำหนด ${relativeDay(di.itemDate)}`;
              }
              return 'เลยกำหนด';
            }
            if (!di.startTime) return null;
            if (diIsToday) {
              if (di.itemDate !== todayStr) {
                // เริ่มในอดีต แต่ยังอยู่ในช่วง "วันนี้"
                return `เริ่ม ${relativeDay(di.itemDate)} ${di.startTime} น.`;
              }
              return `วันนี้ ${di.startTime} น.`;
            }
            if (diIsUpcoming && di.itemDate) {
              return `${relativeDay(di.itemDate)} ${di.startTime} น.`;
            }
            return null;
          })();

          return (
            <div className="yp-card-detail">
              {/* Status row */}
              <div className="yp-card-detail__row">
                <div className="yp-card-detail__label">
                  <span className="yp-card-detail__label-text">สถานะ</span>
                </div>
                <div className="yp-card-detail__value">
                  <span
                    className={`yp-card-detail__chip yp-card-detail__chip--status yp-card-detail__chip--status-${di.status}`}
                    style={{ ['--status-color' as string]: diStatusMeta.color }}
                  >
                    {di.status === 'done' ? <Check width={12} height={12} /> : di.status === 'ongoing' ? <RefreshCw width={12} height={12} /> : <Clock width={12} height={12} />}
                    {diStatusMeta.label}
                  </span>
                </div>
              </div>

              {/* Schedule row */}
              {diScheduleText ? (
                <div className="yp-card-detail__row">
                  <div className="yp-card-detail__label">
                    <Clock width={14} height={14} />
                    <span className="yp-card-detail__label-text">กำหนดการ</span>
                  </div>
                  <div className="yp-card-detail__value">
                    <span className={`yp-card-detail__schedule${diIsOverdue ? ' is-overdue' : ''}`}>
                      {diScheduleText}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* From group row (sub-items only) */}
              {diIsSubItem && di.parentEvent ? (
                <div className="yp-card-detail__row">
                  <div className="yp-card-detail__label">
                    <Layers width={14} height={14} />
                    <span className="yp-card-detail__label-text">จากกลุ่ม</span>
                  </div>
                  <div className="yp-card-detail__value">
                    <Link
                      href={`/events/${di.parentEvent.id}`}
                      className="yp-card-detail__link"
                      onClick={handleCloseDetailSheet}
                    >
                      {di.parentEvent.title}
                      <ArrowUpRight width={12} height={12} />
                    </Link>
                  </div>
                </div>
              ) : null}

              {/* Assignee row */}
              {di.assigneeName ? (
                <div className="yp-card-detail__row">
                  <div className="yp-card-detail__label">
                    <UserIcon width={14} height={14} />
                    <span className="yp-card-detail__label-text">ผู้รับผิดชอบ</span>
                  </div>
                  <div className="yp-card-detail__value">
                    <span className="yp-card-detail__assignee">
                      {di.assigneeColor ? <Avatar name={di.assigneeName} color={di.assigneeColor} size={20} /> : null}
                      {di.assigneeName}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Estimated time row */}
              {di.estimatedTime ? (
                <div className="yp-card-detail__row">
                  <div className="yp-card-detail__label">
                    <Timer width={14} height={14} />
                    <span className="yp-card-detail__label-text">ระยะเวลา</span>
                  </div>
                  <div className="yp-card-detail__value">{di.estimatedTime}</div>
                </div>
              ) : null}

              {/* Location row */}
              {di.location ? (
                <div className="yp-card-detail__row">
                  <div className="yp-card-detail__label">
                    <MapPin width={14} height={14} />
                    <span className="yp-card-detail__label-text">สถานที่</span>
                  </div>
                  <div className="yp-card-detail__value">{di.location}</div>
                </div>
              ) : null}

              {/* Priority row */}
              <div className="yp-card-detail__row">
                <div className="yp-card-detail__label">
                  <Flag width={14} height={14} />
                  <span className="yp-card-detail__label-text">ความสำคัญ</span>
                </div>
                <div className="yp-card-detail__value">
                  <span className={`yp-card-detail__priority yp-card-detail__priority--${di.priority || 'medium'}`}>
                    {diPriorityLbl}
                  </span>
                </div>
              </div>

              {/* CTA: open full detail page */}
              <Link
                href={diDetailHref}
                className="yp-card-detail__cta"
                onClick={handleCloseDetailSheet}
              >
                ดูหน้าเต็ม
                <ChevronRight width={14} height={14} />
              </Link>
            </div>
          );
        })() : null}
      </BottomSheet>

      {/* ── Toast ── */}
      {toast ? <div className={`yp-toast yp-toast--${toast.type || 'info'}`}>{toast.msg}</div> : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 41: TodayItemCard — Card Menu + Footer Redesign
//
//   โครงสร้างการ์ดใหม่:
//   - มุมซ้ายบน: status dot (เฉพาะการ์ดธรรมดา — รายการย่อยไม่มี
//     เพราะ badge "รายการย่อย" ก็บอกอยู่แล้ว และทำให้ดูไม่สมดุล)
//   - มุมขวาบน: 3-dot menu (แทน chevron arrow) — กดแล้วเปิด popup
//     ใต้ปุ่ม ใน popup มีปุ่ม "ดูเพิ่มเติม" ที่เปิด Bottom Sheet
//   - Body: badge (รายการย่อย) + title + meta (status, priority, ...)
//   - Footer (ใหม่!): แยกจาก meta ด้วยเส้นบางๆ
//     - ซ้าย: "จากกลุ่ม: XXX" (เฉพาะรายการย่อย, เป็น text ไม่ใช่ link)
//     - ขวา: "กำหนดการ {วัน} {เวลา} น." (เฉพาะ today/upcoming ที่มีเวลา)
//       - ไม่แสดงสำหรับ overdue เพราะเวลาที่เลยไปแล้วทำให้สับสน
//   - Popup: เมนูขนาดเล็กที่เปิดจาก 3-dot button
//     - มี overlay จับ click นอก popup เพื่อปิด
//     - มีปุ่ม "ดูเพิ่มเติม" ที่เปิด Bottom Sheet
//
//   ★ v3.10.0 รอบที่ 33 (สืบทอดมา): รายการย่อยมี badge "รายการย่อย"
//   ★ v3.10.0 รอบที่ 40 (สืบทอดมา): pure white background, ลด decoration
//   ★ v3.10.0 รอบที่ 38 (สืบทอดมา): ใช้ itemDate (effectiveStart) สำหรับ date chip
// ═══════════════════════════════════════════════════════════════
function TodayItemCard({
  item,
  onOpenStatusPicker,
  todayStr,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onViewMore,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
  isMenuOpen: boolean;
  onOpenMenu: (item: TimelineItem) => void;
  onCloseMenu: () => void;
  onViewMore: (item: TimelineItem) => void;
}) {
  const accent = item.accent;
  const detailHref = item.event ? `/events/${item.event.id}` : (item.parentEvent ? `/events/${item.parentEvent.id}` : '#');
  const isOverdue = item.dateContext === 'overdue';
  const isUpcoming = item.dateContext === 'upcoming';
  const isToday = item.dateContext === 'today';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';
  // ★ รอบที่ 33: ระบุว่าเป็นรายการย่อยหรือไม่
  const isSubItem = !!item.parentEvent && !!item.task;

  // ★ v3.10.0 รอบที่ 41: คำนวณ schedule label สำหรับ footer
  //   - overdue: ไม่แสดง (เวลาที่เลยไปแล้วทำให้สับสน)
  //   - today (itemDate === todayStr): "กำหนดการ วันนี้ HH:MM น."
  //   - today (itemDate < todayStr): ไม่แสดง (เริ่มไปแล้ว ตัวเลขเวลาไม่ใช่
  //     กำหนดการของวันนี้ — แสดงแล้วสับสน)
  //   - upcoming: "กำหนดการ {relativeDay} HH:MM น."
  //   เหตุผล: ผู้ใช้สับสนเวลาเห็นแค่ตัวเลขเวลา (เช่น "14:00") เพราะไม่รู้ว่า
  //   เป็นเวลาของวันไหน และไม่รู้ว่าเป็นอะไร (เริ่ม? จบ? ครบกำหนด?)
  //   การเติม "กำหนดการ" + วันที่สัมพันธ์ ทำให้ชัดเจนทันที
  const scheduleLabel: string | null = (() => {
    if (isOverdue) return null;
    if (!item.startTime) return null;
    if (isToday) {
      // ถ้า itemDate ไม่ใช่วันนี้ → เริ่มไปแล้ว ไม่แสดง schedule
      if (item.itemDate !== todayStr) return null;
      return `กำหนดการ วันนี้ ${item.startTime} น.`;
    }
    if (isUpcoming && item.itemDate) {
      return `กำหนดการ ${relativeDay(item.itemDate)} ${item.startTime} น.`;
    }
    return null;
  })();

  // ★ v3.10.0 รอบที่ 41: แสดง footer ถ้ามี "จากกลุ่ม" หรือ schedule
  const showFooter = (isSubItem && !!item.parentEvent) || !!scheduleLabel;

  return (
    <div
      className={`yp-today-item-card${item.status === 'done' ? ' is-done' : ''}${isSubItem ? ' is-subitem' : ''}${isMenuOpen ? ' is-menu-open' : ''}`}
      style={{
        ['--accent' as string]: accent,
      }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStatusPicker(item); } }}
      aria-label={`${item.title}${isSubItem ? ' (รายการย่อย)' : ''} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* ── Status dot — เฉพาะการ์ดธรรมดา (รายการย่อยไม่มี) ──
         ★ v3.10.0 รอบที่ 41: ลบ status dot ออกจากรายการย่อย เพราะ
           1. badge "รายการย่อย" ก็บอกอยู่แล้ว ไม่ต้องมี indicator ซ้ำ
           2. มี status dot อยู่มุมซ้ายบนทำให้การ์ดรายการย่อยดูไม่สมดุล
           3. ผู้ใช้ยังเปลี่ยนสถานะได้โดยคลิกที่ card body */}
      {!isSubItem ? (
        <button
          type="button"
          className={`yp-today-item-card__dot yp-today-item-card__dot--${item.status}`}
          aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
          onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
          style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
        />
      ) : null}

      {/* ── Body (badge + title + meta + footer) ── */}
      <div className="yp-today-item-card__body">
        {/* ★ v3.10.0 รอบที่ 41: subtag มีแค่ badge "รายการย่อย"
           (เดิมมี Link "จากกลุ่ม" ด้วย แต่ย้ายไป footer แล้ว เป็น text
           ธรรมดาไม่ใช่ link) */}
        {isSubItem ? (
          <div className="yp-today-item-card__subtag">
            <span className="yp-today-item-card__subtag-badge">
              <Layers width={11} height={11} />
              รายการย่อย
            </span>
          </div>
        ) : null}

        <div className="yp-today-item-card__title">{item.title}</div>
        <div className="yp-today-item-card__meta">
          {/* Status chip */}
          <span className={`yp-today-item-card__chip yp-today-item-card__status yp-today-item-card__status--${item.status}`}>
            {item.status === 'done' ? <Check width={11} height={11} /> : item.status === 'ongoing' ? <RefreshCw width={11} height={11} /> : <Clock width={11} height={11} />}
            {statusLabel(item.status)}
          </span>

          {/* Priority chip */}
          {priority !== 'medium' ? (
            <span className={`yp-today-item-card__chip yp-today-item-card__priority is-priority-${priority}`}>
              {priorityLbl}
            </span>
          ) : null}

          {/* Assignee chip */}
          {item.assigneeName ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--assignee">
              {item.assigneeColor ? <Avatar name={item.assigneeName} color={item.assigneeColor} size={16} /> : null}
              {item.assigneeName}
            </span>
          ) : null}

          {/* Est time chip */}
          {item.estimatedTime ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--est">
              <Clock width={11} height={11} />
              <span className="yp-today-item-card__chip-label">ใช้เวลา</span>
              {item.estimatedTime}
            </span>
          ) : null}

          {/* Location chip */}
          {item.location ? (
            <span className="yp-today-item-card__chip">{item.location}</span>
          ) : null}

          {/* ★ รอบที่ 33: Date chip for overdue — ใช้ itemDate (start_date)
             ★ v3.10.0 รอบที่ 41: ปรับ label จาก "กำหนด" เป็น "เลยกำหนด"
             เพื่อให้ชัดเจนว่ารายการนี้เลยกำหนดไปแล้ว ไม่ใช่กำหนดการในอนาคต */}
          {isOverdue && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due is-overdue">
              <AlertTriangle width={11} height={11} />
              <span className="yp-today-item-card__chip-label">เลยกำหนด</span>
              {relativeDay(item.itemDate)}
            </span>
          ) : null}

          {/* ★ v3.10.0 รอบที่ 41: Date chip for upcoming — ปรับ label
             จาก "เริ่ม" เป็น "จะเริ่ม" เพื่อให้ชัดเจนว่าเป็นวันในอนาคต
             และไม่แสดงถ้ามี scheduleLabel แล้ว (scheduleLabel จะบอก
             วันที่และเวลาใน footer อยู่แล้ว ไม่ต้องซ้ำ) */}
          {isUpcoming && item.itemDate && item.itemDate !== todayStr && !scheduleLabel ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due">
              <CalIcon width={11} height={11} />
              <span className="yp-today-item-card__chip-label">จะเริ่ม</span>
              {relativeDay(item.itemDate)}
            </span>
          ) : null}

          {/* ★ รอบที่ 33: ถ้าเป็น standalone task ที่มาจาก event อื่น
              (ไม่ใช่ sub-item แต่เป็น standalone task ที่ due_date ตรง)
              แสดง "จาก:" chip */}
          {!isSubItem && item.parentEvent && item.parentEvent.date !== todayStr && !isOverdue && !isUpcoming ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--from">
              ↪ จาก: {item.parentEvent.title}
            </span>
          ) : null}
        </div>

        {/* ★ v3.10.0 รอบที่ 41: Footer row — แยกจาก meta ด้วยเส้นบางๆ
           - ซ้าย: "จากกลุ่ม: XXX" (เฉพาะรายการย่อย, เป็น text ไม่ใช่ link)
           - ขวา: schedule label (today/upcoming ที่มีเวลา)
           ใช้ justify-content: space-between เพื่อจัดวาง */}
        {showFooter ? (
          <div className="yp-today-item-card__footer">
            {isSubItem && item.parentEvent ? (
              <span className="yp-today-item-card__source">
                จากกลุ่ม: {item.parentEvent.title}
              </span>
            ) : null}
            {scheduleLabel ? (
              <span className="yp-today-item-card__schedule">
                <Clock width={12} height={12} />
                {scheduleLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── ★ v3.10.0 รอบที่ 41: 3-dot menu (แทน chevron arrow) ──
         pattern มาตรฐานสากลสำหรับ "actions menu" (Material Design,
         iOS, Linear, Notion ใช้กันหมด) กดแล้วเปิด popup ใต้ปุ่ม */}
      <button
        type="button"
        className="yp-today-item-card__menu"
        aria-label="ตัวเลือกเพิ่มเติม"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={(e) => {
          e.stopPropagation();
          if (isMenuOpen) onCloseMenu();
          else onOpenMenu(item);
        }}
      >
        <MoreHorizontal width={16} height={16} />
      </button>

      {/* ── ★ v3.10.0 รอบที่ 41: Popup menu (เปิดจาก 3-dot button) ──
         - overlay: จับ click นอก popup เพื่อปิด (position: fixed เต็มจอ)
         - popup: เมนูขนาดเล็ก มีปุ่ม "ดูเพิ่มเติม" ที่เปิด Bottom Sheet */}
      {isMenuOpen ? (
        <>
          <div
            className="yp-today-item-card__popup-overlay"
            onClick={(e) => { e.stopPropagation(); onCloseMenu(); }}
            aria-hidden="true"
          />
          <div className="yp-today-item-card__popup" role="menu">
            <button
              type="button"
              className="yp-today-item-card__popup-item"
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); onViewMore(item); }}
            >
              <Eye width={14} height={14} />
              ดูเพิ่มเติม
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
