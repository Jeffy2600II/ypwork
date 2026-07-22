'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r26 — redesign: smart time-based layout)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 26: ออกแบบหน้า Today ใหม่จากไอเดียวิจัย
//   เป้าหมายหลัก:
//   1. สะดวก — ผู้ใช้เห็นงานที่ต้องทำทันที ไม่ต้องคลิกเข้าไปดู
//   2. เร็ว — คลิกที่การ์ดเปลี่ยนสถานะได้ทันที ไม่ต้องเปิด sheet
//   3. ชาญฉลาด — ระบบจัดกลุ่มรายการย่อยอัตโนมัติตามเวลา
//
//   สิ่งที่เปลี่ยน:
//   - กลุ่มรายการ (type: 'group'): ไม่แสดงเป็นการ์ดของกลุ่มอีกต่อไป
//     แต่แสดงรายการย่อยทั้งหมดตามเวลา — รายการย่อยจากกลุ่มเดียวกัน
//     ถ้าอยู่ติดกันตามเวลาจะรวมในกรอบเดียวกัน (smart grouping)
//   - รายการเดี่ยว (type: 'task'): คลิกเปลี่ยนสถานะทันที
//     มีปุ่มลิงก์เข้าหน้ารายละเอียด
//   - รายการย่อยของกลุ่ม: คลิกเปลี่ยนสถานะทันที
//     มีปุ่มลิงก์เข้าหน้ารายละเอียดของกลุ่ม + เลื่อนไปรายการย่อยนั้น
//   - แยกช่วงเช้า (ก่อน 12:00) / ช่วงบ่าย (12:00+) / ไม่ระบุเวลา
//   - สถานะแสดงแบบ dot icon เล็ก ไม่ใช่ chip เต็ม (compact)
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
import type { YPEvent, Department, UserProfile, SessionUser, Task, TaskStatus, EventStatus } from '@/lib/types';
import { useRealtimeEvents, useRealtimeDepartments, useRealtimeDeptMembers, useRealtimeSessionUser } from '@/lib/hooks/use-realtime';

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number; done: number; ongoing: number; overdue: number };
}

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

