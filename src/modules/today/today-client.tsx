'use client';

// ============================================================
// YP WORK - Today Dashboard (r48 - modular split)
// ============================================================
// Orchestrator ของ Today dashboard
// - ใช้ helpers/sorting/format จากไฟล์แยก (today-helpers, today-sorting, today-format)
// - ใช้ TodayItemCard จาก today-item-card.tsx
// - ใช้ shared types จาก today-types.ts
// ============================================================

import * as React from 'react';
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
  CornerDownRight,
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
import { STATUS_META } from '@/modules/_shared/status-meta';
import { StatusPickerSheet } from '@/modules/_shared/status-picker-sheet';
import { TOAST_AUTO_DISMISS, REACT_COMMIT_DURATION } from '@/lib/core/sheet-timing';
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
// r48: imports จาก split files
import type {
  TodayClientProps,
  TimelineItem,
  ItemDateContext,
  DateCluster,
} from './today-types';
import { PRIORITY_LBL } from './today-types';
import {
  buildStandaloneEventItem,
  buildTaskItem,
  categorizeByDates,
  buildDateClusters,
  formatFullDateCaption,
  buildTimeGroups,
} from './today-helpers';
import {
  sortByPriorityTimeTitle,
  sortByDatePriorityTimeTitle,
} from './today-sorting';
import { formatScheduleLabel, formatCardTimeDisplay } from './today-format';
import { TodayItemCard } from './today-item-card';

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
    const t = setTimeout(() => setToast(null), TOAST_AUTO_DISMISS);
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
        {/* ★ r46: ใช้ renderDateClusterSection เสมอ — ให้ทุก section มี sub-section
            header เหมือน section "วันนี้" (ช่วงเช้า/บ่าย/ฯลฯ) และ section "กำลังจะถึง"
            ก่อนหน้านี้เมื่อมี 1 cluster จะ render การ์ดเลย ทำให้ flow ต่างจาก section อื่น */}
        {renderDateClusterSection(
          overdueDateClusters,
          <AlertTriangle width={16} height={16} strokeWidth={2} />,
          (dk) => relativeDay(dk),
          true,
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
      {/* ★ r47: ใช้ shared StatusPickerSheet จาก _shared/ แทน inline JSX */}
      <StatusPickerSheet
        open={statusPickerOpen}
        onClose={() => {
          setStatusPickerOpen(false);
          setActiveItem(null);
        }}
        title="สถานะของรายการ"
        description={activeItem?.title}
        statuses={
          activeItem
            ? activeItem.task
              ? (['todo', 'ongoing', 'done'] as TaskStatus[])
              : (['todo', 'ongoing', 'done'] as EventStatus[])
            : []
        }
        currentStatus={activeItem?.status}
        onSelect={(s) => handleStatusChange(s as TaskStatus | EventStatus)}
      />

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
                  {diIsSubItem && di.parentEvent ? (() => {
                    const parentEvent = di.parentEvent;  // ★ r47: capture เพื่อ narrow type ใน setTimeout closure
                    return (
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
                          href={`/events/${parentEvent.id}`}
                          className="yp-card-detail__link"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCloseDetailSheet();
                            // รอให้ React ประมวลผล state แล้วค่อย navigate
                            // ★ r47: ใช้ shared constant แทน magic number 50
                            setTimeout(() => {
                              window.location.href = `/events/${parentEvent.id}`;
                            }, REACT_COMMIT_DURATION);
                          }}
                        >
                          {parentEvent.title}
                          <ArrowUpRight width={12} height={12} />
                        </a>
                      </div>
                    </div>
                    );
                  })() : null}

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
