'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Detail Client Island
// ═══════════════════════════════════════════════════════════════
// จัดการ interactive parts ของ event detail page:
// - Task toggle (click row → เปิด status picker)
// - Status change (single event) via status-quick buttons
// - Manage sheet (edit/delete)
// - Add task sheet (basic version)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalIcon,
  Clock,
  MapPin,
  Layers,
  Flag,
  Check,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type {
  YPEvent,
  Task,
  TaskStatus,
  EventStatus,
  Department,
} from '@/lib/types';
import {
  formatDate,
  statusLabel,
  priorityLabel,
  isPast,
  eventProgress,
} from '@/lib/utils/date';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

interface EventDetailClientProps {
  event: YPEvent;
  department: Department | null;
}

const STATUS_META: Record<
  TaskStatus | EventStatus,
  { color: string; label: string; desc: string }
> = {
  planning: {
    color: '#A78BFA',
    label: 'วางแผน',
    desc: 'ยังอยู่ในขั้นวางแผน',
  },
  todo: {
    color: '#F59E0B',
    label: 'ยังไม่เริ่ม',
    desc: 'รอเริ่มทำ',
  },
  ongoing: {
    color: '#6366F1',
    label: 'กำลังทำ',
    desc: 'กำลังดำเนินการ',
  },
  done: {
    color: '#10B981',
    label: 'เสร็จแล้ว',
    desc: 'เสร็จสมบูรณ์',
  },
};