export function TodayClient({
  initialEvents,
  user: initialUser,
  dept: initialDept,
  deptMembers: initialDeptMembers,
  deptStats: initialDeptStats,
}: TodayClientProps) {
  const { events } = useRealtimeEvents(initialEvents);
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
  // ★ v3.10.0 รอบที่ 26: สร้าง timeline items จาก events ของวันนี้
  //   แยกเป็น individual items ที่จะแสดงตามเวลา (ไม่ใช่ group cards)
  // ═══════════════════════════════════════════════════════════════
  const timelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    const todaysEvents = events.filter((e) => e.date === todayStr);

    for (const ev of todaysEvents) {
      if (ev.type === 'group') {
        // ★ v3.10.0 รอบที่ 26: กลุ่มรายการ → แสดงรายการย่อยแทนการ์ดกลุ่ม
        //   ถ้าไม่มีรายการย่อย → แสดงเป็นรายการเดี่ยวแทน (กันช่องว่าง)
        const tasks = ev.tasks || [];
        if (tasks.length === 0) {
          // กลุ่มรายการที่ยังไม่มีรายการย่อย → แสดงเป็น placeholder
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
        // รายการเดี่ยว → แสดงเป็นไอเทมเดียว
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

    // ★ เพิ่ม standalone tasks (due_date = วันนี้ แต่ parent event อยู่วันอื่น)
    for (const ev of events) {
      if (ev.date === todayStr) continue;
      for (const t of ev.tasks || []) {
        if (t.due_date === todayStr && t.status !== 'done') {
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
  }, [events, todayStr]);

  // ★ จัดกลุ่ม timeline items ตามช่วงเวลา
  const timeGroups = React.useMemo(() => {
    const morning: TimelineItem[] = [];
    const afternoon: TimelineItem[] = [];
    const unscheduled: TimelineItem[] = [];

    for (const item of timelineItems) {
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
  }, [timelineItems]);

  // ★ Smart grouping: รวม items จากกลุ่มเดียวกันที่อยู่ติดกันเข้าในกรอบเดียว
  //   ถ้ามีรายการอื่นคั่นระหว่าง → แยกกรอบ
  const smartGroupedItems = React.useMemo(() => {
    type SmartGroup = {
      groupId: string; // parentEvent.id หรือ 'single-{ev.id}'
      items: TimelineItem[];
      accent: string;
      parentTitle: string | null;
      parentEvent: YPEvent | null;
      isSingle: boolean; // รายการเดี่ยวไม่มี parent group
    };

    const result: SmartGroup[] = [];
    let currentGroup: SmartGroup | null = null;

    const allItems = [...timeGroups.morning, ...timeGroups.afternoon, ...timeGroups.unscheduled];

    for (const item of allItems) {
      const groupKey = item.parentEvent?.id || (item.event?.id ? `single-${item.event.id}` : `single-${item.id}`);

      if (currentGroup && currentGroup.groupId === groupKey) {
        // ต่อเนื่อง — เพิ่มใน group เดิม
        currentGroup.items.push(item);
      } else {
        // ต่าง group — สร้าง group ใหม่
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
  }, [timeGroups]);

  const overdue = events.filter(
    (e) => e.date < todayStr && resolveEventStatus(e) !== 'done'
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
  // ACTIONS — คลิกเปลี่ยนสถานะทันที
  // ═══════════════════════════════════════════════════════════════
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusCycle = async (item: TimelineItem) => {
    // ★ Cycle status: todo → ongoing → done → todo
    //   รายการเดี่ยว (event): cycle todo/ongoing/done
    //   รายการย่อย (task): cycle todo/ongoing/done
    const currentStatus = item.status;
    const nextStatus: TaskStatus | EventStatus =
      currentStatus === 'todo' ? 'ongoing'
        : currentStatus === 'ongoing' ? 'done'
        : 'todo';

    const itemId = item.task?.id || item.event?.id || '';
    if (!itemId) return;

    setPendingStatus(itemId);

    try {
      if (item.task) {
        // รายการย่อย — ใช้ task status API
        const res = await fetch(`/api/tasks/${item.task.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
      } else if (item.event) {
        // รายการเดี่ยว — ใช้ event status API
        const res = await fetch(`/api/events/${item.event.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
      }
      setToast({ msg: `เปลี่ยนสถานะ "${item.title}" เป็น ${statusLabel(nextStatus)}`, type: 'success' });
    } catch (e: any) {
      setToast({ msg: `ไม่สามารถเปลี่ยนสถานะ: ${e.message || 'unknown'}`, type: 'error' });
    } finally {
      setPendingStatus(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════
  const renderOverdueCards = () => {
    if (overdue.length === 0) return null;
    return (
      <section className="yp-today-section">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">รายการที่เลยกำหนด</h2>
          <span className="yp-today-section__count">{overdue.length} รายการ</span>
        </div>
        <div>
          {overdue.map((ev) => (
            <OverdueCard key={ev.id} event={ev} />
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
    // ★ เลือก smart groups ที่ items อยู่ใน section นี้
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
              onStatusCycle={handleStatusCycle}
              pendingStatusId={pendingStatus}
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
      {renderOverdueCards()}

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
              <OverdueCard key={ev.id} event={ev} />
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
// ═══════════════════════════════════════════════════════════════
function SmartGroupCard({
  group,
  onStatusCycle,
  pendingStatusId,
  todayStr,
}: {
  group: {
    groupId: string;
    items: TimelineItem[];
    accent: string;
    parentTitle: string | null;
    parentEvent: YPEvent | null;
    isSingle: boolean;
  };
  onStatusCycle: (item: TimelineItem) => void;
  pendingStatusId: string | null;
  todayStr: string;
}) {
  const { items, accent, parentTitle, parentEvent, isSingle } = group;
  const firstItem = items[0];

  // ★ ถ้าเป็นรายการเดี่ยว (1 item, no parent group) → แสดงเป็นการ์ดเดียว
  if (isSingle && items.length === 1) {
    return (
      <SingleItemCard
        item={firstItem}
        onStatusCycle={onStatusCycle}
        isPending={pendingStatusId === (firstItem.task?.id || firstItem.event?.id || '')}
        todayStr={todayStr}
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
            onStatusCycle={onStatusCycle}
            isPending={pendingStatusId === (item.task?.id || item.event?.id || '')}
            isInGroup={true}
            todayStr={todayStr}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SingleItemCard — การ์ดรายการเดี่ยว (type: 'task')
//   คลิก = เปลี่ยนสถานะ, ปุ่มลิงก์ = ดูรายละเอียด
// ═══════════════════════════════════════════════════════════════
function SingleItemCard({
  item,
  onStatusCycle,
  isPending,
  todayStr,
}: {
  item: TimelineItem;
  onStatusCycle: (item: TimelineItem) => void;
  isPending: boolean;
  todayStr: string;
}) {
  const accent = item.accent;
  const detailHref = item.event ? `/events/${item.event.id}` : (item.parentEvent ? `/events/${item.parentEvent.id}` : '#');
  const itemId = item.task?.id || item.event?.id || '';

  return (
    <div
      className={`yp-today-item yp-today-item--single${isPending ? ' is-pending' : ''}${item.status === 'done' ? ' is-done' : ''}`}
      style={{ ['--accent' as string]: accent }}
      role="button"
      tabIndex={0}
      onClick={() => onStatusCycle(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStatusCycle(item); } }}
      aria-label={`${item.title} — ${statusLabel(item.status)} — แตะเพื่อเปลี่ยนสถานะ`}
    >
      {/* ── Status dot ── */}
      <button
        type="button"
        className={`yp-today-item__dot yp-today-item__dot--${item.status}`}
        aria-label={`เปลี่ยนสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onStatusCycle(item); }}
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
// ═══════════════════════════════════════════════════════════════
function TimelineItemRow({
  item,
  onStatusCycle,
  isPending,
  isInGroup,
  todayStr,
}: {
  item: TimelineItem;
  onStatusCycle: (item: TimelineItem) => void;
  isPending: boolean;
  isInGroup: boolean;
  todayStr: string;
}) {
  const itemId = item.task?.id || item.event?.id || '';
  const detailHref = item.parentEvent ? `/events/${item.parentEvent.id}` : (item.event ? `/events/${item.event.id}` : '#');

  return (
    <div
      className={`yp-timeline-row${isPending ? ' is-pending' : ''}${item.status === 'done' ? ' is-done' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onStatusCycle(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStatusCycle(item); } }}
      aria-label={`${item.title} — ${statusLabel(item.status)} — แตะเพื่อเปลี่ยนสถานะ`}
    >
      {/* Status dot */}
      <button
        type="button"
        className={`yp-timeline-row__dot yp-timeline-row__dot--${item.status}`}
        aria-label={`เปลี่ยนสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onStatusCycle(item); }}
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
// OverdueCard — การ์ดรายการเลยกำหนด / กำลังจะถึง (แบบเดิม)
// ═══════════════════════════════════════════════════════════════
function OverdueCard({ event }: { event: YPEvent }) {
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
        <span className={`yp-chip ${statusChipClassForOverdue(displayStatus)}`}>
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

function statusChipClassForOverdue(status: EventStatus | TaskStatus): string {
  const classes: Record<string, string> = {
    planning: 'chip--planning',
    todo: 'chip--todo',
    ongoing: 'chip--ongoing',
    done: 'chip--done',
  };
  return classes[status] || 'chip--todo';
}
