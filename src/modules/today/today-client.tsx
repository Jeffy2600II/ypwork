'use client';

// ============================================================
// YP WORK - Today Dashboard (v3.11.0 r1 — major redesign)
// ============================================================
// ★ v3.11.0 r1: เปลี่ยนการออกแบบหน้า Today ทั้งหมด
//   - ไม่แสดงรายการย่อยแบบ timeline แล้ว
//   - ใช้ EventCard (การ์ดรายการ) แบบเดียวกับหน้ารายการ
//   - แสดง 3 sections: เลยกำหนด / วันนี้ / กำลังจะถึง
//   - กลุ่มรายการสามารถปรากฏในหลาย section พร้อมกันได้
//   - คลิกการ์ด → ไปหน้ารายละเอียดพร้อม filter ที่ตรงกับ section
// ============================================================

import * as React from 'react';
import {
  Flag,
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
import { categorizeEventsIntoSections } from './today-helpers';

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

  // ── Categorize events into 3 sections ──
  // ★ v3.11.0 r1: ใช้ categorizeEventsIntoSections แทน timeline items
  //   กลุ่มรายการสามารถปรากฏในหลาย section พร้อมกันได้
  const { today: todayEvents, upcoming } = React.useMemo(
    () => categorizeEventsIntoSections(events, todayStr),
    [events, todayStr],
  );

  const todayCount = todayEvents.length;
  const upcomingCount = upcoming.length;

  // ── Department stats ──
  const deptStats = React.useMemo(() => {
    if (!dept) return initialDeptStats;
    const deptEvents = events.filter((e) => e.department_id === dept.id);
    return {
      total: deptEvents.length,
    };
  }, [events, dept, initialDeptStats]);

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
                {todayCount}
              </div>
              <div className="yp-today-hero__stat-label">รายการวันนี้</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">
                {upcomingCount}
              </div>
              <div className="yp-today-hero__stat-label">กำลังจะถึง</div>
            </div>

          </div>
        </div>
      </div>

      {/* ── TODAY ── */}
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">รายการวันนี้</h2>
          <span className="yp-today-section__count">
            {todayCount} รายการ
          </span>
        </div>
        {todayCount === 0 ? (
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
          <div className="yp-today-event-list">
            {todayEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} filter="today" />
            ))}
          </div>
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
          <div className="yp-today-event-list">
            {upcoming.map((ev) => (
              <EventCard key={ev.id} event={ev} filter="upcoming" />
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
    </div>
  );
}
