// Path:    src/modules/events/event-card.tsx
// Purpose: การ์ดสรุปรายการ 1 ชิ้น ใช้แสดงในหน้ารายการ (EventsListView) และหน้าอื่น
//          ที่ต้องแสดงรายการ/กลุ่มรายการแบบย่อ
// Used by: EventsListView (src/modules/events/events-list-view.tsx)
// ═══════════════════════════════════════════════════════════════
// YP WORK · EventCard (shared component — ใช้ใน list, day)
// Round 10: Removed all status references (no more status tracking)
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Layers, Flag, ChevronRight } from 'lucide-react';
import type { YPEvent } from '@/lib/types';
import {
  relativeDay,
  getLocalTodayStr,
} from '@/lib/utils/date';
import { getEffectiveStartDate } from '@/lib/utils/event-date';

export interface EventCardProps {
  event: YPEvent;
  extraMeta?: string[];
  filter?: 'overdue' | 'today' | 'upcoming';
}

function DateBadge({ date }: { date: string | null }) {
  if (!date) return null;
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

export function EventCard({ event, extraMeta = [], filter }: EventCardProps) {
  const accent = event.color || '#4F46E5';
  const isGroup = event.type === 'group';
  const totalTasks = event.tasks?.length || 0;

  const effectiveStart = getEffectiveStartDate(event);
  const hasStartDate = !!event.start_date;
  const hasDeadline = !!event.date;
  const referenceDateForBadge = effectiveStart;

  const metaParts: string[] = [];
  if (effectiveStart) {
    if (hasStartDate) {
      metaParts.push(`เริ่ม ${relativeDay(effectiveStart)}`);
    } else {
      metaParts.push(relativeDay(effectiveStart));
    }
    if (event.time) metaParts.push(event.time);
  } else {
    metaParts.push('ไม่มีกำหนดส่ง');
  }
  if (event.location) metaParts.push(event.location);
  for (const m of extraMeta) metaParts.push(m);

  return (
    <Link
      href={filter ? `/events/${event.id}?filter=${filter}` : `/events/${event.id}`}
      className="yp-event-card"
      style={{ ['--accent' as string]: accent }}
      aria-label={`รายการ: ${event.title}`}
    >
      <div className="yp-event-card__head">
        <div className="yp-event-card__icon" aria-hidden="true">
          {isGroup ? <Layers strokeWidth={2} /> : <Flag strokeWidth={2} />}
        </div>

        <div className="yp-event-card__main">
          <div className="yp-event-card__title">
            {event.title}
            <DateBadge date={referenceDateForBadge} />
          </div>
          <div className="yp-event-card__meta">{metaParts.join(' · ')}</div>
          {hasStartDate && hasDeadline && event.start_date !== event.date ? (
            <div className="yp-event-card__meta yp-event-card__meta--secondary">
              กำหนดส่ง {relativeDay(event.date!)}
            </div>
          ) : null}
        </div>

        <ChevronRight
          className="yp-event-card__chevron"
          width={16}
          height={16}
          aria-hidden="true"
        />
      </div>

      {isGroup && totalTasks > 0 ? (
        <div className="yp-event-card__task-count">
          {totalTasks} รายการย่อย
        </div>
      ) : null}
    </Link>
  );
}
