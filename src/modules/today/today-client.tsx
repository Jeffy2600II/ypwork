'use client';

// ============================================================
// YP WORK - Today Dashboard
// ============================================================
// Round 18: Full UX redesign with 5 natural date sections.
// Shows what's happening now, what's coming, what needs attention.
// ============================================================

import * as React from 'react';
import {
  Flag,
  AlertCircle,
  Sun,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import type {
  YPEvent,
  Department,
  UserProfile,
  SessionUser,
} from '@/lib/types';
import {
  useRealtimeEvents,
  useRealtimeDepartments,
  useRealtimeDeptMembers,
  useRealtimeSessionUser,
} from '@/lib/hooks/use-realtime';
import {
  getTimeGreeting,
  getLocalTodayStr,
  getThailandTodayParts,
  THAI_DAYS,
  THAI_MONTHS,
} from '@/lib/utils/date';
import { EventCard } from '@/modules/events/event-card';
import {
  categorizeEventsIntoSections,
  getSectionMeta,
  type TodaySectionKey,
} from './today-helpers';

export function TodayClient({
  initialEvents,
  user: initialUser,
  dept: initialDept,
  deptMembers: initialDeptMembers,
  deptStats: initialDeptStats,
}: {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number };
}) {
  // ── Realtime hooks ──
  const { events } = useRealtimeEvents(initialEvents);
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

  // ── Categorize events into 5 sections ──
  const sections = React.useMemo(
    () => categorizeEventsIntoSections(events, todayStr),
    [events, todayStr],
  );

  const sectionOrder: { key: TodaySectionKey; events: YPEvent[] }[] = [
    { key: 'overdue', events: sections.overdue },
    { key: 'today', events: sections.today },
    { key: 'tomorrow', events: sections.tomorrow },
    { key: 'thisWeek', events: sections.thisWeek },
    { key: 'nextWeek', events: sections.nextWeek },
  ];

  const visibleSections = sectionOrder.filter((s) => s.events.length > 0);
  const totalActive = sections.today.length + sections.overdue.length;

  // ── Department stats ──
  const deptStats = React.useMemo(() => {
    if (!dept) return initialDeptStats;
    const deptEvents = events.filter((e) => e.department_id === dept.id);
    return {
      total: deptEvents.length,
    };
  }, [events, dept, initialDeptStats]);

  // ── Section icon mapping ──
  const sectionIcons: Record<TodaySectionKey, React.ReactNode> = {
    overdue: <AlertCircle width={16} height={16} />,
    today: <Sun width={16} height={16} />,
    tomorrow: <CalendarDays width={16} height={16} />,
    thisWeek: <CalendarRange width={16} height={16} />,
    nextWeek: <CalendarRange width={16} height={16} />,
  };

  // ── Empty state messages per section ──
  const emptyMessages: Record<TodaySectionKey, { icon: string; title: string; desc: string }> = {
    overdue: {
      icon: '✅',
      title: 'ไม่มีรายการที่เลยกำหนด',
      desc: 'ทุกอย่างอยู่ในเวลาที่กำหนด',
    },
    today: {
      icon: '🌤️',
      title: 'ไม่มีรายการวันนี้',
      desc: 'ลองดูรายการที่กำลังจะถึงได้ด้านล่าง',
    },
    tomorrow: {
      icon: '⏭️',
      title: 'ไม่มีรายการพรุ่งนี้',
      desc: 'ดูรายการในสัปดาห์นี้ได้ด้านล่าง',
    },
    thisWeek: {
      icon: '📅',
      title: 'ยังไม่มีรายการในสัปดาห์นี้',
      desc: 'กดปุ่ม + เพื่อสร้างรายการใหม่',
    },
    nextWeek: {
      icon: '🗓️',
      title: 'ยังไม่มีรายการในสัปดาห์หน้า',
      desc: 'วางแผนล่วงหน้าได้เลย',
    },
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
            {sections.overdue.length > 0 && (
              <div className="yp-today-hero__stat yp-today-hero__stat--overdue">
                <div className="yp-today-hero__stat-value">
                  {sections.overdue.length}
                </div>
                <div className="yp-today-hero__stat-label">เลยกำหนด</div>
              </div>
            )}
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">
                {sections.today.length}
              </div>
              <div className="yp-today-hero__stat-label">วันนี้</div>
            </div>
            {sections.tomorrow.length > 0 && (
              <div className="yp-today-hero__stat">
                <div className="yp-today-hero__stat-value">
                  {sections.tomorrow.length}
                </div>
                <div className="yp-today-hero__stat-label">พรุ่งนี้</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DATE SECTIONS ── */}
      {visibleSections.length === 0 ? (
        <div className="yp-empty yp-empty--large">
          <div className="yp-empty__icon" aria-hidden="true">
            <span role="img" aria-label="ว่าง">🌟</span>
          </div>
          <div className="yp-empty__title">ไม่มีรายการในขณะนี้</div>
          <div className="yp-empty__desc">
            กดปุ่ม + เพื่อสร้างรายการใหม่
          </div>
        </div>
      ) : (
        visibleSections.map(({ key, events: sectionEvents }) => {
          const meta = getSectionMeta(key, sectionEvents.length);
          const isEmpty = sectionEvents.length === 0;
          const isOverdue = key === 'overdue';

          return (
            <section
              key={key}
              className={`yp-today-section yp-today-section--panel${isOverdue ? ' yp-today-section--overdue' : ''}`}
            >
              <div className="yp-today-section__head">
                <div className="yp-today-section__head-left">
                  <span
                    className={`yp-today-section__icon${isOverdue ? ' yp-today-section__icon--overdue' : ''}`}
                    aria-hidden="true"
                  >
                    {sectionIcons[key]}
                  </span>
                  <h2 className="yp-today-section__title">{meta.title}</h2>
                </div>
                <span className="yp-today-section__count">
                  {sectionEvents.length} รายการ
                </span>
              </div>
              {!isEmpty && meta.subtitle && (
                <p className="yp-today-section__subtitle">{meta.subtitle}</p>
              )}
              {isEmpty ? (
                <div className="yp-empty yp-empty--compact">
                  <div className="yp-empty__icon" aria-hidden="true">
                    <span role="img" aria-label="ว่าง">
                      {emptyMessages[key].icon}
                    </span>
                  </div>
                  <div className="yp-empty__title">{emptyMessages[key].title}</div>
                  <div className="yp-empty__desc">{emptyMessages[key].desc}</div>
                </div>
              ) : (
                <div className="yp-today-event-list">
                  {sectionEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      filter={key === 'today' ? 'today' : 'upcoming'}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

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
          </div>
          <div className="yp-card yp-dept-overview">
            <div className="yp-dept-overview__members">
              <div className="yp-avatar-group">
                {deptMembers.slice(0, 6).map((m) => (
                  <span
                    key={m.auth_uid}
                    className="yp-avatar yp-avatar--stacked"
                    title={m.full_name}
                  >
                    <Avatar name={m.full_name} color={m.color} size={28} />
                  </span>
                ))}
              </div>
              <div className="yp-dept-overview__member-count">
                สมาชิก {deptMembers.length} คน
              </div>
            </div>
            {dept.description ? (
              <div className="yp-dept-overview__desc">
                {dept.description}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
