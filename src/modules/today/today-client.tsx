'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r28 — redesign cards)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 28: ปรับปรุงการออกแบบการ์ดให้กว้างสมดุลมั่นคง
//   ศึกษาจาก TaskRow ในหน้ากลุ่มรายการ (event-detail-client.tsx)
//   และแพลตฟอร์มขนาดใหญ่ (Google Calendar, Todoist, Things)
//
//   ปัญหารอบที่ 27:
//   1. การ์ดสูงเกิน/กว้างไม่พอ → aspect ratio ไม่สมดุล
//   2. รายการย่อยแสดงเป็น flat row → ไม่มี visual weight
//   3. Smart grouping ยุบรวมข้ามวันที่ → ไม่ชัดเจน
//   4. คุณภาพการออกแบบไม่สู้หน้าอื่นได้
//
//   สิ่งที่เปลี่ยนรอบที่ 28:
//   - ทุกรายการเป็นการ์ดเต็มรูปแบบ (เหมือน TaskRow) — มี border,
//     shadow, pill chips, 2-line layout (title + meta)
//   - Smart Grouping: แยกตามวันที่อย่างชัดเจน
//     วันนี้ยุบรวมกันได้ (ถ้าเวลาใกล้ + กลุ่มเดียวกัน + ไม่มีตัวแทรก)
//     แต่ข้ามวันที่ (เลยกำหนด vs วันนี้ vs กำลังจะถึง) แยกเด็ดขาด
//   - Group header เป็น slim accent banner
//   - รายการย่อยในกลุ่มเป็น mini-card แต่ละอัน (ไม่ใช่ flat row)
//   - pill chips เหมือน TaskRow: status, time, priority, assignee, est
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

// ★ v3.10.0 รอบที่ 27-28: STATUS_META — เหมือน event-detail-client.tsx เป๊ะๆ
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
  /** ★ v3.10.0 รอบที่ 28: date context — วันที่ที่รายการนี้อยู่ */
  dateContext: string;
}

// ═══════════════════════════════════════════════════════════════
// Helper: สร้าง TimelineItems จาก events ของวันใดวันหนึ่ง
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
        });
      } else {
        for (const t of tasks) {
          // ★ ถ้าเลยกำหนด แสดงเฉพาะรายการย่อยที่ยังไม่เสร็จ
          if (dateContext === 'overdue' && t.status === 'done') continue;
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
      });
    }
  }

  // ★ standalone tasks (due_date = dateStr แต่ parent event อยู่วันอื่น)
  for (const ev of events) {
    if (ev.date === dateStr) continue;
    for (const t of ev.tasks || []) {
      if (t.due_date === dateStr) {
        if (dateContext === 'overdue' && t.status === 'done') continue;
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
        });
      }
    }
  }

  // เรียงตามเวลา → priority → title
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
// ★ v3.10.0 รอบที่ 28: Smart Group — แยกตาม dateContext อย่างชัดเจน
//   ถ้าคนละวันที่ → แยก group เด็ดขาด ไม่ยุบรวม
//   ยุบรวมเฉพาะ: วันเดียวกัน + กลุ่มเดียวกัน + ไม่มีตัวแทรก
// ═══════════════════════════════════════════════════════════════
interface SmartGroup {
  groupId: string;
  items: TimelineItem[];
  accent: string;
  parentTitle: string | null;
  parentEvent: YPEvent | null;
  isSingle: boolean;
  dateContext: string;
}

