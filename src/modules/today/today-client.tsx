'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r45 — Navigation Fix + Smart Sections)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 45: 3 ปัญหาหลัก
//
//   FIX 1 — Bottom Sheet Navigation Bug:
//     ปัญหา: กด Link ใน sheet แล้ว sheet ปิดแต่ไม่ navigate
//     สาเหตุ: Next.js router.push ทำ spread existing history.state
//     ทำให้ ypWindow: true ยังอยู่ → cleanup เรียก history.back() ยกเลิก
//     แก้: window.tsx เก็บ ypUrl ใน state แล้วเช็ค URL ใน cleanup
//     + today-client ใช้ window.location.href สำรอง (belt & suspenders)
//
//   FIX 2 — Time Display Logic:
//     ปัญหา: Carryover items (เริ่มก่อนวันนี้) ไม่แสดงเวลาบนการ์ด
//     แก้: แสดง "เริ่ม{relativeDay} HH:MM น." สำหรับ carryover items
//
//   FIX 3 — Today Section Smart Grouping:
//     ปัญหา: งานที่เริ่มมาตั้งแต่เมื่อวานถูกจัดใส่ช่วงเช้า/บ่าย
//     แก้: แยก "ดำเนินการต่อเนื่อง" (carryover) ออกจากกลุ่มเวลา
//
//   Layout การ์ด (r44 design ยังคงเดิม):
//   ┌──────────────────────────────────────────────┐
//   │  Row 1: [ว่าง]        [🕐 เวลา] [•••]          │
//   │  Row 2: 📚 ชื่องาน (Title)                     │
//   │  Row 3: 👥 จากกลุ่ม: XXXXXX                     │
//   │  Row 4: [badges]                                │
//   └──────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
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
  Users,
  Eye,
  MapPin,
  User as UserIcon,
  Timer,
} from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import type {
  YPEvent,
  Department,
  UserProfile,
  SessionUser,
  Task,
  TaskStatus,
  EventStatus,
} from '@/lib/types';
import {
  useRealtimeEvents,
  useRealtimeDepartments,
  useRealtimeDeptMembers,
  useRealtimeSessionUser,
} from '@/lib/hooks/use-realtime';

// ═══════════════════════════════════════════════════════════════
// MODULE 1: TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number; done: number; ongoing: number; overdue: number };
}

/** Status metadata — consistent across card & detail sheet */
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

/** Normalised item displayed in the timeline */
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
  /** Which section this item belongs to */
  dateContext: string;
  /** Actual start date (for date clustering) */
  itemDate: string;
}

/** Section classification */
type ItemDateContext = 'overdue' | 'today' | 'upcoming';

