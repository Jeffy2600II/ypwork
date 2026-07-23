// ═══════════════════════════════════════════════════════════════
// YP WORK · EventCard (shared component — ใช้ใน list, day)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 26: เพิ่มรายการย่อย preview ในการ์ดกลุ่มรายการ
//   - แสดง 2-3 รายการย่อยแรกในการ์ด
//   - ถ้ามีเพิ่มเติม → "+X รายการ" badge
//   - เพิ่ม Badge วันนี้/พรุ่งนี้/เลยกำหนด เป็นกิมมิคเล็กๆ
// ★ v3.10.0 รอบที่ 29: อ้างอิงจาก "วันที่เริ่ม" แทน "วันกำหนดส่ง" เพื่อให้ผู้ใช้
//   เห็นว่า "จะเริ่มทำตอนไหน" ก่อน แล้วค่อยเห็น "กำหนดส่งเมื่อไหร่" — ลดความ
//   กดดันจากการเห็นแค่ deadline แต่ไม่เห็นจุดเริ่มต้น ถ้ามี start_date จะแสดง
//   เป็น meta หลัก และแสดง deadline เป็น meta รอง (ถ้าต่างจาก start_date)
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Layers, Flag, Check, Clock, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import type { YPEvent, Task } from '@/lib/types';
import {
  relativeDay,
  formatDate,
  isToday,
  isPast,
  eventProgress,
  resolveEventStatus,
  statusLabel,
  statusChipClass,
} from '@/lib/utils/date';
import { getLocalTodayStr } from '@/lib/utils/date';

export interface EventCardProps {
  event: YPEvent;
  /** optional extra meta parts ที่จะแสดงต่อท้าย (เช่น "ฉัน 2 task") */
  extraMeta?: string[];
}

