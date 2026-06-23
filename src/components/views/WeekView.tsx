// Path:    src/components/views/WeekView.tsx
// Purpose: Week View — 7-day timeline showing tasks per day.

'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '@/modules/calendar-engine';
import { useTaskEngine } from '@/modules/task-engine';
import { useFilter } from '@/modules/filter-system';
import { useAuth } from '@/context/AuthContext';
import { applyFilters, buildAssigneeMap } from '@/lib/filterUtils';
import { formatShortDate, isToday, formatTime } from '@/lib/dateUtils';
import { THAI_DAYS_SHORT } from '@/lib/constants';
import { PriorityBadge } from '@/components/ui/Badge';

interface WeekViewProps {
  onTaskClick: (taskId: string) => void;
  onCreateOnDay: (dateStr: string) => void;
}

export function WeekView({ onTaskClick, onCreateOnDay }: WeekViewProps) {
  const { cursor, goPrev, goNext, goToday, weekRange } = useCalendar();
  const { tasks, assignees } = useTaskEngine();
  const { filters } = useFilter();
  const { user } = useAuth();

  const filteredTasks = useMemo(() => {
    const assigneeMap = buildAssigneeMap(assignees);
    return applyFilters(tasks, filters, user?.auth_uid ?? null, assigneeMap);
  }, [tasks, filters, assignees, user]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof filteredTasks>();
    for (const t of filteredTasks) {
      if (!map.has(t.start_date)) map.set(t.start_date, []);
      map.get(t.start_date)!.push(t);
    }
    return map;
  }, [filteredTasks]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="page-title">
          {formatShortDate(weekRange[0])} - {formatShortDate(weekRange[6])}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={goPrev}>◀</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>วันนี้</button>
          <button className="btn btn-ghost btn-sm" onClick={goNext}>▶</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {weekRange.map((dateStr, i) => {
          const dayTasks = tasksByDate.get(dateStr) ?? [];
          const [y, m, d] = dateStr.split('-').map(Number);
          return (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                className={`calendar-cell ${isToday(dateStr) ? 'today' : ''}`}
                style={{ minHeight: 'auto', padding: 10, borderRadius: 16 }}
                onClick={() => onCreateOnDay(dateStr)}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>
                  {THAI_DAYS_SHORT[i]}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{d}</div>
              </div>
              {dayTasks.map(t => (
                <div
                  key={t.id}
                  className="card"
                  style={{ padding: 10, cursor: 'pointer', animation: 'none' }}
                  onClick={() => onTaskClick(t.id)}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
                    {t.title}
                  </div>
                  {t.start_time && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                      {formatTime(t.start_time)}
                    </div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
