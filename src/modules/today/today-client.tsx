'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r27 — smart time-based layout)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 27: ปรับปรุงจากรอบที่ 26
//   เป้าหมายหลัก:
//   1. สะดวก — ผู้ใช้เห็นงานที่ต้องทำทันที ไม่ต้องคลิกเข้าไปดู
//   2. ชาญฉลาด — ระบบจัดกลุ่มรายการย่อยอัตโนมัติตามเวลา
//   3. Real-time — เปลี่ยนสถานะแล้วอัพเดตทันที (optimistic update)
//
//   สิ่งที่เปลี่ยนจากรอบที่ 27:
//   - งานเลยกำหนด (overdue): แสดงผลแบบเดียวกับหน้า Today
//     ไม่ใช่การ์ดกลุ่มเดิม แต่แสดงรายการย่อยตรงแบบ smart grouping
//   - คลิกที่การ์ด = เปิด Bottom Sheet เลือกสถานะ
//     ไม่ใช่เปลี่ยนสถานะทันที (cycle) เพื่อป้องกันการเปลี่ยนผิด
//     Bottom Sheet ออกแบบเหมือนกับหน้ากลุ่มรายการเป๊ะๆ (yp-status-picker)
//   - Optimistic update: เปลี่ยนสถานะทันทีใน local state
//     ไม่ต้องรอ realtime reload — ศึกษาจาก event-detail-client.tsx
//   - ปรับปรุงการออกแบบการ์ดให้สะอาดตา สมดุล สบายตามากขึ้น
//     จัด layout ใหม่ให้มี visual hierarchy ชัดเจน
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
  isPast,
  statusLabel,
  statusChipClass,
  eventProgress,
} from '@/lib/utils/date';
import {
  AlertCircle,
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

// ★ v3.10.0 รอบที่ 27: STATUS_META — เหมือน event-detail-client.tsx เป๊ะๆ
const STATUS_META: Record<
  TaskStatus | EventStatus,
  { color: string; label: string; desc: string }
> = {
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

// ═══════════════════════════════════════════════════════════════
// TYPE: TimelineItem — รายการที่จะแสดงใน timeline
// ═══════════════════════════════════════════════════════════════
interface TimelineItem {
  id: string;
  /** เวลาเริ่ม (HH:MM) — ใช้จัดเรียงตามเวลา */
  startTime: string | null;
  /** ชื่อรายการ */
  title: string;
  /** สถานะ */
  status: TaskStatus | EventStatus;
  /** สี accent (จาก event/task) */
  accent: string;
  /** กลุ่มที่มา — null = รายการเดี่ยว */
  parentEvent: YPEvent | null;
  /** รายการย่อย (ถ้าเป็นกลุ่มรายการที่มี sub-items) */
  task: Task | null;
  /** รายการเดี่ยว */
  event: YPEvent | null;
  /** มอบหมาย */
  assigneeName: string | null;
  assigneeColor: string | null;
  /** priority */
  priority: 'low' | 'medium' | 'high';
  /** ระยะเวลา */
  estimatedTime: string | null;
  /** วันที่กำหนดส่ง */
  dueDate: string | null;
  /** สถานที่ */
  location: string | null;
  /** เวลาของ event parent (ถ้ามี) */
  eventTime: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Helper: สร้าง TimelineItems จาก events ของวันใดวันหนึ่ง
// ═══════════════════════════════════════════════════════════════
function buildTimelineItems(events: YPEvent[], dateStr: string): TimelineItem[] {
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
        });
      } else {
        for (const t of tasks) {
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
      });
    }
  }

  // ★ เพิ่ม standalone tasks (due_date = dateStr แต่ parent event อยู่วันอื่น)
  for (const ev of events) {
    if (ev.date === dateStr) continue;
    for (const t of ev.tasks || []) {
      if (t.due_date === dateStr && t.status !== 'done') {
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
        });
      }
    }
  }

  // เรียงตามเวลา — มีเวลาเริ่มอยู่ก่อน ไม่มีเวลาอยู่ท้าย
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
// Helper: Smart grouping — รวม items จากกลุ่มเดียวกันที่อยู่ติดกัน
// ═══════════════════════════════════════════════════════════════
interface SmartGroup {
  groupId: string;
  items: TimelineItem[];
  accent: string;
  parentTitle: string | null;
  parentEvent: YPEvent | null;
  isSingle: boolean;
}