export function EventDetailClient({
  event: initialEvent,
  department,
}: EventDetailClientProps) {
  const router = useRouter();
  const supabaseRef = React.useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  };

  const [event, setEvent] = React.useState<YPEvent>(initialEvent);
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [addTaskOpen, setAddTaskOpen] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskPriority, setNewTaskPriority] = React.useState<
    'low' | 'medium' | 'high'
  >('medium');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const accent = event.color || '#4F46E5';
  const isGroup = event.type === 'group';

  // ── Patch task status (local + DB) ──
  const handleTaskStatusChange = async (newStatus: TaskStatus) => {
    if (!activeTaskId) return;
    const taskId = activeTaskId;
    setStatusPickerOpen(false);
    setActiveTaskId(null);

    // Optimistic update
    setEvent((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    }));

    try {
      const supabase = getSupabase();
      const { error: updateErr } = await supabase
        .from('ypwork_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (updateErr) throw updateErr;
    } catch (e: any) {
      // revert on error
      setEvent((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).map((t) =>
          t.id === taskId
            ? { ...t, status: t.status } // keep current state (no change)
            : t
        ),
      }));
      setError(`ไม่สามารถอัพเดตสถานะ: ${e.message || 'unknown error'}`);
    }
  };

  // ── Patch event status (single event) ──
  const handleEventStatusChange = async (newStatus: EventStatus) => {
    // Optimistic update
    setEvent((prev) => ({ ...prev, status: newStatus }));

    try {
      const supabase = getSupabase();
      const { error: updateErr } = await supabase
        .from('ypwork_events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (updateErr) throw updateErr;
    } catch (e: any) {
      // revert
      setEvent((prev) => ({ ...prev, status: event.status }));
      setError(`ไม่สามารถอัพเดตสถานะงาน: ${e.message || 'unknown error'}`);
    }
  };

  // ── Add task (group event) ──
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error: insertErr } = await supabase
        .from('ypwork_tasks')
        .insert({
          event_id: event.id,
          title: newTaskTitle.trim(),
          status: 'todo',
          priority: newTaskPriority,
          sort_order: (event.tasks?.length || 0),
          tags: [],
        })
        .select('id, event_id, title, due_date, status, priority, estimated_time, notes, tags, sort_order, created_at, updated_at')
        .limit(1)
        .maybeSingle();

      if (insertErr) throw insertErr;
      if (data) {
        setEvent((prev) => ({
          ...prev,
          tasks: [...(prev.tasks || []), data as Task],
        }));
        setNewTaskTitle('');
        setNewTaskPriority('medium');
        setAddTaskOpen(false);
      }
    } catch (e: any) {
      setError(`ไม่สามารถเพิ่ม task: ${e.message || 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete event (called from confirm sheet) ──
  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { error: deleteErr } = await supabase
        .from('ypwork_events')
        .delete()
        .eq('id', event.id);

      if (deleteErr) throw deleteErr;
      setConfirmDeleteOpen(false);
      setManageOpen(false);
      router.push('/events');
    } catch (e: any) {
      setError(`ไม่สามารถลบงาน: ${e.message || 'unknown error'}`);
      setSubmitting(false);
    }
  };

  // ── Request delete — เปิด confirm sheet (เหมือน demo confirmDialog) ──
  const requestDelete = () => {
    setManageOpen(false);
    // เปิด confirm sheet หลัง manage sheet ปิด (delay เล็กน้อยให้ animation ไม่ชน)
    setTimeout(() => setConfirmDeleteOpen(true), 200);
  };

  const totalTasks = event.tasks?.length || 0;
  const doneTasks = event.tasks?.filter((t) => t.status === 'done').length || 0;
  const progress = eventProgress(event.tasks || []);

  const activeTask =
    activeTaskId != null
      ? event.tasks?.find((t) => t.id === activeTaskId) || null
      : null;

  return (
    <div
      className="yp-page yp-page-enter"
      style={{ ['--accent' as string]: accent }}
    >
      {error ? (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.08)',
            color: '#BE123C',
            border: '1px solid rgba(244, 63, 94, 0.20)',
            padding: 'var(--yp-space-3) var(--yp-space-4)',
            borderRadius: 'var(--yp-radius-sm)',
            marginBottom: 'var(--yp-space-4)',
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* ── HERO ── */}
      {isGroup ? (
        <div className="yp-detail-hero yp-hero-enter">
          <div className="yp-detail-hero__type">
            <Layers />
            กลุ่มงาน
          </div>
          <h1 className="yp-detail-hero__title">{event.title}</h1>
          <div className="yp-detail-hero__meta">
            <span className="yp-detail-hero__meta-item">
              <CalIcon /> {formatDate(event.date, { long: true })}
            </span>
            {event.time ? (
              <span className="yp-detail-hero__meta-item">
                <Clock /> {event.time}
              </span>
            ) : null}
            {event.location ? (
              <span className="yp-detail-hero__meta-item">
                <MapPin /> {event.location}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="yp-single-hero yp-hero-enter">
          <div className="yp-single-hero__top">
            <div className="yp-single-hero__icon">
              <Flag />
            </div>
            <div className="yp-single-hero__label">งานเดี่ยว</div>
          </div>
          <h1 className="yp-single-hero__title">{event.title}</h1>
          <div className="yp-single-hero__meta">
            <span className="yp-single-hero__meta-item">
              <CalIcon /> {formatDate(event.date, { long: true })}
            </span>
            {event.time ? (
              <span className="yp-single-hero__meta-item">
                <Clock /> {event.time}
              </span>
            ) : null}
            {event.location ? (
              <span className="yp-single-hero__meta-item">
                <MapPin /> {event.location}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* ── STAT GRID (group only) ── */}
      {isGroup ? (
        <div className="yp-stat-grid" style={{ marginBottom: 'var(--yp-space-3)' }}>
          <div className="yp-stat">
            <div className="yp-stat__icon">
              <Layers width={18} height={18} />
            </div>
            <div className="yp-stat__value">{totalTasks}</div>
            <div className="yp-stat__label">จำนวน task</div>
          </div>
          <div className="yp-stat" style={{ ['--accent' as string]: '#10B981' }}>
            <div className="yp-stat__icon">
              <Check width={18} height={18} />
            </div>
            <div className="yp-stat__value">{doneTasks}</div>
            <div className="yp-stat__label">เสร็จแล้ว</div>
          </div>
          <div className="yp-stat">
            <div className="yp-stat__icon">
              <Clock width={18} height={18} />
            </div>
            <div className="yp-stat__value">{progress}%</div>
            <div className="yp-stat__label">ความคืบหน้า</div>
          </div>
          <div
            className="yp-stat"
            style={{ ['--accent' as string]: department?.color || '#4F46E5' }}
          >
            <div className="yp-stat__icon">
              <span style={{ fontSize: 16 }}>
                {department?.icon || '◎'}
              </span>
            </div>
            <div
              className="yp-stat__value"
              style={{
                fontSize: 'var(--yp-text-base)',
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              {department ? department.name.replace('ฝ่าย', '') : '-'}
            </div>
            <div className="yp-stat__label">ฝ่ายรับผิดชอบ</div>
          </div>
        </div>
      ) : null}

      {/* ── DESCRIPTION ── */}
      {event.description ? (
        <section className="yp-detail-section">
          <h2 className="yp-detail-section__title">รายละเอียด</h2>
          <div className="yp-detail-desc">{event.description}</div>
        </section>
      ) : null}

      {/* ── STATUS QUICK (single event) ── */}
      {!isGroup ? (
        <section className="yp-detail-section">
          <h2 className="yp-detail-section__title">สถานะปัจจุบัน</h2>
          <div className="yp-status-quick">
            {(['todo', 'ongoing', 'done'] as EventStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`yp-status-quick__btn${event.status === s ? ` is-active is-${s}` : ''}`}
                onClick={() => handleEventStatusChange(s)}
              >
                <div className={`yp-status-quick__dot is-${s}`} />
                <span>{statusLabel(s)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── DEPARTMENT (single event) ── */}
      {!isGroup && department ? (
        <section className="yp-detail-section">
          <h2 className="yp-detail-section__title">ฝ่ายที่รับผิดชอบ</h2>
          <div
            className="yp-single-dept"
            style={{ ['--dept-color' as string]: department.color }}
          >
            <div className="yp-single-dept__icon">
              {department.icon || '◎'}
            </div>
            <div className="yp-single-dept__body">
              <div className="yp-single-dept__name">{department.name}</div>
              {department.description ? (
                <div className="yp-single-dept__desc">
                  {department.description}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── TASK LIST (group only) ── */}
      {isGroup ? (
        <section className="yp-detail-section">
          <h2 className="yp-detail-section__title">
            Task ย่อย
            <span className="yp-detail-section__count">
              {doneTasks}/{totalTasks}
            </span>
          </h2>

          <div className="yp-card yp-card--tasklist">
            {totalTasks === 0 ? (
              <div className="yp-task-empty">
                <div className="yp-task-empty__icon">
                  <Layers width={20} height={20} />
                </div>
                <div className="yp-task-empty__title">ยังไม่มี task</div>
                <div className="yp-task-empty__desc">
                  กดปุ่มด้านล่างเพื่อเพิ่ม task แรกให้งานนี้
                </div>
              </div>
            ) : (
              (event.tasks || []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`yp-task-row${t.status === 'done' ? ' is-done' : ''}`}
                  onClick={() => {
                    setActiveTaskId(t.id);
                    setStatusPickerOpen(true);
                  }}
                  aria-label={`Task: ${t.title} — สถานะ ${statusLabel(t.status)}`}
                >
                  <div
                    className={`yp-task-status-dot yp-task-status-dot--${t.status}`}
                    aria-hidden="true"
                  />
                  <div className="yp-task-row__body">
                    <div className="yp-task-row__title">{t.title}</div>
                    {(t.due_date || t.priority !== 'medium' || t.estimated_time) ? (
                      <div className="yp-task-row__meta">
                        {t.due_date ? (
                          <span
                            className={`yp-task-row__chip${isPast(t.due_date) && t.status !== 'done' ? ' is-overdue' : ''}`}
                          >
                            <CalIcon width={11} height={11} />
                            {formatDate(t.due_date)}
                          </span>
                        ) : null}
                        {t.priority !== 'medium' ? (
                          <span
                            className={`yp-task-row__chip yp-task-row__chip--priority is-priority-${t.priority}`}
                          >
                            {priorityLabel(t.priority)}
                          </span>
                        ) : null}
                        {t.estimated_time ? (
                          <span className="yp-task-row__chip">
                            <Clock width={11} height={11} />
                            {t.estimated_time}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))
            )}

            <button
              type="button"
              className="yp-add-task-btn"
              onClick={() => setAddTaskOpen(true)}
            >
              <Plus />
              <span>เพิ่ม task</span>
            </button>
          </div>

          <div className="yp-task-list-hint">แตะ task เพื่อเปลี่ยนสถานะ</div>
        </section>
      ) : null}

      {/* ── MANAGE BUTTON ── */}
      <section className="yp-detail-section">
        <button
          type="button"
          className="yp-btn yp-btn--block"
          onClick={() => setManageOpen(true)}
        >
          <Pencil />
          จัดการงาน
        </button>
      </section>

      {/* ── STATUS PICKER SHEET (task) ── */}
      <BottomSheet
        open={statusPickerOpen}
        onClose={() => {
          setStatusPickerOpen(false);
          setActiveTaskId(null);
        }}
        title="สถานะของ task"
        description={activeTask?.title}
      >
        <div className="yp-status-picker">
          {(['todo', 'ongoing', 'done'] as TaskStatus[]).map((s) => {
            const meta = STATUS_META[s];
            const isCurrent = activeTask?.status === s;
            return (
              <button
                key={s}
                type="button"
                className={`yp-status-picker__option${isCurrent ? ' is-current' : ''}`}
                style={{ ['--status-color' as string]: meta.color }}
                onClick={() => handleTaskStatusChange(s)}
              >
                <div className="yp-status-picker__icon">
                  {s === 'done' ? <Check width={16} height={16} /> : meta.label.charAt(0)}
                </div>
                <div className="yp-status-picker__text">
                  <div className="yp-status-picker__label">{meta.label}</div>
                  <div className="yp-status-picker__desc">{meta.desc}</div>
                </div>
                {isCurrent ? (
                  <div className="yp-status-picker__check">
                    <Check width={18} height={18} />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ── ADD TASK SHEET ── */}
      <BottomSheet
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        title="เพิ่ม task ใหม่"
        description={event.title}
        footer={
          <div className="yp-form-actions">
            <button
              type="button"
              className="yp-btn yp-btn--ghost yp-btn--block"
              onClick={() => setAddTaskOpen(false)}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="yp-btn yp-btn--primary yp-btn--block"
              onClick={handleAddTask}
              disabled={submitting || !newTaskTitle.trim()}
            >
              {submitting ? 'กำลังเพิ่ม...' : 'เพิ่ม task'}
            </button>
          </div>
        }
      >
        <div className="field">
          <label className="field__label" htmlFor="new-task-title">
            ชื่อ task <span className="yp-required">*</span>
          </label>
          <input
            id="new-task-title"
            type="text"
            className="yp-input"
            placeholder="เช่น เตรียมสถานที่"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>

        <div className="field">
          <label className="field__label">ลำดับความสำคัญ</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`yp-type-option${newTaskPriority === p ? ' is-selected' : ''}`}
                style={{ padding: 'var(--yp-space-3)' }}
                onClick={() => setNewTaskPriority(p)}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 'var(--yp-radius-pill)',
                    margin: '0 auto 6px',
                    background:
                      p === 'low' ? '#10B981' : p === 'high' ? '#F43F5E' : '#6366F1',
                  }}
                />
                <div className="yp-type-option__title" style={{ textAlign: 'center' }}>
                  {priorityLabel(p)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* ── MANAGE SHEET ── */}
      <BottomSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="จัดการงาน"
        description={event.title}
      >
        <div className="yp-manage-sheet">
          <button
            type="button"
            className="yp-manage-sheet__action"
            onClick={() => {
              // Navigate to edit page (could be separate route)
              setManageOpen(false);
              router.push(`/events/create?edit=${event.id}`);
            }}
          >
            <div className="yp-manage-sheet__icon">
              <Pencil />
            </div>
            <div className="yp-manage-sheet__body">
              <div className="yp-manage-sheet__title">แก้ไขงาน</div>
              <div className="yp-manage-sheet__desc">
                เปลี่ยนชื่อ วันที่ สี หรือฝ่ายที่รับผิดชอบ
              </div>
            </div>
            <ChevronRight />
          </button>

          <button
            type="button"
            className="yp-manage-sheet__action yp-manage-sheet__action--danger"
            onClick={requestDelete}
            disabled={submitting}
          >
            <div className="yp-manage-sheet__icon yp-manage-sheet__icon--danger">
              <Trash2 />
            </div>
            <div className="yp-manage-sheet__body">
              <div className="yp-manage-sheet__title">ลบงาน</div>
              <div className="yp-manage-sheet__desc">
                ลบงานนี้และ task ย่อยทั้งหมด — ไม่สามารถย้อนกลับได้
              </div>
            </div>
            <ChevronRight />
          </button>
        </div>
      </BottomSheet>

      {/* ── CONFIRM DELETE SHEET (เหมือน demo confirmDialog) ── */}
      <BottomSheet
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="ลบงานนี้?"
        description={event.title}
        footer={
          <div className="yp-form-actions">
            <button
              type="button"
              className="yp-btn yp-btn--ghost yp-btn--block"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="yp-btn yp-btn--block"
              style={{
                background: 'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
                color: 'white',
                border: '1px solid #BE123C',
              }}
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'กำลังลบ...' : 'ลบงาน'}
            </button>
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--yp-space-4)',
            alignItems: 'flex-start',
            padding: 'var(--yp-space-2) 0',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--yp-radius-sm)',
              background: 'rgba(244, 63, 94, 0.10)',
              color: '#BE123C',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              border: '1px solid rgba(244, 63, 94, 0.22)',
            }}
          >
            <AlertTriangle width={20} height={20} />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              color: 'var(--yp-text-body)',
              fontSize: 'var(--yp-text-sm)',
              lineHeight: 1.55,
            }}
          >
            ลบ <strong style={{ color: 'var(--yp-text-strong)' }}>“{event.title}”</strong>
            {isGroup && totalTasks > 0
              ? ` และ task ทั้งหมด ${totalTasks} รายการ`
              : ''}
            {' '}— ไม่สามารถย้อนกลับได้
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
