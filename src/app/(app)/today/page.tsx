// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (server component)
// ═══════════════════════════════════════════════════════════════
// ดึงข้อมูลจาก Supabase: งานวันนี้, งานกำลังจะถึง (7 วัน), งานเลยกำหนด,
// สถิติฝ่ายของ user แสดง hero + sections + dept overview
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { EventCard } from '@/modules/events/event-card';
import {
  getTimeGreeting,
  formatDate,
  getRelativeDate,
  THAI_DAYS,
  THAI_MONTHS,
} from '@/lib/utils/date';
import { AlertCircle, Flag, Check, Clock, Layers } from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import type { YPEvent, Department, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ── คำนวณวันที่ ──
  const now = new Date();
  const greeting = getTimeGreeting();
  const dayName = THAI_DAYS[now.getDay()];
  const dayNum = now.getDate();
  const monthName = THAI_MONTHS[now.getMonth()];
  const yearBE = now.getFullYear() + 543;
  const todayLong = `${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
  const todayStr = getRelativeDate(0);
  const plus7Str = getRelativeDate(7);

  // ── Query events พร้อม department + tasks ──
  // ดึง events ตั้งแต่ 30 วันก่อน ถึง 7 วันข้างหน้า (cover overdue + upcoming)
  const startStr = getRelativeDate(-30);
  const { data: eventsRaw } = await supabase
    .from('ypwork_events')
    .select(
      `
      id,
      type,
      title,
      date,
      end_date,
      time,
      location,
      description,
      department_id,
      status,
      color,
      created_by,
      created_at,
      updated_at,
      department:ypwork_departments (
        id, name, color, icon, description
      ),
      tasks:ypwork_tasks (
        id, event_id, title, due_date, status, priority,
        estimated_time, notes, tags, sort_order, created_at, updated_at
      )
    `
    )
    .gte('date', startStr)
    .lte('date', plus7Str)
    .order('date', { ascending: true });

  // normalize: supabase returns nested arrays for relation; ensure arrays
  const events: YPEvent[] = (eventsRaw || []).map((e: any) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date,
    end_date: e.end_date ?? null,
    time: e.time ?? '',
    location: e.location ?? '',
    description: e.description ?? '',
    department_id: e.department_id ?? null,
    status: e.status,
    color: e.color ?? '#4F46E5',
    created_by: e.created_by ?? null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    department: e.department
      ? Array.isArray(e.department)
        ? (e.department[0] as Department)
        : (e.department as Department)
      : null,
    tasks: Array.isArray(e.tasks) ? (e.tasks as any[]) : [],
  }));

  // ── แยก section ──
  const todays = events.filter((e) => e.date === todayStr);
  const upcoming = events
    .filter((e) => e.date > todayStr)
    .slice(0, 4);
  // overdue = งานที่เลยกำหนด (date < today) และยังไม่ done
  const overdue = events.filter(
    (e) => e.date < todayStr && e.status !== 'done'
  );

  // ── Department overview (ถ้ามี) ──
  let dept: Department | null = null;
  let deptMembers: UserProfile[] = [];
  let deptStats = { total: 0, done: 0, ongoing: 0, overdue: 0 };

  if (user.department_id) {
    const { data: deptRaw } = await supabase
      .from('ypwork_departments')
      .select('id, name, color, icon, description')
      .eq('id', user.department_id)
      .limit(1)
      .maybeSingle();

    if (deptRaw) {
      dept = deptRaw as Department;

      // ดึงสมาชิกในฝ่าย (limited fields)
      const { data: membersRaw } = await supabase
        .from('council_users')
        .select('auth_uid, full_name, color, role, account_type, year, department_id')
        .eq('department_id', user.department_id)
        .eq('approved', true)
        .eq('disabled', false)
        .limit(20);

      deptMembers = (membersRaw || []).map((m: any) => ({
        auth_uid: m.auth_uid,
        full_name: m.full_name,
        student_id: null,
        national_id: null,
        year: m.year ?? null,
        role: m.role ?? 'member',
        account_type: (m.account_type || 'student') as
          | 'student'
          | 'teacher'
          | 'other',
        approved: true,
        disabled: false,
        email: '',
        department_id: m.department_id ?? null,
        color: m.color ?? '#4F46E5',
      }));

      // ดึง events ของฝ่ายเพื่อคำนวณ stat
      const { data: deptEventsRaw } = await supabase
        .from('ypwork_events')
        .select('id, status, date')
        .eq('department_id', user.department_id);

      const deptEvents = deptEventsRaw || [];
      deptStats = {
        total: deptEvents.length,
        done: deptEvents.filter((e: any) => e.status === 'done').length,
        ongoing: deptEvents.filter(
          (e: any) => e.status === 'ongoing' || e.status === 'planning'
        ).length,
        overdue: deptEvents.filter(
          (e: any) => e.date < todayStr && e.status !== 'done'
        ).length,
      };
    }
  }

  return (
    <AppShell user={user} activeNav="today" title="หน้าแรก" showFAB>
      <div className="yp-page yp-page-enter">
        {/* ── HERO ── */}
        <div className="yp-today-hero yp-hero-enter">
          <div className="yp-today-hero__content">
            <div className="yp-today-hero__greeting">{greeting}</div>
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
              <h2 className="yp-today-section__title">งานที่เลยกำหนด</h2>
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
              </h2>
            </div>

            {/* Stat grid 4 ช่อง */}
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

            {/* สมาชิก + คำอธิบาย */}
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
    </AppShell>
  );
}
