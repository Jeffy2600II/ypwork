'use client';

/**
 * ============================================================
 * YP WORK - Event Card
 * ============================================================
 * Card สำหรับแสดง 1 รายการใน list view และ today dashboard
 * Round 12: Removed overdue badge — no status system.
 * Round 13: Redesigned task-count as an accent-tinted pill badge (was
 *   unstyled raw text since R11) — now matches the date-badge/chip
 *   visual language used elsewhere on this card.
 * ============================================================
 */

import * as React from 'react';
import { ChevronRight, Flag, Layers } from 'lucide-react';
import Link from 'next/link';
import type { YPEvent } from '@/lib/types';
import {
  relativeDay,
  getLocalTodayStr,
} from '@/lib/utils/date';
import { getEffectiveStartDate } from '@/lib/utils/event-date';

export interface EventCardProps {
  event: YPEvent;
  extraMeta?: string[];
  filter?: 'today' | 'upcoming';
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
          <Layers width={11} height={11} strokeWidth={2.25} />
          {totalTasks} รายการย่อย
        </div>
      ) : null}
    </Link>
  );
}
