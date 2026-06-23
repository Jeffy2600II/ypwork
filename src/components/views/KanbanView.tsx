// Path:    src/components/views/KanbanView.tsx
// Purpose: Kanban Board — 5 columns by status, drag & drop to change status.

'use client';

import React, { useMemo, useState } from 'react';
import { useTaskEngine } from '@/modules/task-engine';
import { useFilter } from '@/modules/filter-system';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { applyFilters, buildAssigneeMap } from '@/lib/filterUtils';
import {
  KANBAN_COLUMNS, getStatusMeta, getPriorityMeta, getTaskTypeMeta,
} from '@/lib/constants';
import { formatShortDate } from '@/lib/dateUtils';
import { AvatarStack } from '@/components/ui/Badge';
import type { TaskStatus } from '@/lib/types';

interface KanbanViewProps {
  onTaskClick: (taskId: string) => void;
}

export function KanbanView({ onTaskClick }: KanbanViewProps) {
  const { tasks, subtasks, assignees, members, updateStatus } = useTaskEngine();
  const { filters } = useFilter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const filteredTasks = useMemo(() => {
    const assigneeMap = buildAssigneeMap(assignees);
    return applyFilters(tasks, filters, user?.auth_uid ?? null, assigneeMap);
  }, [tasks, filters, assignees, user]);

  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const s of KANBAN_COLUMNS) map.set(s, []);
    for (const t of filteredTasks) {
      const arr = map.get(t.status);
      if (arr) arr.push(t);
    }
    return map;
  }, [filteredTasks]);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  }

  async function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    setDragOverCol(null);
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === status) return;

    try {
      await updateStatus(taskId, status);
      showToast(`ย้าย "${task.title}" → ${getStatusMeta(status).label}`, 'success');
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    }
  }

  return (
    <div className="kanban-board">
      {KANBAN_COLUMNS.map(status => {
        const colTasks = tasksByStatus.get(status) ?? [];
        const meta = getStatusMeta(status);
        return (
          <div
            key={status}
            className={`kanban-column ${dragOverCol === status ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, status)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, status)}
          >
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span className={`priority-dot priority-${status === 'done' ? 'high' : 'medium'}`} style={{
                  background: status === 'todo' ? '#7A7A7A' :
                              status === 'in_progress' ? '#3B82F6' :
                              status === 'pending_review' ? '#E07C12' :
                              status === 'done' ? '#0EA158' : '#E5484D',
                }}></span>
                {meta.label}
              </div>
              <span className="kanban-column-count">{colTasks.length}</span>
            </div>
            <div className="kanban-column-body">
              {colTasks.map(t => {
                const taskSubs = subtasks.filter(s => s.task_id === t.id);
                const doneSubs = taskSubs.filter(s => s.status === 'done').length;
                const taskAssigneeIds = assignees.filter(a => a.task_id === t.id).map(a => a.user_id);
                const taskAssignees = members.filter(m => taskAssigneeIds.includes(m.auth_uid));
                const prio = getPriorityMeta(t.priority);
                const typeMeta = getTaskTypeMeta(t.type);

                return (
                  <div
                    key={t.id}
                    className={`kanban-card ${draggingId === t.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, t.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    onClick={() => onTaskClick(t.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`priority-dot priority-${t.priority}`} style={{ background: prio.color }}></span>
                      <span className="kanban-card-title" style={{ flex: 1 }}>{t.title}</span>
                    </div>
                    <div className="kanban-card-meta">
                      <div className="kanban-card-badges">
                        <span className="badge badge-gray" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                      </div>
                      <AvatarStack users={taskAssignees} max={2} size="sm" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {t.deadline ? `⏰ ${formatShortDate(t.deadline)}` : ''}
                      </span>
                      {t.type === 'activity' && taskSubs.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {doneSubs}/{taskSubs.length} เสร็จ
                        </span>
                      )}
                    </div>
                    {t.type === 'activity' && taskSubs.length > 0 && (
                      <div className="kanban-progress">
                        <div
                          className="kanban-progress-fill"
                          style={{ width: `${(doneSubs / taskSubs.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', padding: '12px 0' }}>
                  ลากการ์ดมาที่นี่
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
