// Path:    src/components/TaskModal.tsx
// Purpose: Modal for create/edit task — 2-column layout on desktop.
//          For activity type, includes inline subtask list editor.

'use client';

import React, { useState, useEffect } from 'react';
import { useTaskEngine } from '@/modules/task-engine';
import { useCategory } from '@/modules/category-manager';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  TASK_TYPES, TASK_STATUSES, PRIORITIES, getTaskTypeMeta,
} from '@/lib/constants';
import { todayStr, formatShortDate } from '@/lib/dateUtils';
import type { Task, TaskType, TaskPriority, TaskStatus, Subtask } from '@/lib/types';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  /** If set, edit this task. If null, create new. */
  editingTask?: Task | null;
  /** Pre-fill start date (from calendar click) */
  prefillDate?: string;
}

interface SubtaskDraft {
  id?: string;
  title: string;
  assignee_id: string | null;
  deadline: string | null;
  status: Subtask['status'];
}

export function TaskModal({ open, onClose, editingTask, prefillDate }: TaskModalProps) {
  const { createTask, updateTask, deleteTask, members } = useTaskEngine();
  const { categories } = useCategory();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('checklist');
  const [startDate, setStartDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync form state when modal opens
  useEffect(() => {
    if (!open) return;

    if (editingTask) {
      setTitle(editingTask.title);
      setType(editingTask.type);
      setStartDate(editingTask.start_date);
      setStartTime(editingTask.start_time ?? '');
      setEndTime(editingTask.end_time ?? '');
      setDeadline(editingTask.deadline ?? '');
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setCategoryId(editingTask.category_id ?? '');
      setNotes(editingTask.notes ?? '');
      // We don't load existing assignees/subtasks for simplicity in edit mode
      // (they're managed via the detail panel — modal is for core fields)
    } else {
      setTitle('');
      setType('checklist');
      setStartDate(prefillDate ?? todayStr());
      setStartTime('');
      setEndTime('');
      setDeadline('');
      setPriority('medium');
      setStatus('todo');
      setCategoryId('');
      setNotes('');
      setAssigneeIds([]);
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
  }, [open, editingTask, prefillDate]);

  if (!open) return null;

  function toggleAssignee(uid: string) {
    setAssigneeIds(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  }

  function addSubtask() {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks(prev => [...prev, {
      title: newSubtaskTitle.trim(),
      assignee_id: null,
      deadline: null,
      status: 'todo',
    }]);
    setNewSubtaskTitle('');
  }

  function removeSubtask(idx: number) {
    setSubtasks(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { showToast('กรุณากรอกชื่องาน', 'error'); return; }
    if (!startDate) { showToast('กรุณาเลือกวันเริ่มต้น', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        type,
        start_date: startDate,
        start_time: startTime || null,
        end_time: endTime || null,
        deadline: deadline || null,
        priority,
        status,
        category_id: categoryId || null,
        notes: notes || null,
        assignee_ids: assigneeIds,
        subtasks: type === 'activity' ? subtasks.map((s, i) => ({
          title: s.title,
          assignee_id: s.assignee_id,
          deadline: s.deadline,
        })) : [],
      };

      if (editingTask) {
        await updateTask({ id: editingTask.id, ...payload });
        showToast('อัปเดตงานเรียบร้อย', 'success');
      } else {
        await createTask(payload);
        showToast('สร้างงานเรียบร้อย', 'success');
      }
      onClose();
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingTask) return;
    if (!confirm(`ลบงาน "${editingTask.title}" ?`)) return;
    setSaving(true);
    try {
      await deleteTask(editingTask.id);
      showToast('ลบงานเรียบร้อย', 'success');
      onClose();
    } catch (e: any) {
      showToast(`ลบล้มเหลว: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editingTask ? '✏️ แก้ไขงาน' : '➕ สร้างงานใหม่'}</h2>
          <button className="btn-icon" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-3)' }} onClick={onClose} aria-label="ปิด">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title — full width */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">ชื่องาน *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น จองหอประชุมสำหรับงานรับน้อง"
                required
                autoFocus
              />
            </div>

            {/* 2-column grid */}
            <div className="form-row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">ประเภท</label>
                <select value={type} onChange={e => setType(e.target.value as TaskType)}>
                  {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">หมวดหมู่</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">ไม่มีหมวดหมู่</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">วันเริ่มต้น *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">วันครบกำหนด</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
            </div>

            <div className="form-row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">เวลาเริ่ม</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">เวลาสิ้นสุด</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="form-row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">ความสำคัญ</label>
                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">สถานะ</label>
                <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                  {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Assignees */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">ผู้รับผิดชอบ {assigneeIds.length > 0 && `(${assigneeIds.length})`}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 0' }}>
                {members.map(m => (
                  <button
                    key={m.auth_uid}
                    type="button"
                    className={assigneeIds.includes(m.auth_uid) ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    onClick={() => toggleAssignee(m.auth_uid)}
                  >
                    {m.full_name}
                  </button>
                ))}
                {members.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>ยังไม่มีสมาชิกในระบบ</span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">หมายเหตุ</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม..."
                rows={3}
              />
            </div>

            {/* Subtasks (only for activity) */}
            {type === 'activity' && (
              <div className="form-group">
                <label className="form-label">งานย่อย ({subtasks.length})</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                    placeholder="เพิ่มงานย่อย..."
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addSubtask}>เพิ่ม</button>
                </div>
                {subtasks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {subtasks.map((s, i) => (
                      <div key={i} className="subtask-item">
                        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>•</span>
                        <span className="subtask-title">{s.title}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}
                          onClick={() => removeSubtask(i)}
                          aria-label="ลบงานย่อย"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {editingTask && (
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                🗑️ ลบงาน
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