/** Date-cluster grouping for overdue / upcoming sections */
interface DateCluster {
  dateKey: string;
  items: TimelineItem[];
  itemCount: number;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 2: ITEM BUILDERS
// ═══════════════════════════════════════════════════════════════

/** Build a TimelineItem from a standalone event (no tasks inside) */
function buildStandaloneEventItem(
  ev: YPEvent,
  dateContext: ItemDateContext,
): TimelineItem {
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

/** Build a TimelineItem from a task inside a group event */
function buildTaskItem(
  ev: YPEvent,
  t: Task,
  dateContext: ItemDateContext,
): TimelineItem {
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
    itemDate: t.start_date || ev.start_date || ev.date,
  };
}

// ═══════════════════════════════════════════════════════════════
// MODULE 3: CATEGORIZATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Decide which section a item belongs to based on effectiveStart / effectiveDue.
 *   - overdue:  effectiveDue < today && not done
 *   - today:    effectiveStart ≤ today ≤ effectiveDue
 *   - upcoming: effectiveStart > today && not done
 *   - null:     done item in past or future (hide)
 */
function categorizeByDates(
  effectiveStart: string,
  effectiveDue: string,
  todayStr: string,
  isDone: boolean,
): ItemDateContext | null {
  if (effectiveDue < todayStr && !isDone) return 'overdue';
  if (effectiveStart <= todayStr && effectiveDue >= todayStr) return 'today';
  if (effectiveStart > todayStr && !isDone) return 'upcoming';
  return null;
}

/** Group items by itemDate for date-cluster sections */
function buildDateClusters(items: TimelineItem[]): DateCluster[] {
  const clusters: DateCluster[] = [];
  for (const item of items) {
    const dateKey = item.itemDate;
    const last = clusters[clusters.length - 1];
    if (last && last.dateKey === dateKey) {
      last.items.push(item);
      last.itemCount++;
    } else {
      clusters.push({ dateKey, items: [item], itemCount: 1 });
    }
  }
  return clusters;
}

/** Full Thai date caption for date-cluster headers */
function formatFullDateCaption(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = THAI_DAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `วัน${weekday}ที่ ${day} ${month} ${yearBE}`;
}

/** Split items into morning / afternoon / unscheduled groups */
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

// ═══════════════════════════════════════════════════════════════
// MODULE 4: SORTING
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

function sortByDatePriorityTimeTitle(
  a: TimelineItem,
  b: TimelineItem,
): number {
  const da = a.itemDate;
  const db = b.itemDate;
  if (da && db && da !== db) return da.localeCompare(db);
  return sortByPriorityTimeTitle(a, b);
}

// ═══════════════════════════════════════════════════════════════
// MODULE 5: SCHEDULE LABEL FORMATTER (Centralised — DRY)
// ═══════════════════════════════════════════════════════════════

/**
 * Build the schedule text used by both the card (Row 4) and the detail sheet.
 * Returns a human-readable string or null.
 *
 * Rules:
 *   - overdue:    "เลยกำหนด {relativeDay}" (no time — avoids confusion)
 *   - today:      "วันนี้ HH:MM น." (if itemDate is today)
 *                "เริ่ม {relativeDay} HH:MM น." (if started earlier)
 *   - upcoming:   "{relativeDay} HH:MM น."
 *   - no startTime → null
 */
function formatScheduleLabel(
  item: TimelineItem,
  todayStr: string,
): string | null {
  const isOverdue = item.dateContext === 'overdue';
  const isToday = item.dateContext === 'today';
  const isUpcoming = item.dateContext === 'upcoming';

  // Overdue: show which date was missed, but not the time
  if (isOverdue) {
    if (item.itemDate && item.itemDate !== todayStr) {
      return `เลยกำหนด ${relativeDay(item.itemDate)}`;
    }
    return 'เลยกำหนด';
  }

  // No start time → no schedule
  if (!item.startTime) return null;

  // Today section
  if (isToday) {
    if (item.itemDate !== todayStr) {
      // Started on a past day, still active today
      return `เริ่ม ${relativeDay(item.itemDate)} ${item.startTime} น.`;
    }
    return `วันนี้ ${item.startTime} น.`;
  }

  // Upcoming section
  if (isUpcoming && item.itemDate) {
    return `${relativeDay(item.itemDate)} ${item.startTime} น.`;
  }

  return null;
}

/**
 * Format time text for Row 1 of the card (subtle, no capsule).
 * Returns null for overdue (overdue badge handles this in Row 4).
 * No "กำหนดการ" prefix — context is clear from position.
 */
function formatCardTimeDisplay(
  item: TimelineItem,
  todayStr: string,
): string | null {
  // Overdue: don't show time in Row 1 (overdue badge in Row 4 instead)
  if (item.dateContext === 'overdue') return null;
  // No start time → no display
  if (!item.startTime) return null;
  // Today section
  if (item.dateContext === 'today') {
    if (item.itemDate === todayStr) {
      // Started today — show "วันนี้ HH:MM น."
      return `วันนี้ ${item.startTime} น.`;
    }
    // ★ r45 FIX: Carryover (started before today) — show when it started
    // เช่น "เริ่มเมื่อวาน 10:00 น." หรือ "เริ่ม3 วันที่แล้ว 14:00 น."
    if (item.itemDate) {
      return `เริ่ม${relativeDay(item.itemDate)} ${item.startTime} น.`;
    }
    return null;
  }
  // Upcoming: "{relativeDay} HH:MM น."
  if (item.dateContext === 'upcoming' && item.itemDate) {
    return `${relativeDay(item.itemDate)} ${item.startTime} น.`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 6: TODAY DASHBOARD (Main Component)
// ═══════════════════════════════════════════════════════════════

export function TodayClient({
  initialEvents,
  user: initialUser,
  dept: initialDept,
  deptMembers: initialDeptMembers,
  deptStats: initialDeptStats,
}: TodayClientProps) {
  // ── Realtime hooks ──
  const { events, patchEvent, patchTask } = useRealtimeEvents(initialEvents);
  const { user } = useRealtimeSessionUser(initialUser);
  const { departments: liveDepartments } = useRealtimeDepartments(
    initialDept ? [initialDept] : [],
  );
  const liveDept = user.department_id
    ? liveDepartments.find((d) => d.id === user.department_id) ?? null
    : null;
  const { members: liveDeptMembers } = useRealtimeDeptMembers(
    user.department_id,
    initialDeptMembers,
  );

  const dept = liveDept ?? initialDept;
  const deptMembers = liveDeptMembers;

  // ── Date / greeting ──
  const todayParts = getThailandTodayParts();
  const greeting = getTimeGreeting();
  const dayName = THAI_DAYS[todayParts.weekday];
  const dayNum = todayParts.day;
  const monthName = THAI_MONTHS[todayParts.month];
  const yearBE = todayParts.year + 543;
  const todayLong = `${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
  const todayStr = getLocalTodayStr();

  // ── Categorize events into sections ──
  const categorizedItems = React.useMemo(() => {
    const overdue: TimelineItem[] = [];
    const today: TimelineItem[] = [];
    const upcoming: TimelineItem[] = [];

    for (const ev of events) {
      if (ev.type === 'group') {
        const tasks = ev.tasks || [];
        if (tasks.length === 0) {
          // Empty group → use event dates
          const effectiveStart = ev.start_date || ev.date;
          const effectiveDue = ev.date;
          const isDone = resolveEventStatus(ev) === 'done';
          const ctx = categorizeByDates(
            effectiveStart,
            effectiveDue,
            todayStr,
            isDone,
          );
          if (!ctx) continue;
          const item = buildStandaloneEventItem(ev, ctx);
          if (ctx === 'overdue') overdue.push(item);
          else if (ctx === 'today') today.push(item);
          else upcoming.push(item);
        } else {
          // Each task uses its own dates
          for (const t of tasks) {
            const effectiveStart = t.start_date || ev.start_date || ev.date;
            const effectiveDue = t.due_date || ev.date;
            const isDone = t.status === 'done';
            const ctx = categorizeByDates(
              effectiveStart,
              effectiveDue,
              todayStr,
              isDone,
            );
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
        const ctx = categorizeByDates(
          effectiveStart,
          effectiveDue,
          todayStr,
          isDone,
        );
        if (!ctx) continue;
        const item = buildStandaloneEventItem(ev, ctx);
        if (ctx === 'overdue') overdue.push(item);
        else if (ctx === 'today') today.push(item);
        else upcoming.push(item);
      }
    }

    overdue.sort(sortByDatePriorityTimeTitle);
    today.sort(sortByPriorityTimeTitle);
    upcoming.sort(sortByDatePriorityTimeTitle);

    return { overdue, today, upcoming };
  }, [events, todayStr]);

  const overdueTimelineItems = categorizedItems.overdue;
  const todayTimelineItems = categorizedItems.today;
  const upcomingTimelineItems = categorizedItems.upcoming;

  // ★ r45: แยก today items เป็น 2 กลุ่ม:
  //   1. carryoverItems — เริ่มก่อนวันนี้ ยังคงดำเนินการอยู่ (itemDate < todayStr)
  //   2. todayStartItems — เริ่มวันนี้จริงๆ (itemDate === todayStr)
  //   ถ้า itemDate ไม่มี ให้ถือว่าเป็น todayStart (ไม่ระบุ = ถือว่าวันนี้)
  const { carryoverItems, todayStartItems } = React.useMemo(() => {
    const carryover: TimelineItem[] = [];
    const todayStart: TimelineItem[] = [];
    for (const item of todayTimelineItems) {
      if (item.itemDate && item.itemDate < todayStr) {
        carryover.push(item);
      } else {
        todayStart.push(item);
      }
    }
    return { carryoverItems: carryover, todayStartItems: todayStart };
  }, [todayTimelineItems, todayStr]);

  // ★ r45: buildTimeGroups ใช้เฉพาะ todayStartItems (ไม่รวม carryover)
  const timeGroups = React.useMemo(
    () => buildTimeGroups(todayStartItems),
    [todayStartItems],
  );

  const carryoverCount = carryoverItems.length;

  const overdueDateClusters = React.useMemo(
    () => buildDateClusters(overdueTimelineItems),
    [overdueTimelineItems],
  );

  const upcomingDateClusters = React.useMemo(
    () => buildDateClusters(upcomingTimelineItems),
    [upcomingTimelineItems],
  );

  const todayTotalCount = todayTimelineItems.length;
  const overdueCount = overdueTimelineItems.length;
  const upcomingCount = upcomingTimelineItems.length;

  // ── Department stats ──
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
        (e) => e.date < todayStr && resolveEventStatus(e) !== 'done',
      ).length,
    };
  }, [events, dept, todayStr, initialDeptStats]);

  // ── State: status picker ──
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<TimelineItem | null>(null);
  const [toast, setToast] = React.useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // ── State: 3-dot menu & detail sheet ──
  const [menuOpenFor, setMenuOpenFor] = React.useState<TimelineItem | null>(null);
  const [detailSheetItem, setDetailSheetItem] =
    React.useState<TimelineItem | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleOpenStatusPicker = (item: TimelineItem) => {
    setActiveItem(item);
    setStatusPickerOpen(true);
  };

  const handleOpenCardMenu = (item: TimelineItem) => {
    setMenuOpenFor((prev) => (prev?.id === item.id ? null : item));
  };
  const handleCloseCardMenu = () => setMenuOpenFor(null);
  const handleOpenDetailSheet = (item: TimelineItem) => {
    setMenuOpenFor(null);
    setDetailSheetItem(item);
  };
  const handleCloseDetailSheet = () => setDetailSheetItem(null);

  const handleStatusChange = async (
    newStatus: TaskStatus | EventStatus,
  ) => {
    if (!activeItem) return;
    const item = activeItem;
    const oldStatus = item.status;
    const isTask = !!item.task;
    const isEvent = !!item.event;

    if (isTask && item.task)
      patchTask(item.task.id, { status: newStatus as TaskStatus });
    else if (isEvent && item.event)
      patchEvent(item.event.id, { status: newStatus as EventStatus });

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
      setToast({
        msg: `เปลี่ยนสถานะ "${item.title}" เป็น ${statusLabel(newStatus)}`,
        type: 'success',
      });
    } catch (e: any) {
      if (isTask && item.task)
        patchTask(item.task.id, { status: oldStatus as TaskStatus });
      else if (isEvent && item.event)
        patchEvent(item.event.id, { status: oldStatus as EventStatus });
      setToast({
        msg: `ไม่สามารถเปลี่ยนสถานะ: ${e.message || 'unknown'}`,
        type: 'error',
      });
    }
  };

  // ── RENDER HELPERS ──

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

  const renderDateClusterSection = (
    clusters: DateCluster[],
    icon: React.ReactNode,
    getLabel: (dateKey: string) => string,
    isOverdue = false,
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
                {cluster.dateKey
                  ? getLabel(cluster.dateKey)
                  : 'ไม่ระบุวันที่'}
              </div>
              <div className="yp-today-time-section__caption">
                {cluster.dateKey
                  ? formatFullDateCaption(cluster.dateKey)
                  : 'ยังไม่ได้กำหนดวันที่'}
              </div>
            </div>
            <span className="yp-today-time-section__count">
              {cluster.itemCount}
            </span>
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
          <span className="yp-today-section__count yp-today-section__count--overdue">
            {overdueCount} รายการ
          </span>
        </div>
        {overdueDateClusters.length <= 1 ? (
          renderCardList(overdueTimelineItems)
        ) : (
          renderDateClusterSection(
            overdueDateClusters,
            <AlertTriangle width={16} height={16} strokeWidth={2} />,
            (dk) => relativeDay(dk),
            true,
          )
        )}
      </section>
    );
  };

  const renderTimeSection = (
    label: string,
    caption: string,
    icon: React.ReactNode,
    items: TimelineItem[],
    sectionKey: string,
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="yp-today-time-section">
        <div className="yp-today-time-section__head">
          <span
            className="yp-today-time-section__icon"
            aria-hidden="true"
          >
            {icon}
          </span>
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

  // ── MAIN RENDER ──

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
              <div className="yp-today-hero__stat-value">
                {todayTotalCount}
              </div>
              <div className="yp-today-hero__stat-label">รายการวันนี้</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">
                {upcomingCount}
              </div>
              <div className="yp-today-hero__stat-label">กำลังจะถึง</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">
                {overdueCount}
              </div>
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
          <span className="yp-today-section__count">
            {todayTotalCount} รายการ
          </span>
        </div>
        {todayTotalCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true">
              <span role="img" aria-label="ว่าง">🌤️</span>
            </div>
            <div className="yp-empty__title">ไม่มีรายการวันนี้</div>
            <div className="yp-empty__desc">
              ว่าง ๆ ลองดูรายการที่กำลังจะถึงด้านล่าง
            </div>
          </div>
        ) : (
          <>
            {/* ★ r45: แยก carryover items — งานที่เริ่มก่อนวันนี้ */}
            {renderTimeSection(
              'ดำเนินการต่อเนื่อง',
              'งานที่เริ่มก่อนหน้านี้และยังคงดำเนินการ',
              <Timer width={16} height={16} strokeWidth={2} />,
              carryoverItems,
              'carryover',
            )}
            {/* งานที่เริ่มวันนี้จริงๆ — แบ่งตามช่วงเวลา */}
            {renderTimeSection(
              'ช่วงเช้า',
              'เริ่มก่อน 12:00 น.',
              <Sunrise width={16} height={16} strokeWidth={2} />,
              timeGroups.morning,
              'morning',
            )}
            {renderTimeSection(
              'ช่วงบ่าย',
              'เริ่มตั้งแต่ 12:00 น. เป็นต้นไป',
              <Sunset width={16} height={16} strokeWidth={2} />,
              timeGroups.afternoon,
              'afternoon',
            )}
            {renderTimeSection(
              'ไม่ระบุเวลา',
              'ยังไม่ได้กำหนดเวลาเริ่ม',
              <CircleDashed width={16} height={16} strokeWidth={2} />,
              timeGroups.unscheduled,
              'unscheduled',
            )}
          </>
        )}
      </section>

      {/* ── UPCOMING ── */}
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">กำลังจะถึง</h2>
          <span className="yp-today-section__count">
            {upcomingCount} รายการ
          </span>
        </div>
        {upcomingCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true">
              <span role="img" aria-label="ว่าง">📅</span>
            </div>
            <div className="yp-empty__title">
              ยังไม่มีรายการที่กำลังจะถึง
            </div>
            <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างรายการใหม่</div>
          </div>
        ) : (
          renderDateClusterSection(
            upcomingDateClusters,
            <CalIcon width={16} height={16} strokeWidth={2} />,
            (dk) => relativeDay(dk),
            false,
          )
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
            <div
              className="yp-stat"
              style={{ ['--accent' as string]: dept.color }}
            >
              <div className="yp-stat__icon">
                <Flag width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.total}</div>
              <div className="yp-stat__label">รายการทั้งหมด</div>
            </div>
            <div
              className="yp-stat"
              style={{ ['--accent' as string]: '#10B981' }}
            >
              <div className="yp-stat__icon">
                <Check width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.done}</div>
              <div className="yp-stat__label">เสร็จสมบูรณ์</div>
            </div>
            <div
              className="yp-stat"
              style={{ ['--accent' as string]: dept.color }}
            >
              <div className="yp-stat__icon">
                <Clock width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.ongoing}</div>
              <div className="yp-stat__label">กำลังดำเนินการ</div>
            </div>
            <div
              className="yp-stat"
              style={{ ['--accent' as string]: '#F43F5E' }}
            >
              <div className="yp-stat__icon">
                <AlertCircle width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.overdue}</div>
              <div className="yp-stat__label">เลยกำหนด</div>
            </div>
          </div>
          <div className="yp-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                flexWrap: 'wrap',
              }}
            >
              <div className="yp-avatar-group">
                {deptMembers.slice(0, 6).map((m) => (
                  <span
                    key={m.auth_uid}
                    className="yp-avatar"
                    style={{
                      display: 'inline-flex',
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--yp-radius-pill)',
                      overflow: 'hidden',
                      boxShadow: 'var(--yp-shadow-xs)',
                      border: '2px solid white',
                    }}
                    title={m.full_name}
                  >
                    <Avatar name={m.full_name} color={m.color} size={28} />
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontSize: 'var(--yp-text-xs)',
                  color: 'var(--yp-text-muted)',
                }}
              >
                สมาชิก {deptMembers.length} คน
              </div>
            </div>
            {dept.description ? (
              <div
                style={{
                  fontSize: 'var(--yp-text-xs)',
                  color: 'var(--yp-text-body)',
                  lineHeight: 1.5,
                }}
              >
                {dept.description}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── STATUS PICKER SHEET ── */}
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
          {activeItem
            ? (
                activeItem.task
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
                      {s === 'done' ? (
                        <Check width={16} height={16} />
                      ) : s === 'ongoing' ? (
                        <RefreshCw width={14} height={14} />
                      ) : (
                        <Clock width={14} height={14} />
                      )}
                    </div>
                    <div className="yp-status-picker__text">
                      <div className="yp-status-picker__label">
                        {meta.label}
                      </div>
                      <div className="yp-status-picker__desc">
                        {meta.desc}
                      </div>
                    </div>
                    {isCurrent ? (
                      <div className="yp-status-picker__check">
                        <Check width={18} height={18} />
                      </div>
                    ) : null}
                  </button>
                );
              })
            : null}
        </div>
      </BottomSheet>

      {/* ── DETAIL SHEET ── */}
      <BottomSheet
        open={!!detailSheetItem}
        onClose={handleCloseDetailSheet}
        title={detailSheetItem?.title}
        description={
          detailSheetItem &&
          detailSheetItem.task &&
          detailSheetItem.parentEvent
            ? 'รายการย่อย'
            : 'รายการ'
        }
      >
        {detailSheetItem
          ? (() => {
              const di = detailSheetItem;
              const diIsSubItem = !!di.parentEvent && !!di.task;
              const diDetailHref = di.event
                ? `/events/${di.event.id}`
                : di.parentEvent
                  ? `/events/${di.parentEvent.id}`
                  : '#';
              const diStatusMeta = STATUS_META[di.status];
              const diPriorityLbl =
                PRIORITY_LBL[di.priority || 'medium'] || 'ปกติ';
              // ★ r43: Use centralized formatScheduleLabel (Module 5)
              const diScheduleText = formatScheduleLabel(di, todayStr);
              const diIsOverdue = di.dateContext === 'overdue';

              return (
                <div className="yp-card-detail">
                  {/* Status row */}
                  <div className="yp-card-detail__row">
                    <div className="yp-card-detail__label">
                      <span className="yp-card-detail__label-text">
                        สถานะ
                      </span>
                    </div>
                    <div className="yp-card-detail__value">
                      <span
                        className={`yp-card-detail__chip yp-card-detail__chip--status yp-card-detail__chip--status-${di.status}`}
                        style={{
                          ['--status-color' as string]: diStatusMeta.color,
                        }}
                      >
                        {di.status === 'done' ? (
                          <Check width={12} height={12} />
                        ) : di.status === 'ongoing' ? (
                          <RefreshCw width={12} height={12} />
                        ) : (
                          <Clock width={12} height={12} />
                        )}
                        {diStatusMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Schedule row — uses centralized formatScheduleLabel */}
                  {diScheduleText ? (
                    <div className="yp-card-detail__row">
                      <div className="yp-card-detail__label">
                        <Clock width={14} height={14} />
                        <span className="yp-card-detail__label-text">
                          กำหนดการ
                        </span>
                      </div>
                      <div className="yp-card-detail__value">
                        <span
                          className={`yp-card-detail__schedule${diIsOverdue ? ' is-overdue' : ''}`}
                        >
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
                        <span className="yp-card-detail__label-text">
                          จากกลุ่ม
                        </span>
                      </div>
                      <div className="yp-card-detail__value">
                        {/* ★ r45 FIX: ใช้ <a> + window.location.href แทน Next.js Link
                            เพื่อหลีกเลี่ยงปัญหา history state conflict
                            ที่ทำให้กดแล้ว sheet ปิดแต่ไม่ navigate
                            ใช้ href จริงเพื่อรองรับ right-click → เปิดในแท็บใหม่ */}
                        <a
                          href={`/events/${di.parentEvent.id}`}
                          className="yp-card-detail__link"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCloseDetailSheet();
                            // รอให้ React ประมวลผล state แล้วค่อย navigate
                            setTimeout(() => {
                              window.location.href = `/events/${di.parentEvent.id}`;
                            }, 50);
                          }}
                        >
                          {di.parentEvent.title}
                          <ArrowUpRight width={12} height={12} />
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {/* Assignee row */}
                  {di.assigneeName ? (
                    <div className="yp-card-detail__row">
                      <div className="yp-card-detail__label">
                        <UserIcon width={14} height={14} />
                        <span className="yp-card-detail__label-text">
                          ผู้รับผิดชอบ
                        </span>
                      </div>
                      <div className="yp-card-detail__value">
                        <span className="yp-card-detail__assignee">
                          {di.assigneeColor ? (
                            <Avatar
                              name={di.assigneeName}
                              color={di.assigneeColor}
                              size={20}
                            />
                          ) : null}
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
                        <span className="yp-card-detail__label-text">
                          ระยะเวลา
                        </span>
                      </div>
                      <div className="yp-card-detail__value">
                        {di.estimatedTime}
                      </div>
                    </div>
                  ) : null}

                  {/* Location row */}
                  {di.location ? (
                    <div className="yp-card-detail__row">
                      <div className="yp-card-detail__label">
                        <MapPin width={14} height={14} />
                        <span className="yp-card-detail__label-text">
                          สถานที่
                        </span>
                      </div>
                      <div className="yp-card-detail__value">
                        {di.location}
                      </div>
                    </div>
                  ) : null}

                  {/* Priority row */}
                  <div className="yp-card-detail__row">
                    <div className="yp-card-detail__label">
                      <Flag width={14} height={14} />
                      <span className="yp-card-detail__label-text">
                        ความสำคัญ
                      </span>
                    </div>
                    <div className="yp-card-detail__value">
                      <span
                        className={`yp-card-detail__priority yp-card-detail__priority--${di.priority || 'medium'}`}
                      >
                        {diPriorityLbl}
                      </span>
                    </div>
                  </div>

                  {/* CTA: open full detail page
                      ★ r45 FIX: ใช้ <a> + window.location.href แทน Next.js Link
                      เพื่อหลีกเลี่ยงปัญหา Next.js spread history state
                      ทำให้ cleanup ของ window เรียก history.back() ยกเลิก navigation */}
                  <a
                    href={diDetailHref}
                    className="yp-card-detail__cta"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCloseDetailSheet();
                      setTimeout(() => {
                        window.location.href = diDetailHref;
                      }, 50);
                    }}
                  >
                    ดูหน้าเต็ม
                    <ChevronRight width={14} height={14} />
                  </a>
                </div>
              );
            })()
          : null}
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
// MODULE 7: TODAY ITEM CARD (v3.10.0-r44 — 4-Row Layout)
// ═══════════════════════════════════════════════════════════════
//
// Card layout (TOP → BOTTOM):
//
//  Row 1: [ว่าง]                    [🕐 เวลา] [•••]
//  Row 2: 📚 ชื่องาน (Title — พระเอก ใหญ่ เด่น)
//  Row 3: 👥 จากกลุ่ม: XXX  (รายการย่อยเท่านั้น)
//  Row 4: [🔴 เลยกำหนด] [🟡 รอเริ่ม] [📍 สถานที่]
//
//  ★ ไม่มีเส้น Divider — ใช้ Padding/Spacing จัดกลุ่มข้อมูล
//  ★ เวลาใน Row 1 ไม่โดดเด่น ไม่มีกรอบแคปซูล
//  ★ ไอคอน Layers บอกประเภทรายการย่อยแทนคำว่า "รายการย่อย"
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
  const isOverdue = item.dateContext === 'overdue';
  const isUpcoming = item.dateContext === 'upcoming';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';
  const isSubItem = !!item.parentEvent && !!item.task;

  // Row 1: Time display (subtle, no capsule)
  const timeDisplay = formatCardTimeDisplay(item, todayStr);

  return (
    <div
      className={`yp-today-item-card${item.status === 'done' ? ' is-done' : ''}${isMenuOpen ? ' is-menu-open' : ''}`}
      style={{ ['--accent' as string]: accent }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenStatusPicker(item);
        }
      }}
      aria-label={`${item.title}${isSubItem ? ' (รายการย่อย)' : ''} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* ── Body ── */}
      <div className="yp-today-item-card__body">
        {/* Row 1: Time + Menu (right-aligned) */}
        <div className="yp-today-item-card__top-right">
          {timeDisplay ? (
            <span className="yp-today-item-card__time">
              <Clock width={12} height={12} />
              {timeDisplay}
            </span>
          ) : null}
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
        </div>

        {/* Row 2: Title (hero — large, prominent, with type icon) */}
        <div className="yp-today-item-card__title">
          {isSubItem ? (
            <Layers
              width={14}
              height={14}
              className="yp-today-item-card__title-icon"
            />
          ) : null}
          {item.title}
        </div>

        {/* Row 3: From group (sub-items only) */}
        {isSubItem && item.parentEvent ? (
          <div className="yp-today-item-card__group">
            <Users width={12} height={12} />
            <span className="yp-today-item-card__group-label">
              จากกลุ่ม:
            </span>
            <span className="yp-today-item-card__group-name">
              {item.parentEvent.title}
            </span>
          </div>
        ) : null}

        {/* Row 4: Badges (status, priority, location, etc.) */}
        <div className="yp-today-item-card__badges">
          {/* Status / Overdue badge */}
          {isOverdue && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__badge yp-today-item-card__badge--overdue">
              <AlertTriangle width={11} height={11} />
              เลยกำหนด {relativeDay(item.itemDate)}
            </span>
          ) : (
            <span
              className={`yp-today-item-card__badge yp-today-item-card__badge--status yp-today-item-card__badge--${item.status}`}
            >
              {item.status === 'done' ? (
                <Check width={11} height={11} />
              ) : item.status === 'ongoing' ? (
                <RefreshCw width={11} height={11} />
              ) : (
                <Clock width={11} height={11} />
              )}
              {statusLabel(item.status)}
            </span>
          )}

          {/* Priority badge (skip medium) */}
          {priority !== 'medium' ? (
            <span
              className={`yp-today-item-card__badge yp-today-item-card__badge--priority is-priority-${priority}`}
            >
              {priorityLbl}
            </span>
          ) : null}

          {/* Location badge */}
          {item.location ? (
            <span className="yp-today-item-card__badge">
              <MapPin width={11} height={11} />
              {item.location}
            </span>
          ) : null}

          {/* Estimated time badge */}
          {item.estimatedTime ? (
            <span className="yp-today-item-card__badge">
              <Timer width={11} height={11} />
              {item.estimatedTime}
            </span>
          ) : null}

          {/* Assignee badge */}
          {item.assigneeName ? (
            <span className="yp-today-item-card__badge yp-today-item-card__badge--assignee">
              {item.assigneeColor ? (
                <Avatar
                  name={item.assigneeName}
                  color={item.assigneeColor}
                  size={14}
                />
              ) : null}
              {item.assigneeName}
            </span>
          ) : null}

          {/* Upcoming date badge (only if no time display in Row 1) */}
          {isUpcoming &&
          item.itemDate &&
          item.itemDate !== todayStr &&
          !timeDisplay ? (
            <span className="yp-today-item-card__badge">
              <CalIcon width={11} height={11} />
              จะเริ่ม {relativeDay(item.itemDate)}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Popup menu ── */}
      {isMenuOpen ? (
        <>
          <div
            className="yp-today-item-card__popup-overlay"
            onClick={(e) => {
              e.stopPropagation();
              onCloseMenu();
            }}
            aria-hidden="true"
          />
          <div className="yp-today-item-card__popup" role="menu">
            <button
              type="button"
              className="yp-today-item-card__popup-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onViewMore(item);
              }}
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
