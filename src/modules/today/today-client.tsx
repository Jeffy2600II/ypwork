'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r35 — การ์ดเดี่ยวทั้งหมด)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 35: เพิ่มพื้นหลังเรียบให้ 3 section หลัก
//   (เลยกำหนด / วันนี้ / กำลังจะถึง) ผ่าน class "yp-today-section--panel"
//   - พื้นหลังสีขาว มุมโค้งเล็กน้อย เต็มขอบจอ (ไม่เว้นด้านข้าง)
//   - เว้นระยะห่างระหว่าง 3 section นี้เพิ่มขึ้น ให้ดูแยกจากกันชัดเจน
//   - section "ภาพรวมแผนก" (ถ้ามี) ไม่ได้รับผลกระทบ ยังคงเดิม
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
// Helper: สร้าง TimelineItems จาก events ของวันใดวันหนึ่ง
// ★ v3.10.0 รอบที่ 33: itemDate ใช้ start_date เป็นหลัก
//   สำหรับ subtask → itemDate = task.start_date || ev.date
//   สำหรับ event → itemDate = ev.start_date || ev.date
// ═══════════════════════════════════════════════════════════════
function buildTimelineItems(events: YPEvent[], dateStr: string, dateContext: string): TimelineItem[] {
  const items: TimelineItem[] = [];
  const dateEvents = events.filter((e) => e.date === dateStr);

  for (const ev of dateEvents) {
    if (ev.type === 'group') {
      const tasks = ev.tasks || [];
      if (tasks.length === 0) {
        items.push({
          id: `ev-${ev.id}`,
          startTime: ev.time || null,
          title: ev.title,
          status: resolveEventStatus(ev),
          accent: ev.color || '#4F46E5',
          parentEvent: ev,
          task: null,
          event: ev,
          assigneeName: null,
          assigneeColor: null,
          priority: 'medium',
          estimatedTime: null,
          dueDate: ev.date,
          location: ev.location || null,
          eventTime: ev.time || null,
          dateContext,
          itemDate: ev.start_date || ev.date,
        });
      } else {
        for (const t of tasks) {
          if (dateContext === 'overdue' && t.status === 'done') continue;
          // ★ รอบที่ 33: ใช้ start_date เป็นหลักในการกำหนด itemDate
          if (dateContext !== 'upcoming' && t.start_date && t.start_date > dateStr) continue;
          items.push({
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
            dueDate: t.due_date || null,
            location: ev.location || null,
            eventTime: ev.time || null,
            dateContext,
            itemDate: t.start_date || ev.start_date || ev.date,
          });
        }
      }
    } else {
      items.push({
        id: `ev-${ev.id}`,
        startTime: ev.time || null,
        title: ev.title,
        status: ev.status,
        accent: ev.color || '#4F46E5',
        parentEvent: null,
        task: null,
        event: ev,
        assigneeName: null,
        assigneeColor: null,
        priority: 'medium',
        estimatedTime: null,
        dueDate: ev.date,
        location: ev.location || null,
        eventTime: ev.time || null,
        dateContext,
        itemDate: ev.start_date || ev.date,
      });
    }
  }

  // ★ standalone tasks (due_date = dateStr แต่ parent event อยู่วันอื่น)
  for (const ev of events) {
    if (ev.date === dateStr) continue;
    for (const t of ev.tasks || []) {
      if (t.due_date === dateStr) {
        if (dateContext === 'overdue' && t.status === 'done') continue;
        if (dateContext !== 'upcoming' && t.start_date && t.start_date > dateStr) continue;
        items.push({
          id: `task-${t.id}`,
          startTime: t.start_time || null,
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
          dueDate: t.due_date || null,
          location: ev.location || null,
          eventTime: ev.time || null,
          dateContext,
          itemDate: t.start_date || ev.start_date || ev.date,
        });
      }
    }
  }

  // เรียงตาม priority → time → title
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    const sa = a.startTime || '';
    const sb = b.startTime || '';
    if (sa && sb && sa !== sb) return sa.localeCompare(sb);
    if (sa && !sb) return -1;
    if (!sa && sb) return 1;
    return a.title.localeCompare(b.title, 'th');
  });

  return items;
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
  // ★ v3.10.0 รอบที่ 33: สร้าง timeline items แยกตาม dateContext
  //   วันนี้, เลยกำหนด, กำลังจะถึง — แยกอย่างชัดเจน
  //   ใช้ itemDate (start_date เป็นหลัก) ในการจัดกลุ่มตามวันที่
  // ═══════════════════════════════════════════════════════════════
  const overdueEvents = events.filter(
    (e) => e.date < todayStr && resolveEventStatus(e) !== 'done'
  );

  // ★ สร้าง overdue items
  const overdueTimelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    for (const ev of overdueEvents) {
      if (ev.type === 'group') {
        const tasks = ev.tasks || [];
        if (tasks.length === 0) {
          items.push({
            id: `ev-${ev.id}`,
            startTime: ev.time || null,
            title: ev.title,
            status: resolveEventStatus(ev),
            accent: ev.color || '#4F46E5',
            parentEvent: ev,
            task: null,
            event: ev,
            assigneeName: null,
            assigneeColor: null,
            priority: 'medium',
            estimatedTime: null,
            dueDate: ev.date,
            location: ev.location || null,
            eventTime: ev.time || null,
            dateContext: 'overdue',
            itemDate: ev.start_date || ev.date,
          });
        } else {
          for (const t of tasks) {
            if (t.status === 'done') continue;
            items.push({
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
              dueDate: t.due_date || null,
              location: ev.location || null,
              eventTime: ev.time || null,
              dateContext: 'overdue',
              itemDate: t.start_date || ev.start_date || ev.date,
            });
          }
        }
      } else {
        items.push({
          id: `ev-${ev.id}`,
          startTime: ev.time || null,
          title: ev.title,
          status: ev.status,
          accent: ev.color || '#4F46E5',
          parentEvent: null,
          task: null,
          event: ev,
          assigneeName: null,
          assigneeColor: null,
          priority: 'medium',
          estimatedTime: null,
          dueDate: ev.date,
          location: ev.location || null,
          eventTime: ev.time || null,
          dateContext: 'overdue',
          itemDate: ev.start_date || ev.date,
        });
      }
    }

    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      // ★ รอบที่ 33: เรียงตาม itemDate (วันที่เริ่ม) ก่อน
      const da = a.itemDate;
      const db = b.itemDate;
      if (da && db && da !== db) return da.localeCompare(db);
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      const sa = a.startTime || '';
      const sb = b.startTime || '';
      if (sa && sb && sa !== sb) return sa.localeCompare(sb);
      if (sa && !sb) return -1;
      if (!sa && sb) return 1;
      return a.title.localeCompare(b.title, 'th');
    });
    return items;
  }, [overdueEvents]);

  const todayTimelineItems = React.useMemo(
    () => buildTimelineItems(events, todayStr, 'today'),
    [events, todayStr]
  );

  const upcomingEvents = events.filter((e) => e.date > todayStr);

  // ★ สร้าง upcoming items — ใช้ itemDate = start_date เป็นหลัก
  const upcomingTimelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    const seenTaskIds = new Set<string>();

    // 1. Events ที่ deadline ในอนาคต
    for (const ev of upcomingEvents) {
      if (ev.type === 'group') {
        const tasks = ev.tasks || [];
        if (tasks.length === 0) {
          items.push({
            id: `ev-${ev.id}`,
            startTime: ev.time || null,
            title: ev.title,
            status: resolveEventStatus(ev),
            accent: ev.color || '#4F46E5',
            parentEvent: ev,
            task: null,
            event: ev,
            assigneeName: null,
            assigneeColor: null,
            priority: 'medium',
            estimatedTime: null,
            dueDate: ev.date,
            location: ev.location || null,
            eventTime: ev.time || null,
            dateContext: 'upcoming',
            itemDate: ev.start_date || ev.date,
          });
        } else {
          for (const t of tasks) {
            if (t.status === 'done') continue;
            seenTaskIds.add(t.id);
            items.push({
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
              dueDate: t.due_date || null,
              location: ev.location || null,
              eventTime: ev.time || null,
              dateContext: 'upcoming',
              // ★ รอบที่ 33: itemDate ใช้ start_date เป็นหลักเสมอ
              itemDate: t.start_date || ev.start_date || ev.date,
            });
          }
        }
      } else {
        items.push({
          id: `ev-${ev.id}`,
          startTime: ev.time || null,
          title: ev.title,
          status: ev.status,
          accent: ev.color || '#4F46E5',
          parentEvent: null,
          task: null,
          event: ev,
          assigneeName: null,
          assigneeColor: null,
          priority: 'medium',
          estimatedTime: null,
          dueDate: ev.date,
          location: ev.location || null,
          eventTime: ev.time || null,
          dateContext: 'upcoming',
          itemDate: ev.start_date || ev.date,
        });
      }
    }

    // ★ รอบที่ 33: 2. Subtasks ที่ start_date ในอนาคต จาก events ทั้งหมด
    for (const ev of events) {
      if (ev.date > todayStr) continue;
      const tasks = ev.tasks || [];
      for (const t of tasks) {
        if (t.status === 'done') continue;
        if (seenTaskIds.has(t.id)) continue;
        if (t.start_date && t.start_date > todayStr) {
          seenTaskIds.add(t.id);
          items.push({
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
            dueDate: t.due_date || null,
            location: ev.location || null,
            eventTime: ev.time || null,
            dateContext: 'upcoming',
            // ★ รอบที่ 33: itemDate = start_date ของ task (สำคัญ!)
            itemDate: t.start_date || ev.start_date || ev.date,
          });
        }
      }
    }

    // ★ รอบที่ 33: เรียงตาม itemDate → priority → time → title
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      const da = a.itemDate;
      const db = b.itemDate;
      if (da && db && da !== db) return da.localeCompare(db);
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      const sa = a.startTime || '';
      const sb = b.startTime || '';
      if (sa && sb && sa !== sb) return sa.localeCompare(sb);
      if (sa && !sb) return -1;
      if (!sa && sb) return 1;
      return a.title.localeCompare(b.title, 'th');
    });

    return items;
  }, [upcomingEvents, events, todayStr]);

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

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleOpenStatusPicker = (item: TimelineItem) => {
    setActiveItem(item);
    setStatusPickerOpen(true);
  };

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

  // ★ รอบที่ 33: render การ์ดแต่ละใบพร้อม section hint
  const renderCardList = (items: TimelineItem[], showHint = false) => (
    <div className="yp-today-card-list">
      {items.map((item) => (
        <TodayItemCard
          key={item.id}
          item={item}
          onOpenStatusPicker={handleOpenStatusPicker}
          todayStr={todayStr}
        />
      ))}
      {showHint ? (
        <div className="yp-today-card-list__hint">
          แตะรายการเพื่อเปลี่ยนสถานะ
        </div>
      ) : null}
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
          {renderCardList(cluster.items, true)}
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
          renderCardList(overdueTimelineItems, true)
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

      {/* ── Toast ── */}
      {toast ? <div className={`yp-toast yp-toast--${toast.type || 'info'}`}>{toast.msg}</div> : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 33: TodayItemCard — การ์ดเดี่ยวสำหรับทุกรายการ
//
//   การออกแบบ:
//   - เหมือน TaskRow ในหน้ารายละเอียดกลุ่มรายการ (border, shadow,
//     pill chips, 2-line layout)
//   - รายการย่อย: มีแถบบอก "รายการย่อย" + ชื่อกลุ่มที่คลิกได้
//     (Link ไปหน้ารายละเอียดกลุ่มรายการ)
//   - รายการธรรมดา: ไม่มีแถบรายการย่อย
//   - แตะที่การ์ด → เปลี่ยนสถานะ
//   - กดลูกศร → ไปหน้ารายละเอียด
// ═══════════════════════════════════════════════════════════════
function TodayItemCard({
  item,
  onOpenStatusPicker,
  todayStr,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
}) {
  const accent = item.accent;
  const detailHref = item.event ? `/events/${item.event.id}` : (item.parentEvent ? `/events/${item.parentEvent.id}` : '#');
  const isOverdue = item.dateContext === 'overdue';
  const isUpcoming = item.dateContext === 'upcoming';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';
  // ★ รอบที่ 33: ระบุว่าเป็นรายการย่อยหรือไม่
  const isSubItem = !!item.parentEvent && !!item.task;

  return (
    <div
      className={`yp-today-item-card${item.status === 'done' ? ' is-done' : ''}${isSubItem ? ' is-subitem' : ''}`}
      style={{ ['--accent' as string]: accent }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStatusPicker(item); } }}
      aria-label={`${item.title}${isSubItem ? ' (รายการย่อย)' : ''} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* ── Status dot ── */}
      <button
        type="button"
        className={`yp-today-item-card__dot yp-today-item-card__dot--${item.status}`}
        aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
        style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
      />

      {/* ── Body (title + chips) ── */}
      <div className="yp-today-item-card__body">
        {/* ★ รอบที่ 33: แถบบอก "รายการย่อย" + ชื่อกลุ่มที่คลิกได้ */}
        {isSubItem && item.parentEvent ? (
          <div className="yp-today-item-card__subtag">
            <span className="yp-today-item-card__subtag-badge">
              <Layers width={11} height={11} />
              รายการย่อย
            </span>
            <Link
              href={`/events/${item.parentEvent.id}`}
              className="yp-today-item-card__subtag-group"
              onClick={(e) => e.stopPropagation()}
              aria-label={`ดูกลุ่มรายการ: ${item.parentEvent.title}`}
            >
              จากกลุ่ม: {item.parentEvent.title}
              <ArrowUpRight width={10} height={10} className="yp-today-item-card__subtag-arrow" />
            </Link>
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

          {/* Time chip */}
          {item.startTime ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--time">
              <Clock width={11} height={11} />
              <span className="yp-today-item-card__chip-label">เวลาเริ่ม</span>
              {item.startTime}
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

          {/* ★ รอบที่ 33: Date chip for overdue — ใช้ itemDate (start_date) */}
          {isOverdue && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due is-overdue">
              <AlertTriangle width={11} height={11} />
              <span className="yp-today-item-card__chip-label">กำหนด</span>
              {relativeDay(item.itemDate)}
            </span>
          ) : null}

          {/* ★ รอบที่ 33: Date chip for upcoming — ใช้ itemDate */}
          {isUpcoming && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due">
              <CalIcon width={11} height={11} />
              <span className="yp-today-item-card__chip-label">เริ่ม</span>
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
      </div>

      {/* ── Detail link ── */}
      <Link
        href={detailHref}
        className="yp-today-item-card__link"
        aria-label={`ดูรายละเอียด: ${item.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronRight width={14} height={14} />
      </Link>
    </div>
  );
}
