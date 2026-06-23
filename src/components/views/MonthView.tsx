// Path:    src/components/views/MonthView.tsx
// Purpose: Month View (default) — 7x6 calendar grid with task bars per day.

'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '@/modules/calendar-engine';
import { useTaskEngine } from '@/modules/task-engine';
import { useFilter } from '@/modules/filter-system';
import { useAuth } from '@/context/AuthContext';
import { applyFilters, buildAssigneeMap } from '@/lib/filterUtils';
import {
  formatMonthYear, isToday,
} from '@/lib/dateUtils';
import { THAI_DAYS_SHORT } from '@/lib/constants';
import type { Task } from '@/lib/types';

interface MonthViewProps {
  onTaskClick: (taskId: string) => void;
  onDayClick: (dateStr: string) => void;
  onCreateOnDay: (dateStr: string) => void;
}

const MAX_BARS_PER_CELL = 3;

export function MonthView({ onTaskClick, onDayClick, onCreateOnDay }: MonthViewProps) {
  const { cursor, goPrev, goNext, goToday, monthGrid } = useCalendar();
  const { tasks, assignees } = useTaskEngine();
  const { filters } = useFilter();
  const { user } = useAuth();

  const [year, month] = cursor.split('-').map(Number);

  const filteredTasks = useMemo(() => {
    const assigneeMap = buildAssigneeMap(assignees);
    return applyFilters(tasks, filters, user?.auth_uid ?? null, assigneeMap);
  }, [tasks, filters, assignees, user]);

  // Group tasks by start_date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filteredTasks) {
      if (!map.has(t.start_date)) map.set(t.start_date, []);
      map.get(t.start_date)!.push(t);
    }
    return map;
  }, [filteredTasks]);

  return (
    <div>
      {/* Header: month/year + nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="page-title">{formatMonthYear(year, month)}</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={goPrev} aria-label="เดือนก่อนหน้า">◀</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>วันนี้</button>
          <button className="btn btn-ghost btn-sm" onClick={goNext} aria-label="เดือนถัดไป">▶</button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {THAI_DAYS_SHORT.map(d => (
          <div key={d} className="calendar-header-cell">{d}</div>
        ))}
        {monthGrid.map(dateStr => {
          const [y, m, d] = dateStr.split('-').map(Number);
          const isOutside = m !== month;
          const dayTasks = tasksByDate.get(dateStr) ?? [];
          const shown = dayTasks.slice(0, MAX_BARS_PER_CELL);
          const more = dayTasks.length - shown.length;

          return (
            <div
              key={dateStr}
              className={`calendar-cell ${isOutside ? 'outside-month' : ''} ${isToday(dateStr) ? 'today' : ''}`}
              onClick={() => onDayClick(dateStr)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="calendar-day-num">{d}</span>
                <button
                  className="btn-icon"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: 'var(--text-4)', padding: 0, width: 20, height: 20, borderRadius: 6,
                  }}
                  onClick={e => { e.stopPropagation(); onCreateOnDay(dateStr); }}
                  title="สร้างงานวันนี้"
                >
                  +
                </button>
              </div>
              {shown.map(t => (
                <div
                  key={t.id}
                  className={`calendar-task-bar priority-${t.priority}`}
                  onClick={e => { e.stopPropagation(); onTaskClick(t.id); }}
                  title={t.title}
                >
                  {t.title}
                </div>
              ))}
              {more > 0 && (
                <div className="calendar-more" onClick={e => { e.stopPropagation(); onDayClick(dateStr); }}>
                  +{more} งานเพิ่มเติม
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
