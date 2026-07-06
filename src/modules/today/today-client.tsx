'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v1.8.2 — full realtime client island)
// ═══════════════════════════════════════════════════════════════
// แยกออกจาก today/page.tsx (server) เพื่อให้สามารถ subscribe
// Supabase Realtime ได้ — ปฏิเสธ polling โดยสิ้นเชิง
//
// v1.8.2 changes (Realtime ทั่วทั้งหน้า):
//   - เพิ่ม useRealtimeSessionUser — ชื่อ/สี/ฝ่าย ของ user ใน hero อัพเดต live
//     (ถ้า admin เปลี่ยนชื่อหรือย้ายฝ่าย ผู้ใช้เห็นทันที)
//   - เพิ่ม useRealtimeDeptMembers — สมาชิกในฝ่าย (avatar group) อัพเดต live
//     (ถ้ามีคนใหม่เข้าฝ่าย หรือมีคนถูกปิดใช้งาน)
//   - เพิ่ม useRealtimeDepartments — ชื่อ/ไอคอน/คำอธิบายฝ่ายอัพเดต live
//   - แก้ useRealtimeEvents ให้ reload ตอน mount + subscribe council_users,
//     departments, ypwork_event_members (เห็นการเปลี่ยนแปลงทุกตารางที่เกี่ยวข้อง)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { EventCard } from '@/modules/events/event-card';
import {
  getTimeGreeting,
  getLocalTodayStr,
  THAI_DAYS,
  THAI_MONTHS,
} from '@/lib/utils/date';
import { AlertCircle, Flag, Check, Clock } from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import type { YPEvent, Department, UserProfile, SessionUser } from '@/lib/types';
import { useRealtimeEvents, useRealtimeDepartments, useRealtimeDeptMembers, useRealtimeSessionUser } from '@/lib/hooks/use-realtime';
import { InfoButton } from '@/components/ui/info-button';

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number; done: number; ongoing: number; overdue: number };
}

