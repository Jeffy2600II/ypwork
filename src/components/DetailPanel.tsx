// Path:    src/components/DetailPanel.tsx
// Purpose: Side panel (400px desktop, full-screen mobile) showing task details.
//          Inline status change, subtask tick/add/delete, edit + delete buttons.

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTaskEngine } from '@/modules/task-engine';
import { useCategory } from '@/modules/category-manager';
import { useToast } from '@/context/ToastContext';
import {
  TASK_STATUSES, getStatusMeta, getPriorityMeta, getTaskTypeMeta,
} from '@/lib/constants';
import { formatLongDate, formatTime, daysBetween, todayStr } from '@/lib/dateUtils';
import { StatusBadge, PriorityBadge, TypeBadge, AvatarStack } from '@/components/ui/Badge';
import type { Task, TaskStatus, Subtask } from '@/lib/types';

interface DetailPanelProps {
  taskId: string | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export function DetailPanel({ taskId, onClose, onEdit }: DetailPanelProps) {
  const {
    tasks, subtasks, assignees, members,
    updateStatus, addSubtask, toggleSubtask, deleteSubtask, deleteTask,
  } = useTaskEngine();
  const { getById } = useCategory();
  const { showToast } = useToast();
  const [newSubtask, setNewSubtask] = useState('');

  if (!taskId) return null;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  const category = getById(task.category_id);
  const taskSubs = subtasks.filter(s => s.task_id === taskId).sort((a, b) => a.sort_order - b.sort_order);
  const doneSubs = taskSubs.filter(s => s.status === 'done').length;
  const taskAssigneeIds = assignees.filter(a => a.task_id === taskId).map(a => a.user_id);
  const taskAssignees = members.filter(m => taskAssigneeIds.includes(m.auth_uid));
  const typeMeta = getTaskTypeMeta(task.type);

  async function handleStatusChange(newStatus: TaskStatus) {
    try {
      await updateStatus(task!.id, newStatus);
      showToast(`เปลี่ยนสถานะ → ${getStatusMeta(newStatus).label}`, 'success');
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    }
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    try {
      await addSubtask(task!.id, newSubtask.trim());
      setNewSubtask('');
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    }
  }

  async function handleToggleSub(sub: Subtask) {
    const next: Subtask['status'] = sub.status === 'done' ? 'todo' : 'done';
    try {
      await toggleSubtask(sub.id, next);
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    }
  }

  async function handleDeleteSub(subId: string) {
    try {
      await deleteSubtask(subId);
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    }
  }

  async function handleDeleteTask() {
    if (!confirm(`ลบงาน "${task!.title}" ?`)) return;
    try {
      await deleteTask(task!.id);
      showToast('ลบงานเรียบร้อย', 'success');
      onClose();
    } catch (e: any) {
      showToast(`ลบล้มเหลว: ${e.message}`, 'error');
    }
  }

  const deadlineDiff = task.deadline ? daysBetween(task.deadline, todayStr()) : null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} style={{ background: 'rgba(10,12,28,0.30)', zIndex: 999 }} />
      <aside className="side-panel">
        {/* Header */}
        <div className="side-panel-header">
          <button
            className="btn-icon"
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-3)' }}
            onClick={onClose}
            aria-label="ปิด"
          >
            ←
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>✏️ แก้ไข</button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteTask}>🗑️ ลบ</button>
          </div>
        </div>

        <div className="side-panel-body">
          {/* Title + type badge */}
          <div className="side-panel-section">
            <TypeBadge type={task.type} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
              {task.title}
            </h2>
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {category && (
              <span className="badge badge-gray" style={{ background: `${category.color}22`, color: category.color }}>
                {category.icon} {category.name}
              </span>
            )}
          </div>

          {/* Inline status changer */}
          <div className="side-panel-section">
            <div className="sec-label">เปลี่ยนสถานะ</div>
            <select
              value={task.status}
              onChange={e => handleStatusChange(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Date + time */}
          <div className="side-panel-section">
            <div className="sec-label">วันที่</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
              <div>📅 เริ่ม: <strong>{formatLongDate(task.start_date)}</strong></div>
              {task.start_time && <div>⏰ {formatTime(task.start_time)}{task.end_time && ` - ${formatTime(task.end_time)}`}</div>}
              {task.deadline && (
                <div style={{
                  color: deadlineDiff !== null && deadlineDiff < 0 ? 'var(--red)' :
                         deadlineDiff !== null && deadlineDiff <= 3 ? 'var(--amber)' : 'var(--text-2)',
                  fontWeight: deadlineDiff !== null && deadlineDiff <= 3 ? 700 : 500,
                }}>
                  ⏰ ครบกำหนด: {formatLongDate(task.deadline)}
                  {deadlineDiff !== null && deadlineDiff < 0 && ` (เลย ${Math.abs(deadlineDiff)} วัน)`}
                  {deadlineDiff !== null && deadlineDiff === 0 && ' (วันนี้!)'}
                  {deadlineDiff !== null && deadlineDiff > 0 && deadlineDiff <= 3 && ` (อีก ${deadlineDiff} วัน)`}
                </div>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div className="side-panel-section">
            <div className="sec-label">ผู้รับผิดชอบ</div>
            {taskAssignees.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AvatarStack users={taskAssignees} max={5} size="md" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {taskAssignees.map(u => (
                    <div key={u.auth_uid} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      <div className="avatar avatar-sm" style={{ position: 'relative' }}>
                        {u.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt={u.full_name}
                            fill
                            unoptimized
                            style={{ objectFit: 'cover' }}
                          />
                        ) :
                          u.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      {u.full_name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>ยังไม่มีผู้รับผิดชอบ</div>
            )}
          </div>

          {/* Notes */}
          {task.notes && (
            <div className="side-panel-section">
              <div className="sec-label">หมายเหตุ</div>
              <div style={{
                fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6,
                background: 'var(--surface-2)', padding: 12, borderRadius: 'var(--r-md)',
                whiteSpace: 'pre-wrap',
              }}>
                {task.notes}
              </div>
            </div>
          )}

          {/* Subtasks (only for activity) */}
          {task.type === 'activity' && (
            <div className="side-panel-section">
              <div className="sec-label">
                งานย่อย {taskSubs.length > 0 && `(${doneSubs}/${taskSubs.length} เสร็จ)`}
              </div>

              {taskSubs.length > 0 && (
                <div className="progress" style={{ marginBottom: 8 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${(doneSubs / taskSubs.length) * 100}%` }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taskSubs.map(sub => {
                  const subAssignee = members.find(m => m.auth_uid === sub.assignee_id);
                  return (
                    <div key={sub.id} className={`subtask-item ${sub.status === 'done' ? 'done' : ''}`}>
                      <button
                        className={`subtask-checkbox ${sub.status === 'done' ? 'checked' : ''}`}
                        onClick={() => handleToggleSub(sub)}
                        aria-label="toggle subtask"
                      >
                        {sub.status === 'done' && '✓'}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="subtask-title">{sub.title}</div>
                        {subAssignee && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{subAssignee.full_name}</div>
                        )}
                      </div>
                      <button
                        className="btn-icon"
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}
                        onClick={() => handleDeleteSub(sub.id)}
                        aria-label="ลบงานย่อย"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                  placeholder="เพิ่มงานย่อย..."
                  style={{ fontSize: 13, padding: '9px 12px' }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddSubtask}>เพิ่ม</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