function buildSmartGroups(items: TimelineItem[]): SmartGroup[] {
  const result: SmartGroup[] = [];
  let currentGroup: SmartGroup | null = null;

  for (const item of items) {
    const groupKey = item.parentEvent?.id || (item.event?.id ? `single-${item.event.id}` : `single-${item.id}`);

    if (currentGroup && currentGroup.groupId === groupKey) {
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
  const { departments: liveDepartments } = useRealtimeDepartments(
    initialDept ? [initialDept] : []
  );
  const liveDept =
    user.department_id
      ? liveDepartments.find((d) => d.id === user.department_id) ?? null
      : null;
  const { members: liveDeptMembers } = useRealtimeDeptMembers(
    user.department_id,
    initialDeptMembers
  );

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
  // ★ v3.10.0 รอบที่ 27: สร้าง timeline items จาก events ของวันนี้
  // ═══════════════════════════════════════════════════════════════
  const timelineItems = React.useMemo(
    () => buildTimelineItems(events, todayStr),
    [events, todayStr]
  );

  const timeGroups = React.useMemo(
    () => buildTimeGroups(timelineItems),
    [timelineItems]
  );

  const smartGroupedItems = React.useMemo(
    () => buildSmartGroups([...timeGroups.morning, ...timeGroups.afternoon, ...timeGroups.unscheduled]),
    [timeGroups]
  );

  // ═══════════════════════════════════════════════════════════════
  // ★ v3.10.0 รอบที่ 27: งานเลยกำหนด — แสดงผลแบบเดียวกับหน้า Today
  //   แทนที่จะแสดงเป็นการ์ดกลุ่มเดิม ให้แสดงรายการย่อยตรง
  // ═══════════════════════════════════════════════════════════════
  const overdueEvents = events.filter(
    (e) => e.date < todayStr && resolveEventStatus(e) !== 'done'
  );

  // ★ สร้าง overdue timeline items จาก overdue events ทุกวัน
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
          });
        } else {
          // ★ แสดงเฉพาะรายการย่อยที่ยังไม่เสร็จ (เลยกำหนด = ต้องทำ)
          for (const t of tasks) {
            if (t.status !== 'done') {
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
              });
            }
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
        });
      }
    }

    // เรียงตาม date (เก่าสุดก่อน) → time → priority
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      const da = a.dueDate || a.parentEvent?.date || '';
      const db = b.dueDate || b.parentEvent?.date || '';
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

  const overdueSmartGroups = React.useMemo(
    () => buildSmartGroups(overdueTimelineItems),
    [overdueTimelineItems]
  );

  const upcoming = events.filter((e) => e.date > todayStr).slice(0, 4);

  const todayTotalCount = timelineItems.length;

  const deptStats = React.useMemo(() => {
    if (!dept) return initialDeptStats;
    const deptEvents = events.filter((e) => e.department_id === dept.id);
    return {
      total: deptEvents.length,
      done: deptEvents.filter((e) => resolveEventStatus(e) === 'done').length,
      ongoing: deptEvents.filter((e) => {
        const s = resolveEventStatus(e);
        return s === 'ongoing' || s === 'planning';
      }).length,
      overdue: deptEvents.filter(
        (e) => e.date < todayStr && resolveEventStatus(e) !== 'done'
      ).length,
    };
  }, [events, dept, todayStr, initialDeptStats]);

  // ═══════════════════════════════════════════════════════════════
  // ★ v3.10.0 รอบที่ 27: STATUS PICKER — เปิด Bottom Sheet เลือกสถานะ
  //   ออกแบบเหมือนกับหน้ากลุ่มรายการเป๊ะๆ (yp-status-picker)
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

    // ★ Optimistic update: เปลี่ยน state ทันที
    if (isTask && item.task) {
      patchTask(item.task.id, { status: newStatus as TaskStatus });
    } else if (isEvent && item.event) {
      patchEvent(item.event.id, { status: newStatus as EventStatus });
    }

    // ปิด sheet
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
      // ★ Revert on error
      if (isTask && item.task) {
        patchTask(item.task.id, { status: oldStatus as TaskStatus });
      } else if (isEvent && item.event) {
        patchEvent(item.event.id, { status: oldStatus as EventStatus });
      }
      setToast({ msg: `ไม่สามารถเปลี่ยนสถานะ: ${e.message || 'unknown'}`, type: 'error' });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════
  const renderOverdueSection = () => {
    if (overdueTimelineItems.length === 0) return null;
    return (
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">รายการที่เลยกำหนด</h2>
          <span className="yp-today-section__count">{overdueTimelineItems.length} รายการ</span>
        </div>
        <div className="yp-today-overdue-list">
          {overdueSmartGroups.map((group) => (
            <SmartGroupCard
              key={group.groupId}
              group={group}
              onOpenStatusPicker={handleOpenStatusPicker}
              todayStr={todayStr}
              isOverdue={true}
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
        <div className="yp-today-time-section__body">
          {sectionGroups.map((group) => (
            <SmartGroupCard
              key={group.groupId + '-' + sectionKey}
              group={group}
              onOpenStatusPicker={handleOpenStatusPicker}
              todayStr={todayStr}
              isOverdue={false}
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
              <div className="yp-today-hero__stat-value">{upcoming.length}</div>
              <div className="yp-today-hero__stat-label">กำลังจะถึง</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{overdueTimelineItems.length}</div>
              <div className="yp-today-hero__stat-label">เลยกำหนด</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── OVERDUE (แสดงแบบเดียวกับ Today — smart grouping) ── */}
      {renderOverdueSection()}

      {/* ── TODAY ── */}
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">รายการวันนี้</h2>
          <span className="yp-today-section__count">{todayTotalCount} รายการ</span>
        </div>
        {todayTotalCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true">
              <span role="img" aria-label="ว่าง">🌤️</span>
            </div>
            <div className="yp-empty__title">ไม่มีรายการวันนี้</div>
            <div className="yp-empty__desc">ว่าง ๆ ลองดูรายการที่กำลังจะถึงด้านล่าง</div>
          </div>
        ) : (
          <>
            {renderTimeSection(
              'ช่วงเช้า',
              'เริ่มก่อน 12:00 น.',
              <Sunrise width={16} height={16} strokeWidth={2} />,
              timeGroups.morning,
              'morning'
            )}
            {renderTimeSection(
              'ช่วงบ่าย',
              'เริ่มตั้งแต่ 12:00 น. เป็นต้นไป',
              <Sunset width={16} height={16} strokeWidth={2} />,
              timeGroups.afternoon,
              'afternoon'
            )}
            {renderTimeSection(
              'ไม่ระบุเวลา',
              'ยังไม่ได้กำหนดเวลาเริ่ม',
              <CircleDashed width={16} height={16} strokeWidth={2} />,
              timeGroups.unscheduled,
              'unscheduled'
            )}
          </>
        )}
      </section>

      {/* ── UPCOMING ── */}
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">กำลังจะถึง</h2>
          <span className="yp-today-section__count">{upcoming.length} รายการ</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true">
              <span role="img" aria-label="ว่าง">📅</span>
            </div>
            <div className="yp-empty__title">ยังไม่มีรายการที่กำลังจะถึง</div>
            <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างรายการใหม่</div>
          </div>
        ) : (
          <div>
            {upcoming.map((ev) => (
              <UpcomingCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>

      {/* ── DEPARTMENT OVERVIEW ── */}
      {dept ? (
        <section className="yp-today-section">
          <div className="yp-today-section__head">
            <h2 className="yp-today-section__title">
              {dept.icon || '◎'} ภาพรวม{dept.name}
            </h2>
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
              <div style={{ fontSize: 'var(--yp-text-xs)', color: 'var(--yp-text-muted)' }}>
                สมาชิก {deptMembers.length} คน
              </div>
            </div>
            {dept.description ? (
              <div style={{ fontSize: 'var(--yp-text-xs)', color: 'var(--yp-text-body)', lineHeight: 1.5 }}>
                {dept.description}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
          ★ v3.10.0 รอบที่ 27: STATUS PICKER SHEET
          ออกแบบเหมือนกับหน้ากลุ่มรายการเป๊ะๆ — yp-status-picker
          ═══════════════════════════════════════════════════════════════ */}
      <BottomSheet
        open={statusPickerOpen}
        onClose={() => {
          setStatusPickerOpen(false);
          setActiveItem(null);
        }}
        title="สถานะของรายการ"
        description={activeItem?.title}
      >
        <div className="yp-status-picker">
          {activeItem ? (
            activeItem.task
              ? (['todo', 'ongoing', 'done'] as TaskStatus[]).map((s) => {
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
                      {isCurrent ? (
                        <div className="yp-status-picker__check">
                          <Check width={18} height={18} />
                        </div>
                      ) : null}
                    </button>
                  );
                })
              : (['todo', 'ongoing', 'done'] as EventStatus[]).map((s) => {
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
                      {isCurrent ? (
                        <div className="yp-status-picker__check">
                          <Check width={18} height={18} />
                        </div>
                      ) : null}
                    </button>
                  );
                })
          ) : null}
        </div>
      </BottomSheet>

      {/* ── Toast ── */}
      {toast ? (
        <div className={`yp-toast yp-toast--${toast.type || 'info'}`}>
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SmartGroupCard — การ์ดที่รวมรายการย่อยจากกลุ่มเดียวกัน
// ★ v3.10.0 รอบที่ 27: เปลี่ยน onStatusCycle → onOpenStatusPicker
//   คลิกที่การ์ด = เปิด Bottom Sheet เลือกสถานะ (ไม่ใช่เปลี่ยนทันที)
// ═══════════════════════════════════════════════════════════════
function SmartGroupCard({
  group,
  onOpenStatusPicker,
  todayStr,
  isOverdue,
}: {
  group: SmartGroup;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
  isOverdue: boolean;
}) {
  const { items, accent, parentTitle, parentEvent, isSingle } = group;
  const firstItem = items[0];

  // ★ ถ้าเป็นรายการเดี่ยว (1 item, no parent group) → แสดงเป็นการ์ดเดียว
  if (isSingle && items.length === 1) {
    return (
      <SingleItemCard
        item={firstItem}
        onOpenStatusPicker={onOpenStatusPicker}
        todayStr={todayStr}
        isOverdue={isOverdue}
      />
    );
  }

  // ★ กลุ่มรายการ — แสดง header ของกลุ่ม + รายการย่อยตามเวลา
  const detailHref = parentEvent ? `/events/${parentEvent.id}` : '#';

  return (
    <div className="yp-smart-group" style={{ ['--accent' as string]: accent }}>
      {/* ── Group header ── */}
      <div className="yp-smart-group__head">
        <span className="yp-smart-group__icon" aria-hidden="true">
          <Layers width={14} height={14} strokeWidth={2} />
        </span>
        <div className="yp-smart-group__head-text">
          <span className="yp-smart-group__head-title">{parentTitle || firstItem.title}</span>
          {firstItem.startTime ? (
            <span className="yp-smart-group__head-time">
              <Clock width={12} height={12} />
              {firstItem.startTime}
            </span>
          ) : null}
          {firstItem.location ? (
            <span className="yp-smart-group__head-location">
              {firstItem.location}
            </span>
          ) : null}
          {/* ★ แสดงวันที่ของ event ถ้าเลยกำหนด */}
          {isOverdue && parentEvent ? (
            <span className="yp-smart-group__head-date-badge">
              {relativeDay(parentEvent.date)}
            </span>
          ) : null}
        </div>
        <Link
          href={detailHref}
          className="yp-smart-group__detail-btn"
          aria-label={`ดูรายละเอียดกลุ่มรายการ: ${parentTitle}`}
        >
          <ArrowUpRight width={14} height={14} />
        </Link>
      </div>

      {/* ── Sub-items ── */}
      <div className="yp-smart-group__items">
        {items.map((item) => (
          <TimelineItemRow
            key={item.id}
            item={item}
            onOpenStatusPicker={onOpenStatusPicker}
            isInGroup={true}
            todayStr={todayStr}
            isOverdue={isOverdue}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SingleItemCard — การ์ดรายการเดี่ยว (type: 'task')
// ★ v3.10.0 รอบที่ 27: คลิก = เปิด Bottom Sheet เลือกสถานะ
//   มีปุ่มลิงก์ = ดูรายละเอียด
//   ปรับปรุงการออกแบบให้สะอาดตา สมดุล สบายตา
// ═══════════════════════════════════════════════════════════════
function SingleItemCard({
  item,
  onOpenStatusPicker,
  todayStr,
  isOverdue,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
  isOverdue: boolean;
}) {
  const accent = item.accent;
  const detailHref = item.event ? `/events/${item.event.id}` : (item.parentEvent ? `/events/${item.parentEvent.id}` : '#');

  return (
    <div
      className={`yp-today-item yp-today-item--single${item.status === 'done' ? ' is-done' : ''}`}
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
        className={`yp-today-item__dot yp-today-item__dot--${item.status}`}
        aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
        style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
      />

      {/* ── Main content ── */}
      <div className="yp-today-item__body">
        <div className="yp-today-item__title">{item.title}</div>
        <div className="yp-today-item__meta">
          <span className={`yp-today-item__status yp-today-item__status--${item.status}`}>
            {item.status === 'done' ? <Check width={11} height={11} /> : item.status === 'ongoing' ? <RefreshCw width={11} height={11} /> : <Clock width={11} height={11} />}
            {statusLabel(item.status)}
          </span>
          {item.startTime ? (
            <span className="yp-today-item__chip">
              <Clock width={11} height={11} />
              {item.startTime}
            </span>
          ) : null}
          {item.priority === 'high' ? (
            <span className="yp-today-item__chip yp-today-item__chip--priority">เร่งด่วน</span>
          ) : null}
          {item.assigneeName ? (
            <span className="yp-today-item__chip yp-today-item__chip--assignee">
              {item.assigneeColor ? <Avatar name={item.assigneeName} color={item.assigneeColor} size={14} /> : null}
              {item.assigneeName}
            </span>
          ) : null}
          {item.estimatedTime ? (
            <span className="yp-today-item__chip yp-today-item__chip--est">
              {item.estimatedTime}
            </span>
          ) : null}
          {item.location ? (
            <span className="yp-today-item__chip">{item.location}</span>
          ) : null}
          {item.parentEvent && item.parentEvent.date !== todayStr ? (
            <span className="yp-today-item__chip yp-today-item__chip--from">
              ↪ จาก: {item.parentEvent.title}
            </span>
          ) : null}
          {/* ★ แสดงวันที่ถ้าเลยกำหนด */}
          {isOverdue && item.dueDate && item.dueDate !== todayStr ? (
            <span className="yp-today-item__chip yp-today-item__chip--overdue-date">
              {relativeDay(item.dueDate)}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Detail link ── */}
      <Link
        href={detailHref}
        className="yp-today-item__link"
        aria-label={`ดูรายละเอียด: ${item.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ArrowUpRight width={14} height={14} />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TimelineItemRow — แถวรายการย่อยในกลุ่ม (compact)
// ★ v3.10.0 รอบที่ 27: คลิก = เปิด Bottom Sheet เลือกสถานะ
//   ปรับปรุงการออกแบบให้สะอาดตา สมดุล
// ═══════════════════════════════════════════════════════════════
function TimelineItemRow({
  item,
  onOpenStatusPicker,
  isInGroup,
  todayStr,
  isOverdue,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  isInGroup: boolean;
  todayStr: string;
  isOverdue: boolean;
}) {
  const detailHref = item.parentEvent ? `/events/${item.parentEvent.id}` : (item.event ? `/events/${item.event.id}` : '#');

  return (
    <div
      className={`yp-timeline-row${item.status === 'done' ? ' is-done' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStatusPicker(item); } }}
      aria-label={`${item.title} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* Status dot */}
      <button
        type="button"
        className={`yp-timeline-row__dot yp-timeline-row__dot--${item.status}`}
        aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
        style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
      />

      {/* Time badge (ถ้ามี) */}
      {item.startTime ? (
        <span className="yp-timeline-row__time">{item.startTime}</span>
      ) : null}

      {/* Title */}
      <span className="yp-timeline-row__title">{item.title}</span>

      {/* Compact meta */}
      <span className={`yp-timeline-row__status yp-timeline-row__status--${item.status}`}>
        {statusLabel(item.status)}
      </span>

      {item.priority === 'high' ? (
        <span className="yp-timeline-row__priority">เร่ง</span>
      ) : null}

      {item.assigneeName ? (
        <span className="yp-timeline-row__assignee">
          {item.assigneeColor ? <Avatar name={item.assigneeName} color={item.assigneeColor} size={14} /> : null}
          {item.assigneeName}
        </span>
      ) : null}

      {item.estimatedTime ? (
        <span className="yp-timeline-row__est">{item.estimatedTime}</span>
      ) : null}

      {/* ★ แสดงวันที่ถ้าเลยกำหนด */}
      {isOverdue && item.dueDate && item.dueDate !== todayStr ? (
        <span className="yp-timeline-row__overdue-date">{relativeDay(item.dueDate)}</span>
      ) : null}

      {/* Detail link */}
      <Link
        href={detailHref}
        className="yp-timeline-row__link"
        aria-label={`ดูรายละเอียด: ${item.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronRight width={12} height={12} />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UpcomingCard — การ์ดรายการที่กำลังจะถึง (เบื้องต้น)
// ═══════════════════════════════════════════════════════════════
function UpcomingCard({ event }: { event: YPEvent }) {
  const accent = event.color || '#4F46E5';
  const isGroup = event.type === 'group';
  const totalTasks = event.tasks?.length || 0;
  const doneTasks = event.tasks?.filter((t) => t.status === 'done').length || 0;
  const displayStatus = resolveEventStatus(event);
  const progress = eventProgress(event.tasks || []);

  const metaParts: string[] = [relativeDay(event.date)];
  if (event.time) metaParts.push(event.time);
  if (event.location) metaParts.push(event.location);

  return (
    <Link
      href={`/events/${event.id}`}
      className="yp-event-card"
      style={{ ['--accent' as string]: accent }}
      aria-label={`รายการ: ${event.title}`}
    >
      <div className="yp-event-card__head">
        <div className="yp-event-card__icon" aria-hidden="true">
          {isGroup ? <Layers strokeWidth={2} /> : <Flag strokeWidth={2} />}
        </div>
        <div className="yp-event-card__main">
          <div className="yp-event-card__title">{event.title}</div>
          <div className="yp-event-card__meta">{metaParts.join(' · ')}</div>
        </div>
        <span className={`yp-chip ${statusChipClass(displayStatus)}`}>
          <span className="yp-chip-dot" aria-hidden="true" />
          {statusLabel(displayStatus)}
        </span>
      </div>
      {isGroup && totalTasks > 0 ? (
        <div className="yp-event-card__progress">
          <div className="yp-event-card__progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`ความคืบหน้า ${progress}%`}>
            <div className="yp-event-card__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="yp-event-card__progress-text">{doneTasks}/{totalTasks}</span>
        </div>
      ) : null}
    </Link>
  );
}
