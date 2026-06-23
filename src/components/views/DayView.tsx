// Path:    src/components/views/DayView.tsx
// Purpose: Day View — single day, list of tasks (with time + without time).

'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '@/modules/calendar-engine';
import { useTaskEngine } from '@/modules/task-engine';
import { useFilter } from '@/modules/filter-system';
import { useAuth } from '@/context/AuthContext';
import { applyFilters, buildAssigneeMap } from '@/lib/filterUtils';
import { formatFullDate, isToday, formatTime, addDays } from '@/lib/dateUtils';
import { PriorityBadge, StatusBadge, AvatarStack } from '@/components/ui/Badge';

interface DayViewProps {
  onTaskClick: (taskId: string) => void;
  onCreateOnDay: (dateStr: string) => void;
}

export function DayView({ onTaskClick, onCreateOnDay }: DayViewProps) {
  const { cursor, goPrev, goNext, goToday } = useCalendar();
  const { tasks, assignees, members } = useTaskEngine();
  const { filters } = useFilter();
  const { user } = useAuth();

  const filteredTasks = useMemo(() => {
    const assigneeMap = buildAssigneeMap(assignees);
    return applyFilters(tasks, filters, user?.auth_uid ?? null, assigneeMap);
  }, [tasks, filters, assignees, user]);

  const dayTasks = useMemo(() => {
    return filteredTasks.filter(t => t.start_date === cursor);
  }, [filteredTasks, cursor]);

  const withTime = dayTasks.filter(t => t.start_time).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  const withoutTime = dayTasks.filter(t => !t.start_time);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="page-title">{formatFullDate(cursor)}</h2>
          {isToday(cursor) && (
            <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, marginTop: 4 }}>
              • วันนี้
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={goPrev}>◀</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>วันนี้</button>
          <button className="btn btn-ghost btn-sm" onClick={goNext}>▶</button>
        </div>
      </div>

      <button className="btn btn-ghost btn-full" style={{ marginBottom: 16 }} onClick={() => onCreateOnDay(cursor)}>
        ➕ สร้างงานวันนี้
      </button>

      {withTime.length === 0 && withoutTime.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div>ไม่มีงานในวันนี้</div>
        </div>
      )}

      {/* Tasks with time */}
      {withTime.length > 0 && (
        <>
          <div className="sec-label">งานที่มีเวลากำหนด</div>
          <div className="data-list" style={{ marginBottom: 20 }}>
            <div className="data-list-body">
              {withTime.map((t, i) => {
                const taskAssigneeIds = assignees.filter(a => a.task_id === t.id).map(a => a.user_id);
                const taskAssignees = members.filter(m => taskAssigneeIds.includes(m.auth_uid));
                return (
                  <div
                    key={t.id}
                    className="data-item"
                    style={{ '--stagger': i } as React.CSSProperties}
                    onClick={() => onTaskClick(t.id)}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand)', minWidth: 80 }}>
                      {formatTime(t.start_time)}
                      {t.end_time && <div style={{ color: 'var(--text-3)', fontWeight: 600 }}>{formatTime(t.end_time)}</div>}
                    </div>
                    <div className="data-item-body">
                      <div className="data-item-title">{t.title}</div>
                      <div className="data-item-sub">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                    {taskAssignees.length > 0 && <AvatarStack users={taskAssignees} max={2} size="sm" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Tasks without time */}
      {withoutTime.length > 0 && (
        <>
          <div className="sec-label">งานที่ต้องทำวันนี้</div>
          <div className="data-list">
            <div className="data-list-body">
              {withoutTime.map((t, i) => {
                const taskAssigneeIds = assignees.filter(a => a.task_id === t.id).map(a => a.user_id);
                const taskAssignees = members.filter(m => taskAssigneeIds.includes(m.auth_uid));
                return (
                  <div
                    key={t.id}
                    className="data-item"
                    style={{ '--stagger': i } as React.CSSProperties}
                    onClick={() => onTaskClick(t.id)}
                  >
                    <div className="data-item-body">
                      <div className="data-item-title">{t.title}</div>
                      <div className="data-item-sub">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                    {taskAssignees.length > 0 && <AvatarStack users={taskAssignees} max={2} size="sm" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
