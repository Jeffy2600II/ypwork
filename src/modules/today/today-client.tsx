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
import { TodayTaskCard } from '@/modules/today/today-task-card';
import {
  getTimeGreeting,
  getLocalTodayStr,
  getThailandTodayParts,   // ★ v3.9.4: Thailand timezone
  THAI_DAYS,
  THAI_MONTHS,
} from '@/lib/utils/date';
import { AlertCircle, Flag, Check, Clock } from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import type { YPEvent, Department, UserProfile, SessionUser, Task } from '@/lib/types';
import { useRealtimeEvents, useRealtimeDepartments, useRealtimeDeptMembers, useRealtimeSessionUser } from '@/lib/hooks/use-realtime';

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

  // ★ v3.9.4: ใช้เขตเวลาไทย (Asia/Bangkok, UTC+7) สำหรับ "วันนี้" และการแสดงผล
  //   ก่อนหน้านี้: new Date().getDay() ใช้ timezone เครื่อง user
  //   ถ้า user เปิดเว็บจากต่างประเทศ "วันนี้" อาจไม่ตรงกับไทย → แสดงผิด
  const todayParts = getThailandTodayParts();
  const greeting = getTimeGreeting();
  const dayName = THAI_DAYS[todayParts.weekday];
  const dayNum = todayParts.day;
  const monthName = THAI_MONTHS[todayParts.month];
  const yearBE = todayParts.year + 543;
  const todayLong = `${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
  const todayStr = getLocalTodayStr();

  // ★ v3.9.9: "งานวันนี้" แสดงผลครบทุกงานที่ต้องทำวันนี้จริง ๆ
  //   ประกอบด้วย:
  //   1. todaysEvents — event ที่ date = วันนี้ (เหมือนเดิม)
  //   2. todaysStandaloneTasks — task ย่อยที่ due_date = วันนี้ แต่ parent event
  //      อยู่ในวันอื่น (เพื่อกัน duplicate — ถ้า parent event อยู่ในวันนี้อยู่แล้ว
  //      task เหล่านั้นจะแสดงผ่าน EventCard ของ parent อยู่แล้วในส่วน progress)
  const todaysEvents = events.filter((e) => e.date === todayStr);
  const todaysStandaloneTasks = React.useMemo(() => {
    const list: { task: Task; event: YPEvent }[] = [];
    for (const ev of events) {
      // ข้าม event ที่เป็นวันนี้ — task ของมันจะแสดงใน EventCard ของ parent แล้ว
      if (ev.date === todayStr) continue;
      // ข้าม task ที่ done (เสร็จแล้วไม่ต้องแสดงใน "งานวันนี้")
      //   ยกเว้นถ้า user อยากเห็น — แต่ default คือซ่อน task ที่เสร็จแล้ว
      //   เพื่อให้ "งานวันนี้" โฟกัสที่สิ่งที่ต้องทำ
      for (const t of ev.tasks || []) {
        if (t.due_date === todayStr && t.status !== 'done') {
          list.push({ task: t, event: ev });
        }
      }
    }
    // เรียงตาม priority (high > medium > low) แล้วตาม title
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.task.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.task.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return a.task.title.localeCompare(b.task.title, 'th');
    });
    return list;
  }, [events, todayStr]);

  // จำนวนรายการ "งานวันนี้" รวม = events ของวันนี้ + standalone tasks
  const todayTotalCount = todaysEvents.length + todaysStandaloneTasks.length;

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
          <div className="yp-today-hero__greeting">{greeting}</div>
          <div className="yp-today-hero__name">{user.full_name}</div>
          <div className="yp-today-hero__date">{todayLong}</div>
          <div className="yp-today-hero__stats">
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{todayTotalCount}</div>
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
          <h2 className="yp-today-section__title">
            งานวันนี้
          </h2>
          <span className="yp-today-section__count">
            {todayTotalCount} รายการ
          </span>
        </div>
        {todayTotalCount === 0 ? (
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
            {/* ★ v3.9.9: แสดง event ของวันนี้ก่อน (แบบเดิม) */}
            {todaysEvents.map((ev) => (
              <EventCard key={`ev-${ev.id}`} event={ev} />
            ))}
            {/* ★ v3.9.9: แสดง task ย่อยที่ due_date = วันนี้ แต่ parent event
                อยู่ในวันอื่น — ทำให้เห็นทุกงานที่ต้องทำวันนี้จริง ๆ */}
            {todaysStandaloneTasks.map(({ task, event }) => (
              <TodayTaskCard
                key={`task-${task.id}`}
                task={task}
                parentEvent={event}
              />
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
            </h2>
          </div>

          <div className="yp-stat-grid">
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