export function TodayClient({
  initialEvents,
  user: initialUser,
  dept: initialDept,
  deptMembers: initialDeptMembers,
  deptStats: initialDeptStats,
}: TodayClientProps) {
  // v1.6: realtime subscription — events อัพเดตทันทีเมื่อ DB เปลี่ยน
  // v1.8.2: ตอนนี้ subscribe ครอบคลุม ypwork_events, ypwork_tasks,
  //   ypwork_task_assignees, ypwork_event_members, council_users, departments
  const { events } = useRealtimeEvents(initialEvents);

  // v1.8.2: live session user — ชื่อ/สี/ฝ่าย ของ user ใน hero อัพเดต live
  //   ถ้า admin เปลี่ยนชื่อหรือย้ายฝ่าย ผู้ใช้เห็นทันที
  const { user } = useRealtimeSessionUser(initialUser);

  // v1.8.2: live departments — ถ้า user มีฝ่าย ดึงฝ่ายล่าสุดจาก DB
  //   เผื่อ admin เปลี่ยนชื่อ/ไอคอน/คำอธิบายฝ่าย
  const { departments: liveDepartments } = useRealtimeDepartments(
    initialDept ? [initialDept] : []
  );
  const liveDept =
    user.department_id
      ? liveDepartments.find((d) => d.id === user.department_id) ?? null
      : null;

  // v1.8.2: live dept members — avatar group + จำนวนสมาชิกอัพเดต live
  //   ถ้ามีคนใหม่เข้าฝ่าย หรือคนถูก disabled
  const { members: liveDeptMembers } = useRealtimeDeptMembers(
    user.department_id,
    initialDeptMembers
  );

  // ใช้ live dept + live members แทน static props
  const dept = liveDept ?? initialDept;
  const deptMembers = liveDeptMembers;

  // ใช้ local date เสมอ (v1.6 — ป้องกันปัญหา UTC offset)
  const now = new Date();
  const greeting = getTimeGreeting();
  const dayName = THAI_DAYS[now.getDay()];
  const dayNum = now.getDate();
  const monthName = THAI_MONTHS[now.getMonth()];
  const yearBE = now.getFullYear() + 543;
  const todayLong = `${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
  const todayStr = getLocalTodayStr();

  const todays = events.filter((e) => e.date === todayStr);
  const upcoming = events
    .filter((e) => e.date > todayStr)
    .slice(0, 4);
  const overdue = events.filter(
    (e) => e.date < todayStr && e.status !== 'done'
  );

  // dept stats คำนวณจาก events ทั้งหมด (realtime)
  const deptStats = React.useMemo(() => {
    if (!dept) return initialDeptStats;
    const deptEvents = events.filter(
      (e) => e.department_id === dept.id
    );
    return {
      total: deptEvents.length,
      done: deptEvents.filter((e) => e.status === 'done').length,
      ongoing: deptEvents.filter(
        (e) => e.status === 'ongoing' || e.status === 'planning'
      ).length,
      overdue: deptEvents.filter(
        (e) => e.date < todayStr && e.status !== 'done'
      ).length,
    };
  }, [events, dept, todayStr, initialDeptStats]);

  return (
    <div className="yp-page yp-page-enter">
      {/* ── HERO ── */}
      <div className="yp-today-hero yp-hero-enter">
        <div className="yp-today-hero__content">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div className="yp-today-hero__greeting">{greeting}</div>
            <InfoButton
              size="sm"
              side="bottom"
              align="start"
              title="หน้านี้คืออะไร?"
              content={
                <>
                  <strong>หน้าแรก (Today)</strong> แสดงภาพรวมงานของคุณในวันนี้
                  <br />
                  <br />
                  <strong>งานวันนี้</strong> — งานที่มีกำหนดวันนี้
                  <br />
                  <strong>กำลังจะถึง</strong> — งานในอนาคตอันใกล้
                  <br />
                  <strong>เลยกำหนด</strong> — งานที่เลย deadline และยังไม่เสร็จ
                  <br />
                  <br />
                  ทุกอย่างอัพเดต <strong>realtime</strong> — ไม่ต้อง refresh
                </>
              }
            />
          </div>
          <div className="yp-today-hero__name">{user.full_name}</div>
          <div className="yp-today-hero__date">{todayLong}</div>
          <div className="yp-today-hero__stats">
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{todays.length}</div>
              <div className="yp-today-hero__stat-label">งานวันนี้</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{upcoming.length}</div>
              <div className="yp-today-hero__stat-label">กำลังจะถึง</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{overdue.length}</div>
              <div className="yp-today-hero__stat-label">เลยกำหนด</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── OVERDUE ── */}
      {overdue.length > 0 ? (
        <section className="yp-today-section">
          <div className="yp-today-section__head">
            <h2 className="yp-today-section__title">
              งานที่เลยกำหนด
              <InfoButton
                size="sm"
                side="right"
                align="start"
                title="งานที่เลยกำหนด"
                content={
                  <>
                    งานที่ deadline ผ่านไปแล้ว แต่ยังไม่เสร็จสิ้น (status ไม่ใช่ done)
                    <br />
                    <br />
                    <strong>ควรทำก่อน!</strong> งานเหล่านี้กำลังค้างอยู่
                  </>
                }
              />
            </h2>
            <span className="yp-today-section__count">
              {overdue.length} รายการ
            </span>
          </div>
          <div>
            {overdue.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── TODAY ── */}
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">งานวันนี้</h2>
          <span className="yp-today-section__count">
            {todays.length} รายการ
          </span>
        </div>
        {todays.length === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true">
              <span role="img" aria-label="ว่าง">
                🌤️
              </span>
            </div>
            <div className="yp-empty__title">ไม่มีงานวันนี้</div>
            <div className="yp-empty__desc">
              ว่าง ๆ ลองดูงานที่กำลังจะถึงด้านล่าง
            </div>
          </div>
        ) : (
          <div>
            {todays.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>

      {/* ── UPCOMING ── */}
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">กำลังจะถึง</h2>
          <span className="yp-today-section__count">
            {upcoming.length} รายการ
          </span>
        </div>
        {upcoming.length === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true">
              <span role="img" aria-label="ว่าง">
                📅
              </span>
            </div>
            <div className="yp-empty__title">ยังไม่มีงานที่กำลังจะถึง</div>
            <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างงานใหม่</div>
          </div>
        ) : (
          <div>
            {upcoming.map((ev) => (
              <EventCard key={ev.id} event={ev} />
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
              <InfoButton
                size="sm"
                side="right"
                align="start"
                title="ภาพรวมฝ่าย"
                content={
                  <>
                    สถิติงานของฝ่าย {dept.name} ที่คุณสังกัด
                    <br />
                    <br />
                    <strong>งานทั้งหมด</strong> — จำนวนงานที่ฝ่ายรับผิดชอบ
                    <br />
                    <strong>เสร็จแล้ว</strong> — status = done
                    <br />
                    <strong>กำลังทำ</strong> — status = ongoing หรือ planning
                    <br />
                    <strong>เลยกำหนด</strong> — เลย deadline และยังไม่เสร็จ
                  </>
                }
              />
            </h2>
          </div>

          <div className="yp-stat-grid" style={{ marginBottom: 'var(--yp-space-3)' }}>
            <div className="yp-stat" style={{ ['--accent' as string]: dept.color }}>
              <div className="yp-stat__icon">
                <Flag width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.total}</div>
              <div className="yp-stat__label">งานทั้งหมด</div>
            </div>
            <div
              className="yp-stat"
              style={{ ['--accent' as string]: '#10B981' }}
            >
              <div className="yp-stat__icon">
                <Check width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.done}</div>
              <div className="yp-stat__label">เสร็จแล้ว</div>
            </div>
            <div
              className="yp-stat"
              style={{ ['--accent' as string]: dept.color }}
            >
              <div className="yp-stat__icon">
                <Clock width={18} height={18} />
              </div>
              <div className="yp-stat__value">{deptStats.ongoing}</div>
              <div className="yp-stat__label">กำลังทำ</div>
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
                    <Avatar
                      name={m.full_name}
                      color={m.color}
                      size={28}
                    />
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