function buildSmartGroups(items: TimelineItem[]): SmartGroup[] {
  const result: SmartGroup[] = [];
  let currentGroup: SmartGroup | null = null;

  for (const item of items) {
    const groupKey = item.parentEvent?.id || (item.event?.id ? `single-${item.event.id}` : `single-${item.id}`);
    // ★ v3.10.0 รอบที่ 28: ต้องเป็น dateContext เดียวกัน + groupKey เดียวกัน + อยู่ติดกัน
    const shouldMerge = currentGroup
      && currentGroup.groupId === groupKey
      && currentGroup.dateContext === item.dateContext;

    if (shouldMerge && currentGroup) {
      currentGroup.items.push(item);
    } else {
      if (currentGroup) result.push(currentGroup);
      currentGroup = {
        groupId: groupKey,
        items: [item],
        accent: item.accent,
        parentTitle: item.parentEvent?.title || null,
        parentEvent: item.parentEvent || null,
        isSingle: !item.parentEvent && !!item.event,
        dateContext: item.dateContext,
      };
    }
  }
  if (currentGroup) result.push(currentGroup);
  return result;
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
  // ★ v3.10.0 รอบที่ 28: สร้าง timeline items แยกตาม dateContext
  //   วันนี้, เลยกำหนด, กำลังจะถึง — แยกอย่างชัดเจน
  // ═══════════════════════════════════════════════════════════════
  const overdueEvents = events.filter(
    (e) => e.date < todayStr && resolveEventStatus(e) !== 'done'
  );

  // ★ สร้าง overdue items — แยกตามวันที่ของ event แต่ละวัน
  const overdueTimelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    for (const ev of overdueEvents) {
      // แต่ละ overdue event → สร้าง items ด้วย dateContext = 'overdue'
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
        });
      }
    }

    // เรียง: เก่าสุดก่อน (date) → time → priority
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      const da = a.parentEvent?.date || a.dueDate || '';
      const db = b.parentEvent?.date || b.dueDate || '';
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

  const upcoming = events.filter((e) => e.date > todayStr).slice(0, 4);

  // ★ สร้าง upcoming items แยก dateContext = 'upcoming'
  const upcomingTimelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    for (const ev of upcoming) {
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
          });
        } else {
          // ★ upcoming: แสดงเฉพาะรายการย่อยที่ยังไม่เสร็จ (เพื่อความสะดวก)
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
              dateContext: 'upcoming',
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
        });
      }
    }
    return items;
  }, [upcoming]);

  const timeGroups = React.useMemo(
    () => buildTimeGroups(todayTimelineItems),
    [todayTimelineItems]
  );

  const smartGroupedItems = React.useMemo(
    () => buildSmartGroups([...timeGroups.morning, ...timeGroups.afternoon, ...timeGroups.unscheduled]),
    [timeGroups]
  );

  const overdueSmartGroups = React.useMemo(
    () => buildSmartGroups(overdueTimelineItems),
    [overdueTimelineItems]
  );

  const upcomingSmartGroups = React.useMemo(
    () => buildSmartGroups(upcomingTimelineItems),
    [upcomingTimelineItems]
  );

  const todayTotalCount = todayTimelineItems.length;
  const overdueCount = overdueTimelineItems.length;
  const upcomingCount = upcoming.length;

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
  // STATUS PICKER — เหมือนหน้ากลุ่มรายการเป๊ะๆ
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

    // ★ Optimistic update
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
  const renderOverdueSection = () => {
    if (overdueCount === 0) return null;
    return (
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title yp-today-section__title--overdue">
            รายการที่เลยกำหนด
          </h2>
          <span className="yp-today-section__count yp-today-section__count--overdue">{overdueCount} รายการ</span>
        </div>
        <div className="yp-today-card-list">
          {overdueSmartGroups.map((group) => (
            <SmartGroupCard
              key={group.groupId}
              group={group}
              onOpenStatusPicker={handleOpenStatusPicker}
              todayStr={todayStr}
            />
          ))}
        </div>
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
    const sectionGroups = smartGroupedItems.filter((g) =>
      g.items.some((i) => items.some((si) => si.id === i.id))
    );
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
        <div className="yp-today-card-list">
          {sectionGroups.map((group) => (
            <SmartGroupCard
              key={group.groupId + '-' + sectionKey}
              group={group}
              onOpenStatusPicker={handleOpenStatusPicker}
              todayStr={todayStr}
            />
          ))}
        </div>
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
      <section className="yp-today-section">
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
      <section className="yp-today-section">
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
          <div className="yp-today-card-list">
            {upcomingSmartGroups.map((group) => (
              <SmartGroupCard
                key={group.groupId}
                group={group}
                onOpenStatusPicker={handleOpenStatusPicker}
                todayStr={todayStr}
              />
            ))}
          </div>
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
// ★ v3.10.0 รอบที่ 30: SmartGroupCard — ออกแบบใหม่ทั้งหมดตามหลักการ
//   ออกแบบระดับมืออาชีพ (Apple HIG + Material 3 + Linear + Things 3)
//
//   หลักการที่ใช้:
//   1. มั่นคง — โครงสร้างชัดเจน: header (banner) + body (list)
//      มี background ใน body ทำให้รายการย่อยไม่ "ลอย"
//   2. สวยงาม น่าใช้ — ใช้ accent tint อ่อนๆ แทนสีเข้ม
//      progress bar แบบ thin, modern แสดงความคืบหน้าของกลุ่ม
//   3. สะอาดตา — ใช้ whitespace + alignment แทนเส้นขอบหนา
//      ลด chip ที่ไม่จำเป็น เก็บไว้แค่สารสำคัญ
//   4. สมดุล — มุมโค้งด้านบนกว้าง ด้านล่างแคบลง เพื่อให้กลมกลืน
//      กับการ์ดย่อยด้านในที่มีมุมโค้งเล็กกว่า
//
//   โครงสร้างใหม่:
//   ┌─────────────────────────────────────┐ ← top: lg radius
//   │ ▒  วันแม่แห่งชาติ   ⏰ 08:00  →  │    banner (accent tint)
//   │    โรงเรียน · 5/8 เสร็จ  ▰▰▰▰▱▱▱▱ │    progress (NEW)
//   ├─────────────────────────────────────┤
//   │ ┌─────────────────────────────────┐ │ ← inner cards: sm radius
//   │ │ ● ซื้อของ         ✓ เสร็จ       │ │    compact list style
//   │ ├─────────────────────────────────┤ │
//   │ │ ● ตกแต่งบูธ      ⏳ กำลังทำ    │ │
//   │ └─────────────────────────────────┘ │
//   └─────────────────────────────────────┘ ← bottom: sm radius
// ═══════════════════════════════════════════════════════════════
function SmartGroupCard({
  group,
  onOpenStatusPicker,
  todayStr,
}: {
  group: SmartGroup;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
}) {
  const { items, accent, parentTitle, parentEvent, isSingle } = group;
  const firstItem = items[0];
  const isOverdue = firstItem.dateContext === 'overdue';
  const isUpcoming = firstItem.dateContext === 'upcoming';

  // ★ ถ้าเป็นรายการเดี่ยว (1 item, no parent group)
  if (isSingle && items.length === 1) {
    return (
      <TodayItemCard
        item={firstItem}
        onOpenStatusPicker={onOpenStatusPicker}
        todayStr={todayStr}
      />
    );
  }

  // ★ v3.10.0 รอบที่ 30: คำนวณความคืบหน้าของกลุ่มจาก parentEvent.tasks
  //   ถ้า parentEvent มี tasks → ใช้ progress จริง
  //   ถ้าไม่มี → คำนวณจาก items ในกลุ่มแทน (fallback)
  const totalGroupTasks = parentEvent?.tasks?.length || items.length;
  const doneGroupTasks = parentEvent?.tasks
    ? parentEvent.tasks.filter((t) => t.status === 'done').length
    : items.filter((i) => i.status === 'done').length;
  const progressPct = totalGroupTasks > 0
    ? Math.round((doneGroupTasks / totalGroupTasks) * 100)
    : 0;

  const detailHref = parentEvent ? `/events/${parentEvent.id}` : '#';
  const groupDate = parentEvent?.date || firstItem.dueDate || '';

  return (
    <div className="yp-today-group" style={{ ['--accent' as string]: accent }}>
      {/* ── Group banner (header) ── */}
      <div className="yp-today-group__banner">
        <span className="yp-today-group__icon" aria-hidden="true">
          <Layers width={14} height={14} strokeWidth={2} />
        </span>
        <div className="yp-today-group__banner-text">
          <span className="yp-today-group__banner-title">{parentTitle || firstItem.title}</span>
          {firstItem.startTime ? (
            <span className="yp-today-group__banner-chip">
              <Clock width={11} height={11} />
              {firstItem.startTime}
            </span>
          ) : null}
          {firstItem.location ? (
            <span className="yp-today-group__banner-chip yp-today-group__banner-chip--muted">
              {firstItem.location}
            </span>
          ) : null}
          {/* ★ date badge for overdue/upcoming */}
          {isOverdue && groupDate ? (
            <span className="yp-today-group__banner-date yp-today-group__banner-date--overdue">
              <AlertTriangle width={11} height={11} />
              {relativeDay(groupDate)}
            </span>
          ) : null}
          {isUpcoming && groupDate && groupDate !== todayStr ? (
            <span className="yp-today-group__banner-date yp-today-group__banner-date--upcoming">
              <CalIcon width={11} height={11} />
              {relativeDay(groupDate)}
            </span>
          ) : null}
        </div>
        <Link
          href={detailHref}
          className="yp-today-group__detail-btn"
          aria-label={`ดูรายละเอียดกลุ่มรายการ: ${parentTitle}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowUpRight width={14} height={14} />
        </Link>
      </div>

      {/* ── Group progress bar (NEW — v3.10.0 รอบที่ 30) ── */}
      {/* ★ แสดงเฉพาะเมื่อมี tasks มากกว่า 1 รายการ
          ใช้ progress จาก parentEvent ทั้งหมด ไม่ใช่แค่ items ในกลุ่มนี้
          เพราะอยากให้เห็นภาพรวมของกลุ่มรายการนั้นๆ ไม่ใช่แค่ส่วนที่แสดง */}
      {totalGroupTasks > 0 ? (
        <div className="yp-today-group__progress">
          <span className="yp-today-group__progress-text">
            {doneGroupTasks}/{totalGroupTasks} เสร็จ
          </span>
          <div
            className="yp-today-group__progress-bar"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`ความคืบหน้า ${progressPct}%`}
          >
            <div
              className="yp-today-group__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* ── Items: compact list (★ v3.10.0 รอบที่ 30: ใช้ compact variant) ── */}
      <div className="yp-today-group__cards">
        {items.map((item) => (
          <TodayItemCard
            key={item.id}
            item={item}
            onOpenStatusPicker={onOpenStatusPicker}
            todayStr={todayStr}
            isInGroup={true}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 30: TodayItemCard — ออกแบบใหม่ 2 โหมด:
//
//   1. Standalone (ไม่ใช่ในกลุ่ม): การ์ดเต็มรูปแบบ เหมือนเดิม
//      - มี border + shadow + lg radius
//      - 2-line layout: title + meta chips
//      - ใช้ใน: รายการเดี่ยวใน today, overdue, upcoming
//
//   2. In-group (อยู่ในกลุ่มรายการ): compact list item แบบใหม่
//      - ไม่มี shadow ใช้แค่ border บางๆ ด้านล่างคั่นระหว่างรายการ
//      - 1-line layout: status dot + title + status chip + chevron
//      - ขนาดกระทัดรัด มองง่าย ดูง่าย แต่มีพื้นที่พอสมควร
//      - ใช้ใน: รายการย่อยในกลุ่มรายการบน today page
//
//   หลักการออกแบบ (จาก Linear + Things 3 + Apple Reminders):
//   - ใน list ใช้ divider lines แทนการ์ดแยก → ลด visual noise
//   - status dot ขนาดเล็ก (12px) ไม่เด่นเกิน title
//   - status chip แค่ colored dot + label ไม่มี icon ซ้ำ
//   - chevron บอกว่าคลิกได้ ไม่ใช่แค่ข้อความธรรมดา
// ═══════════════════════════════════════════════════════════════
function TodayItemCard({
  item,
  onOpenStatusPicker,
  todayStr,
  isInGroup = false,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
  isInGroup?: boolean;
}) {
  const accent = item.accent;
  const detailHref = item.event ? `/events/${item.event.id}` : (item.parentEvent ? `/events/${item.parentEvent.id}` : '#');
  const isOverdue = item.dateContext === 'overdue';
  const isUpcoming = item.dateContext === 'upcoming';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';

  // ★ v3.10.0 รอบที่ 30: ถ้าอยู่ในกลุ่ม → ใช้ compact list item layout
  //   กระทัดรัดกว่า, มองง่าย, ดูง่าย แต่ยังมีพื้นที่พอสมควร
  if (isInGroup) {
    return (
      <div
        className={`yp-today-item-compact${item.status === 'done' ? ' is-done' : ''}`}
        style={{ ['--accent' as string]: accent }}
        role="button"
        tabIndex={0}
        onClick={() => onOpenStatusPicker(item)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStatusPicker(item); } }}
        aria-label={`${item.title} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
      >
        {/* ── Status dot (compact, smaller) ── */}
        <button
          type="button"
          className={`yp-today-item-compact__dot yp-today-item-compact__dot--${item.status}`}
          aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
          onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
          style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
        />

        {/* ── Title (single line, truncated) ── */}
        <div className="yp-today-item-compact__title">{item.title}</div>

        {/* ── Meta (compact: just essential info) ── */}
        <div className="yp-today-item-compact__meta">
          {/* Status label (compact, no icon) */}
          <span className={`yp-today-item-compact__status yp-today-item-compact__status--${item.status}`}>
            {statusLabel(item.status)}
          </span>

          {/* Time (if any) */}
          {item.startTime ? (
            <span className="yp-today-item-compact__time">
              <Clock width={10} height={10} />
              {item.startTime}
            </span>
          ) : null}

          {/* Priority (only high shows) */}
          {priority === 'high' ? (
            <span className="yp-today-item-compact__priority">เร่ง</span>
          ) : null}

          {/* Date for overdue/upcoming */}
          {isOverdue && item.dueDate && item.dueDate !== todayStr ? (
            <span className="yp-today-item-compact__date yp-today-item-compact__date--overdue">
              {relativeDay(item.dueDate)}
            </span>
          ) : null}
          {isUpcoming && item.dueDate && item.dueDate !== todayStr ? (
            <span className="yp-today-item-compact__date">
              {relativeDay(item.dueDate)}
            </span>
          ) : null}
        </div>

        {/* ── Detail link (chevron) ── */}
        <Link
          href={detailHref}
          className="yp-today-item-compact__link"
          aria-label={`ดูรายละเอียด: ${item.title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ChevronRight width={14} height={14} />
        </Link>
      </div>
    );
  }

  // ★ Standalone (ไม่อยู่ในกลุ่ม) — full card layout เหมือนเดิม
  return (
    <div
      className={`yp-today-item-card${item.status === 'done' ? ' is-done' : ''}`}
      style={{ ['--accent' as string]: accent }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStatusPicker(item); } }}
      aria-label={`${item.title} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* ── Status dot ── */}
      <button
        type="button"
        className={`yp-today-item-card__dot yp-today-item-card__dot--${item.status}`}
        aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
        style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
      />

      {/* ── Body (2-line: title + chips) ── */}
      <div className="yp-today-item-card__body">
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

          {/* ★ Date chip for overdue */}
          {isOverdue && item.dueDate && item.dueDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due is-overdue">
              <AlertTriangle width={11} height={11} />
              <span className="yp-today-item-card__chip-label">กำหนด</span>
              {relativeDay(item.dueDate)}
            </span>
          ) : null}

          {/* ★ Date chip for upcoming */}
          {isUpcoming && item.dueDate && item.dueDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due">
              <CalIcon width={11} height={11} />
              <span className="yp-today-item-card__chip-label">กำหนด</span>
              {relativeDay(item.dueDate)}
            </span>
          ) : null}

          {/* ★ From parent chip */}
          {item.parentEvent && item.parentEvent.date !== todayStr && !isOverdue && !isUpcoming ? (
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
