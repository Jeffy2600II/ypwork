'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Events List View
// ═══════════════════════════════════════════════════════════════
// แสดง filter 4 แบบ + group by month (พ.ศ.)
// Round 12: Removed 'overdue' filter — no status system.
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import type { YPEvent, SessionUser } from '@/lib/types';
import { EventCard } from '@/modules/events/event-card';
import {
  THAI_MONTHS,
} from '@/lib/utils/date';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';
import { getEventSortKey, getEventMonthGroupKey } from '@/lib/utils/event-date';

type FilterKey = 'all' | 'group' | 'task' | 'mine';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'group', label: 'กลุ่มรายการ' },
  { key: 'task', label: 'รายการ' },
  { key: 'mine', label: 'ที่ฉันมีส่วนร่วม' },
];

export interface EventsListViewProps {
  events: YPEvent[];
  user: SessionUser;
}

export function EventsListView({ events: initialEvents, user }: EventsListViewProps) {
  const [filter, setFilter] = React.useState<FilterKey>('all');

  const { events } = useRealtimeEvents(initialEvents);

  const filtered = React.useMemo(() => {
    const sorted = [...events].sort((a, b) =>
      getEventSortKey(a).localeCompare(getEventSortKey(b))
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
    return sorted;
  }, [events, filter, user.auth_uid]);

  // Group by month
  const groups = React.useMemo(() => {
    const map = new Map<string, YPEvent[]>();
    for (const ev of filtered) {
      const key = getEventMonthGroupKey(ev);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const formatMonthLabel = (key: string): string => {
    if (key === 'ไม่มีกำหนดการ') return key;
    const [y, m] = key.split('-');
    const yNum = parseInt(y, 10);
    const mNum = parseInt(m, 10);
    if (isNaN(yNum) || isNaN(mNum) || mNum < 1 || mNum > 12) return key;
    return `${THAI_MONTHS[mNum - 1]} ${yNum + 543}`;
  };

  return (
    <div className="yp-page yp-page-enter">
      {/* PAGE HEADER */}
      <div className="yp-page-header">
        <div className="yp-page-header__eyebrow">รายการ</div>
        <h1 className="yp-page-header__title">รายการทั้งหมด</h1>
        <p className="yp-page-header__subtitle">
          {filtered.length} รายการ · เรียงตามวันที่
        </p>
      </div>

      {/* FILTER */}
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

      {/* LIST */}
      {groups.length === 0 ? (
        <div className="yp-empty">
          <div className="yp-empty__icon" aria-hidden="true">
            <span role="img" aria-label="ว่าง">
              📭
            </span>
          </div>
          <div className="yp-empty__title">ยังไม่มีรายการในหมวดนี้</div>
          <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างรายการใหม่</div>
        </div>
      ) : (
        <div key={filter} className="yp-events-list-container">
          {groups.map(([key, items]) => (
            <div key={key} className="yp-events-group">
              <div className="yp-events-group__label">{formatMonthLabel(key)}</div>
              {items.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