// ★ v3.10.0 รอบที่ 26: Badge สำหรับแสดงวันนี้/พรุ่งนี้/เลยกำหนด
//   ★ v3.10.0 รอบที่ 29: ถ้ามี start_date → badge อ้างอิงจาก start_date
//     แทน deadline (date) เพื่อสื่อ "จะเริ่มตอนไหน" ไม่ใช่ "เลยกำหนดส่ง"
function DateBadge({ date }: { date: string }) {
  const todayStr = getLocalTodayStr();
  const diffDays = Math.round(
    (new Date(date + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return <span className="yp-event-card__date-badge yp-event-card__date-badge--today">วันนี้</span>;
  }
  if (diffDays === 1) {
    return <span className="yp-event-card__date-badge yp-event-card__date-badge--tomorrow">พรุ่งนี้</span>;
  }
  if (diffDays < 0) {
    return <span className="yp-event-card__date-badge yp-event-card__date-badge--overdue">เลยกำหนด</span>;
  }
  return null;
}

export function EventCard({ event, extraMeta = [] }: EventCardProps) {
  const accent = event.color || '#4F46E5';
  const isGroup = event.type === 'group';
  const totalTasks = event.tasks?.length || 0;
  const doneTasks = event.tasks?.filter((t) => t.status === 'done').length || 0;
  const progress = eventProgress(event.tasks || []);
  const displayStatus = resolveEventStatus(event);

  // ★ v3.10.0 รอบที่ 29: อ้างอิงจาก start_date แทน deadline
  //   ถ้ามี start_date → ใช้เป็น meta หลัก (แสดง "จะเริ่มตอนไหน")
  //   แล้วค่อยแสดง deadline เป็น meta รอง ถ้าต่างจาก start_date
  //   ถ้าไม่มี start_date → ใช้ deadline (date) แบบเดิม (backward compatible)
  const hasStartDate = !!event.start_date;
  const referenceDateForBadge = hasStartDate ? event.start_date! : event.date;

  // ★ v3.10.0 รอบที่ 29: meta หลัก — "เริ่ม" หรือ "กำหนดส่ง" ตามที่มี
  const metaParts: string[] = [];
  if (hasStartDate) {
    metaParts.push(`เริ่ม ${relativeDay(event.start_date!)}`);
    if (event.time) metaParts.push(event.time);
  } else {
    // fallback: ไม่มี start_date → แสดง deadline แบบเดิม
    metaParts.push(relativeDay(event.date));
    if (event.time) metaParts.push(event.time);
  }
  if (event.location) metaParts.push(event.location);
  for (const m of extraMeta) metaParts.push(m);

  // ★ v3.10.0 รอบที่ 26: เลือก 2-3 รายการย่อยแรกสำหรับแสดง preview
  //   เรียงตาม start_time แล้วตาม priority
  const previewTasks = React.useMemo(() => {
    if (!isGroup || totalTasks === 0) return [];
    const tasks = [...(event.tasks || [])];
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
      const sa = a.start_time || '';
      const sb = b.start_time || '';
      if (sa && sb && sa !== sb) return sa.localeCompare(sb);
      if (sa && !sb) return -1;
      if (!sa && sb) return 1;
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title, 'th');
    });
    return tasks.slice(0, 3);
  }, [event.tasks, isGroup, totalTasks]);

  const remainingCount = totalTasks > 3 ? totalTasks - 3 : 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="yp-event-card"
      style={{ ['--accent' as string]: accent }}
      aria-label={`รายการ: ${event.title}`}
    >
      <div className="yp-event-card__head">
        <div
          className="yp-event-card__icon"
          aria-hidden="true"
        >
          {isGroup ? <Layers strokeWidth={2} /> : <Flag strokeWidth={2} />}
        </div>

        <div className="yp-event-card__main">
          <div className="yp-event-card__title">
            {event.title}
            {/* ★ v3.10.0 รอบที่ 26: Date Badge
                ★ v3.10.0 รอบที่ 29: ถ้ามี start_date → badge อ้างอิงจาก start_date */}
            <DateBadge date={referenceDateForBadge} />
          </div>
          <div className="yp-event-card__meta">{metaParts.join(' · ')}</div>
          {/* ★ v3.10.0 รอบที่ 29: ถ้ามี start_date และต่างจาก deadline
              → แสดงบรรทัด meta รอง "กำหนดส่ง ..." เพื่อให้เห็นทั้งจุดเริ่มและจุดสิ้นสุด
              ถ้า start_date เท่ากับ deadline → ไม่ต้องแสดงซ้ำ */}
          {hasStartDate && event.start_date !== event.date ? (
            <div className="yp-event-card__meta yp-event-card__meta--secondary">
              กำหนดส่ง {relativeDay(event.date)}
            </div>
          ) : null}
        </div>

        <span className={`yp-chip ${statusChipClass(displayStatus)}`}>
          <span className="yp-chip-dot" aria-hidden="true" />
          {statusLabel(displayStatus)}
        </span>
      </div>

      {/* ★ v3.10.0 รอบที่ 26: แสดง preview รายการย่อย */}
      {isGroup && previewTasks.length > 0 ? (
        <div className="yp-event-card__subtasks">
          {previewTasks.map((t) => (
            <div key={t.id} className="yp-event-card__subtask">
              <span className={`yp-event-card__subtask-dot yp-event-card__subtask-dot--${t.status}`} />
              <span className="yp-event-card__subtask-title">{t.title}</span>
              {t.start_time ? (
                <span className="yp-event-card__subtask-time">{t.start_time}</span>
              ) : null}
              {t.priority === 'high' ? (
                <span className="yp-event-card__subtask-priority">เร่ง</span>
              ) : null}
            </div>
          ))}
          {remainingCount > 0 ? (
            <div className="yp-event-card__subtask-more">
              +{remainingCount} รายการ
              <ChevronRight width={12} height={12} />
            </div>
          ) : null}
        </div>
      ) : null}

      {isGroup && totalTasks > 0 ? (
        <div className="yp-event-card__progress">
          <div
            className="yp-event-card__progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`ความคืบหน้า ${progress}%`}
          >
            <div
              className="yp-event-card__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="yp-event-card__progress-text">
            {doneTasks}/{totalTasks}
          </span>
        </div>
      ) : null}
    </Link>
  );
}

import * as React from 'react';
