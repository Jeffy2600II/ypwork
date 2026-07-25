'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Events List View (v1.6 — realtime)
// ═══════════════════════════════════════════════════════════════
// แสดง filter 5 แบบ + group by month (พ.ศ.)
// filter state เปลี่ยน → re-render เฉพาะ list (ไม่ re-create page shell)
// v1.6: subscribe Supabase Realtime — list อัพเดตทันทีเมื่อมีการ
// เพิ่ม/แก้ไข/ลบ events หรือ tasks โดยไม่ต้อง refresh
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import type { YPEvent, SessionUser } from '@/lib/types';
import { EventCard } from '@/modules/events/event-card';
import {
  isPast,
  isToday,
  resolveEventStatus,
  THAI_MONTHS,
} from '@/lib/utils/date';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';
// ★ r51: ใช้ shared helpers จาก event-date.ts (single source of truth)
import { getEventSortKey, getEventMonthGroupKey } from '@/lib/utils/event-date';

type FilterKey = 'all' | 'group' | 'task' | 'mine' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'group', label: 'กลุ่มรายการ' },
  { key: 'task', label: 'รายการ' },
  { key: 'mine', label: 'ที่ฉันมีส่วนร่วม' },
  { key: 'overdue', label: 'เลยกำหนด' },
];

export interface EventsListViewProps {
  events: YPEvent[];
  user: SessionUser;
}

export function EventsListView({ events: initialEvents, user }: EventsListViewProps) {
  const [filter, setFilter] = React.useState<FilterKey>('all');

  // v1.6: subscribe realtime
  const { events } = useRealtimeEvents(initialEvents);

  const filtered = React.useMemo(() => {
    // ★ r51: ใช้ getEventSortKey() — group ที่ไม่มี date จะใช้ '9999-99-99'
    //   ทำให้ .localeCompare() ไม่พัง และไปอยู่ท้าย list
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
    if (filter === 'overdue') {
      // ★ r51: ข้าม events ที่ไม่มี date (group type ที่ไม่มี deadline)
      //   เพราะไม่สามารถ overdue ได้
      return sorted.filter(
        (e) => e.date && isPast(e.date) && !isToday(e.date) && resolveEventStatus(e) !== 'done'
      );
    }
    return sorted;
  }, [events, filter, user.auth_uid]);

  // Group by month
  const groups = React.useMemo(() => {
    const map = new Map<string, YPEvent[]>();
    for (const ev of filtered) {
      // ★ r51: ใช้ getEventMonthGroupKey() — group ที่ไม่มี date จะใช้ key "ไม่มีกำหนดการ"
      const key = getEventMonthGroupKey(ev);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // ★ r51: format month label — ถ้า key เป็น "YYYY-MM" → แปลงเป็น "เดือน พ.ศ."
  //   ถ้า key เป็น "ไม่มีกำหนดการ" → ใช้ label ตรง ๆ
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
      {/* ── PAGE HEADER ── */}
      <div className="yp-page-header">
        <div className="yp-page-header__eyebrow">รายการ</div>
        <h1 className="yp-page-header__title">รายการทั้งหมด</h1>
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

      {/* ── LIST ── ★ v3.7.13: key-based remount on filter change for re-animation */}
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
