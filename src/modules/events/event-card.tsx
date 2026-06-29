// ═══════════════════════════════════════════════════════════════
// YP WORK · EventCard (shared component — ใช้ใน today, list, day)
// ═══════════════════════════════════════════════════════════════
// ใช้ .yp-event-card class (พร้อม --accent CSS var) + sub-parts
// hover/active effect อยู่ใน globals.css แล้ว
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Layers, Flag } from 'lucide-react';
import type { YPEvent } from '@/lib/types';
import {
  relativeDay,
  eventProgress,
  statusLabel,
  statusChipClass,
} from '@/lib/utils/date';

export interface EventCardProps {
  event: YPEvent;
  /** optional extra meta parts ที่จะแสดงต่อท้าย (เช่น "ฉัน 2 task") */
  extraMeta?: string[];
}

export function EventCard({ event, extraMeta = [] }: EventCardProps) {
  const accent = event.color || '#4F46E5';
  const isGroup = event.type === 'group';
  const totalTasks = event.tasks?.length || 0;
  const doneTasks = event.tasks?.filter((t) => t.status === 'done').length || 0;
  const progress = eventProgress(event.tasks || []);

  const metaParts: string[] = [relativeDay(event.date)];
  if (event.time) metaParts.push(event.time);
  if (event.location) metaParts.push(event.location);
  for (const m of extraMeta) metaParts.push(m);

  return (
    <Link
      href={`/events/${event.id}`}
      className="yp-event-card"
      style={{ ['--accent' as string]: accent }}
      aria-label={`งาน: ${event.title}`}
    >
      <div className="yp-event-card__head">
        <div
          className="yp-event-card__icon"
          style={{
            background: `${accent}1f`,
            color: accent,
          }}
          aria-hidden="true"
        >
          {isGroup ? <Layers strokeWidth={2} /> : <Flag strokeWidth={2} />}
        </div>

        <div className="yp-event-card__main">
          <div className="yp-event-card__title">{event.title}</div>
          <div className="yp-event-card__meta">{metaParts.join(' · ')}</div>
        </div>

        <span className={`yp-chip ${statusChipClass(event.status)}`}>
          <span className="yp-chip-dot" aria-hidden="true" />
          {statusLabel(event.status)}
        </span>
      </div>

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
