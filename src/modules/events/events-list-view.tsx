'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Events List View (client component — filter state)
// ═══════════════════════════════════════════════════════════════
// แสดง filter 5 แบบ + group by month (พ.ศ.)
// filter state เปลี่ยน → re-render เฉพาะ list (ไม่ re-create page shell)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import type { YPEvent, SessionUser } from '@/lib/types';
import { EventCard } from '@/modules/events/event-card';
import {
  isPast,
  isToday,
  THAI_MONTHS,
} from '@/lib/utils/date';

type FilterKey = 'all' | 'group' | 'task' | 'mine' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'group', label: 'กลุ่มงาน' },
  { key: 'task', label: 'งานเดี่ยว' },
  { key: 'mine', label: 'ที่ฉันมีส่วนร่วม' },
  { key: 'overdue', label: 'เลยกำหนด' },
];

export interface EventsListViewProps {
  events: YPEvent[];
  user: SessionUser;
}

export function EventsListView({ events, user }: EventsListViewProps) {
  const [filter, setFilter] = React.useState<FilterKey>('all');

  const filtered = React.useMemo(() => {
    const sorted = [...events].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (filter === 'group') return sorted.filter((e) => e.type === 'group');
    if (filter === 'task') return sorted.filter((e) => e.type === 'task');
    if (filter === 'mine') {
      const uid = user.auth_uid;
      return sorted.filter((e) =>
        e.tasks?.some((t) =>
          t.assignees?.some((a) => a.auth_uid === uid)
        )
      );
    }
    if (filter === 'overdue') {
      return sorted.filter(
        (e) => isPast(e.date) && !isToday(e.date) && e.status !== 'done'
      );
    }
    return sorted;
  }, [events, filter, user.auth_uid]);

  // Group by month
  const groups = React.useMemo(() => {
    const map = new Map<string, YPEvent[]>();
    for (const ev of filtered) {
      const d = new Date(ev.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="yp-page yp-page-enter">
      {/* ── PAGE HEADER ── */}
      <div className="yp-page-header" style={{ paddingBottom: '6px' }}>
        <div className="yp-page-header__eyebrow">รายการงาน</div>
        <h1 className="yp-page-header__title">งานทั้งหมด</h1>
        <p className="yp-page-header__subtitle">
          {filtered.length} รายการ · เรียงตามวันที่
        </p>
      </div>

      {/* ── FILTER ── */}
      <div className="yp-events-filter" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`yp-events-filter__btn${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── LIST ── */}
      {groups.length === 0 ? (
        <div className="yp-empty">
          <div className="yp-empty__icon" aria-hidden="true">
            <span role="img" aria-label="ว่าง">
              📭
            </span>
          </div>
          <div className="yp-empty__title">ยังไม่มีงานในหมวดนี้</div>
          <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างงานใหม่</div>
        </div>
      ) : (
        groups.map(([key, items]) => {
          const [y, m] = key.split('-');
          const monthLabel = `${THAI_MONTHS[+m - 1]} ${+y + 543}`;
          return (
            <div key={key} className="yp-events-group">
              <div className="yp-events-group__label">{monthLabel}</div>
              {items.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
