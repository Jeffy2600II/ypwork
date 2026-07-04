'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Detail Client Island (v1.5)
// ═══════════════════════════════════════════════════════════════
// จัดการ interactive parts ของ event detail page:
// - Task toggle (click row → เปิด status picker)
// - Status change (single event) via status-quick buttons
// - Manage sheet (edit event / add task / edit task / delete)
// - Add task sheet (ครบทุก field เหมือน demo: title, priority,
//   assignee, due_date, est_time, tags, notes)
// - Edit task sheet (pre-fill ค่าเดิม)
// - Edit event sheet (bottom sheet — ไม่ navigate)
// - Delete confirmation (bottom sheet — เหมือน demo confirmDialog)
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
  RefreshCw,
} from 'lucide-react';
import type {
  YPEvent,
  Task,
  TaskStatus,
  TaskPriority,
  EventStatus,
  Department,
  UserProfile,
} from '@/lib/types';
import {
  formatDate,
  relativeDay,
  statusLabel,
  priorityLabel,
  isPast,
  eventProgress,
} from '@/lib/utils/date';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { Avatar } from '@/components/framework/avatar';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRealtimeEventById } from '@/lib/hooks/use-realtime';

interface EventDetailClientProps {
  event: YPEvent;
  department: Department | null;
  /** รายชื่อ users สำหรับเลือก assignee (จาก council_users) */
  users?: UserProfile[];
  /** รายชื่อ departments สำหรับเลือกใน edit event */
  departments?: Department[];
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
    desc: 'สมบูรณ์',
  },
};

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; desc: string; dotClass: string }
> = {
  low: { label: 'ไม่เร่ง', desc: 'ทำเมื่อมีเวลาว่าง', dotClass: 'is-low' },
  medium: { label: 'ปกติ', desc: 'ความเร่งด่วนมาตรฐาน', dotClass: 'is-medium' },
  high: { label: 'เร่งด่วน', desc: 'ต้องทำก่อนอื่น', dotClass: 'is-high' },
};

const COLOR_OPTIONS = [
  '#4F46E5',
  '#7C3AED',
  '#A855F7',
  '#14B8A6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#D946EF',
  '#F43F5E',
];

export function EventDetailClient({
  event: initialEvent,
  department,
  users = [],
  departments = [],
}: EventDetailClientProps) {
  const router = useRouter();
  const supabaseRef = React.useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  };

  // v1.6: useRealtimeEventById — subscribe changes แบบ realtime
  // event state อัพเดตอัตโนมัติเมื่อมีใครแก้ไข/เพิ่ม/ลบใน DB
  const {
    event,
    error: realtimeError,
    patchEvent,
    patchTask,
    removeTask,
    addTask,
  } = useRealtimeEventById(initialEvent, initialEvent?.id ?? null);

  const [localError, setLocalError] = React.useState<string | null>(null);
  const error = realtimeError || localError;
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Sheet open states ──
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [addTaskOpen, setAddTaskOpen] = React.useState(false);
  const [editTaskPickerOpen, setEditTaskPickerOpen] = React.useState(false);
  const [editTaskOpen, setEditTaskOpen] = React.useState(false);
  const [editTaskId, setEditTaskId] = React.useState<string | null>(null);
  const [editEventOpen, setEditEventOpen] = React.useState(false);
  const [confirmDeleteTaskOpen, setConfirmDeleteTaskOpen] = React.useState(false);
  const [deleteTaskId, setDeleteTaskId] = React.useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // If event becomes null after delete (via realtime), redirect to /events
  // v1.9.1: ใช้ refs เก็บว่าอยู่ระหว่างการลบ เพื่อกัน double-redirect
  // และเพิ่ม safety timeout — ถ้า realtime ไม่มาภายใน 3 วินาที ก็ force redirect
  //
  // Note: ไม่ต้อง setXXXOpen(false) ที่นี่ เพราะ navigation จะ unmount component
  // และ BottomSheet มี safety cleanup ของตัวเอง (v1.9.1)
  const deletingRef = React.useRef(false);
  React.useEffect(() => {
    if (!event) {
      // event was deleted — go back to list
      if (!deletingRef.current) {
        deletingRef.current = true;
      }
      // Force navigation — ใช้ replace เพื่อกัน back button กลับมาหน้า deleted event
      router.replace('/events');
      // v1.9.1: router.refresh() เพื่อ invalidate cache ของ /events
      // (บางครั้ง Next.js ใช้ cached RSC payload → list ไม่อัพเดต)
      router.refresh();
      // Safety net — ถ้า router.replace ล้มเหลว ให้ force ด้วย window.location
      const fallback = setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/events') {
          window.location.href = '/events';
        }
      }, 1500);
      return () => clearTimeout(fallback);
    }
  }, [event, router]);

  const accent = event?.color || '#4F46E5';
  const isGroup = event?.type === 'group';

  // ── Toast helper (auto-dismiss) ──
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  // ── Patch task status (local + DB) ──
  const handleTaskStatusChange = async (newStatus: TaskStatus) => {
    if (!activeTaskId || !event) return;
    const taskId = activeTaskId;
    const oldStatus = event.tasks?.find((t) => t.id === taskId)?.status;
    setStatusPickerOpen(false);
    setActiveTaskId(null);

    // v1.6: Optimistic update via patchTask from realtime hook
    patchTask(taskId, { status: newStatus });

    try {
      const supabase = getSupabase();
      const { error: updateErr } = await supabase
        .from('ypwork_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (updateErr) throw updateErr;
      setToast({ msg: 'เปลี่ยนสถานะ task แล้ว', type: 'success' });
      // Realtime will sync from server — no need to refetch
    } catch (e: any) {
      // revert on error
      if (oldStatus) patchTask(taskId, { status: oldStatus });
      setLocalError(`ไม่สามารถอัพเดตสถานะ: ${e.message || 'unknown error'}`);
    }
  };

  // ── Patch event status (single event) ──
  const handleEventStatusChange = async (newStatus: EventStatus) => {
    if (!event) return;
    const oldStatus = event.status;
    patchEvent({ status: newStatus });

    try {
      const supabase = getSupabase();
      const { error: updateErr } = await supabase
        .from('ypwork_events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (updateErr) throw updateErr;
    } catch (e: any) {
      patchEvent({ status: oldStatus });
      setLocalError(`ไม่สามารถอัพเดตสถานะงาน: ${e.message || 'unknown error'}`);
    }
  };

  // v1.6: reloadEvent ย้ายไปใช้ useRealtimeEventById (reload ภายใน hook)
  // ไม่ต้องเขียนเองที่นี่ — เรียก reload() จาก hook ถ้าต้องการ force-refresh

  // ── Delete event (called from confirm sheet) ──
  // v1.9.1: ปรับปรุง flow ให้ปิดทุก sheet ก่อน navigation
  // และเพิ่ม safety timeout — ถ้า realtime ไม่มา ก็ force redirect ภายใน 3 วิ
  const handleDelete = async () => {
    if (!event) return;
    const eventId = event.id;
    setSubmitting(true);
    setLocalError(null);
    deletingRef.current = true;

    try {
      const supabase = getSupabase();
      const { error: deleteErr } = await supabase
        .from('ypwork_events')
        .delete()
        .eq('id', eventId);

      if (deleteErr) throw deleteErr;

      // v1.9.1: ปิดทุก sheet ทันทีก่อน navigation
      // (ก่อนหน้านี้ปิดเฉพาะ confirm + manage → บางครั้ง editEvent sheet ค้าง)
      setConfirmDeleteOpen(false);
      setManageOpen(false);
      setEditEventOpen(false);
      setEditTaskOpen(false);
      setEditTaskPickerOpen(false);
      setAddTaskOpen(false);
      setStatusPickerOpen(false);
      setActiveTaskId(null);
      setEditTaskId(null);
      setDeleteTaskId(null);

      // toast สั้น ๆ ก่อน navigation
      setToast({ msg: 'ลบงานแล้ว — กำลังกลับสู่รายการ', type: 'success' });

      // v1.9.1: Force navigation ทันที — ไม่รอ realtime
      // (realtime อาจใช้เวลา 1-2 วินาที → user รู้สึกว่า "ค้าง")
      // ใช้ setTimeout เล็กน้อยเพื่อให้ user เห็น toast ก่อน
      setTimeout(() => {
        try {
          router.replace('/events');
          router.refresh();
        } catch {
          // fallback: ใช้ window.location ถ้า router มีปัญหา
          if (typeof window !== 'undefined') {
            window.location.href = '/events';
          }
        }
      }, 400);

      // v1.9.1: Safety net — ถ้าผ่านไป 3 วินาทีแล้วยังไม่ navigate ให้ force
      // (ป้องกัน router.replace ล้มเหลวโดยเงียบ ๆ)
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/events') {
          window.location.href = '/events';
        }
      }, 3000);
    } catch (e: any) {
      setLocalError(`ไม่สามารถลบงาน: ${e.message || 'unknown error'}`);
      setSubmitting(false);
      deletingRef.current = false;
    }
  };

  // ── Request delete — เปิด confirm sheet ──
  const requestDelete = () => {
    setManageOpen(false);
    setTimeout(() => setConfirmDeleteOpen(true), 200);
  };

  // ── Delete task ──
  // v1.9.1: ปรับปรุง flow ให้ปิดทุก sheet ที่เกี่ยวข้องกับ task ก่อน
  // (ก่อนหน้านี้ปิดเฉพาะ confirmDeleteTask → editTask sheet ค้างได้)
  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    const taskId = deleteTaskId;
    setSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error: delErr } = await supabase
        .from('ypwork_tasks')
        .delete()
        .eq('id', taskId);

      if (delErr) throw delErr;
      // v1.6: optimistic remove — การ์ดจะหายทันที
      // (realtime จะมา confirm ในภายหลัง)
      removeTask(taskId);

      // v1.9.1: ปิดทุก sheet ที่เกี่ยวข้องกับ task
      setConfirmDeleteTaskOpen(false);
      setEditTaskOpen(false);
      setEditTaskPickerOpen(false);
      setDeleteTaskId(null);
      setEditTaskId(null);
      setActiveTaskId(null);

      setToast({ msg: 'ลบ task แล้ว', type: 'success' });
    } catch (e: any) {
      setLocalError(`ไม่สามารถลบ task: ${e.message || ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeleteTask = (taskId: string) => {
    setDeleteTaskId(taskId);
    setConfirmDeleteTaskOpen(true);
  };

  const totalTasks = event?.tasks?.length || 0;
  const doneTasks = event?.tasks?.filter((t) => t.status === 'done').length || 0;
  const progress = eventProgress(event?.tasks || []);

  const activeTask =
    activeTaskId != null
      ? event?.tasks?.find((t) => t.id === activeTaskId) || null
      : null;

  const editTask =
    editTaskId != null
      ? event?.tasks?.find((t) => t.id === editTaskId) || null
      : null;

  // v1.6: ถ้า event ถูกลบ (realtime) จะ render null แล้ว useEffect จะ redirect
  if (!event) return null;

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
                <TaskRow
                  key={t.id}
                  task={t}
                  onStatusClick={() => {
                    setActiveTaskId(t.id);
                    setStatusPickerOpen(true);
                  }}
                  onEdit={() => {
                    setEditTaskId(t.id);
                    setEditTaskOpen(true);
                  }}
                  onDelete={() => requestDeleteTask(t.id)}
                />
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

      {/* ═══════════════════════════════════════════════════════════════
          STATUS PICKER SHEET (task)
          ═══════════════════════════════════════════════════════════════ */}
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
                  {s === 'done' ? <Check width={16} height={16} /> : s === 'ongoing' ? <RefreshCw width={14} height={14} /> : <Clock width={14} height={14} />}
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

      {/* ═══════════════════════════════════════════════════════════════
          ADD TASK SHEET (ครบทุก field เหมือน demo)
          ═══════════════════════════════════════════════════════════════ */}
      <AddTaskSheet
        key={`add-task-${addTaskOpen ? 'open' : 'closed'}`}
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        event={event}
        users={users}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setLocalError(null);
          try {
            const supabase = getSupabase();
            const { data, error: insertErr } = await supabase
              .from('ypwork_tasks')
              .insert({
                event_id: event.id,
                title: payload.title,
                status: 'todo',
                priority: payload.priority,
                due_date: payload.dueDate || null,
                estimated_time: payload.estimatedTime,
                notes: payload.notes,
                tags: payload.tags,
                sort_order: (event.tasks?.length || 0),
              })
              .select('id, event_id, title, due_date, status, priority, estimated_time, notes, tags, sort_order, created_at, updated_at')
              .limit(1)
              .maybeSingle();

            if (insertErr) throw insertErr;
            if (data) {
              // Insert assignee if any
              if (payload.assigneeId) {
                await supabase
                  .from('ypwork_task_assignees')
                  .insert({
                    task_id: data.id,
                    user_auth_uid: payload.assigneeId,
                  });
                // Fetch user
                const { data: uRaw } = await supabase
                  .from('council_users')
                  .select('auth_uid, full_name, color, role, account_type, year, department_id')
                  .eq('auth_uid', payload.assigneeId)
                  .limit(1)
                  .maybeSingle();
                if (uRaw) {
                  (data as any).assignees = [{
                    auth_uid: uRaw.auth_uid,
                    full_name: uRaw.full_name,
                    student_id: null,
                    national_id: null,
                    year: uRaw.year ?? null,
                    role: uRaw.role ?? 'member',
                    account_type: (uRaw.account_type || 'student') as 'student' | 'teacher' | 'other',
                    approved: true,
                    disabled: false,
                    email: '',
                    department_id: uRaw.department_id ?? null,
                    color: uRaw.color ?? '#4F46E5',
                  }];
                }
              } else {
                (data as any).assignees = [];
              }
              // v1.6: optimistic add ทันที — realtime จะ confirm ภายหลัง
              addTask(data as Task);
              setAddTaskOpen(false);
              setToast({ msg: 'เพิ่ม task แล้ว', type: 'success' });
            }
          } catch (e: any) {
            setLocalError(`ไม่สามารถเพิ่ม task: ${e.message || 'unknown error'}`);
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
      />

      {/* ═══════════════════════════════════════════════════════════════
          EDIT TASK SHEET (pre-fill ค่าเดิม)
          ═══════════════════════════════════════════════════════════════ */}
      {editTask ? (
        <EditTaskSheet
          key={`edit-task-${editTask.id}`}
          open={editTaskOpen}
          onClose={() => {
            setEditTaskOpen(false);
            setEditTaskId(null);
          }}
          event={event}
          task={editTask}
          users={users}
          onSubmit={async (payload) => {
            setSubmitting(true);
            setLocalError(null);
            try {
              const supabase = getSupabase();
              const { error: updateErr } = await supabase
                .from('ypwork_tasks')
                .update({
                  title: payload.title,
                  priority: payload.priority,
                  due_date: payload.dueDate || null,
                  estimated_time: payload.estimatedTime,
                  notes: payload.notes,
                  tags: payload.tags,
                })
                .eq('id', editTask.id);

              if (updateErr) throw updateErr;

              // Update assignees — delete old + insert new
              await supabase
                .from('ypwork_task_assignees')
                .delete()
                .eq('task_id', editTask.id);

              if (payload.assigneeId) {
                await supabase
                  .from('ypwork_task_assignees')
                  .insert({
                    task_id: editTask.id,
                    user_auth_uid: payload.assigneeId,
                  });
              }

              // v1.6: optimistic patch — realtime จะ confirm ภายหลัง
              patchTask(editTask.id, {
                title: payload.title,
                priority: payload.priority,
                due_date: payload.dueDate || null,
                estimated_time: payload.estimatedTime,
                notes: payload.notes,
                tags: payload.tags,
              });

              setEditTaskOpen(false);
              setEditTaskId(null);
              setToast({ msg: 'บันทึกการแก้ไขแล้ว', type: 'success' });
            } catch (e: any) {
              setLocalError(`ไม่สามารถแก้ไข task: ${e.message || 'unknown error'}`);
            } finally {
              setSubmitting(false);
            }
          }}
          submitting={submitting}
        />
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT EVENT SHEET (bottom sheet — เหมือน demo)
          ═══════════════════════════════════════════════════════════════ */}
      <EditEventSheet
        key={`edit-event-${editEventOpen ? 'open' : 'closed'}`}
        open={editEventOpen}
        onClose={() => setEditEventOpen(false)}
        event={event}
        departments={departments}
        onSubmit={async (patch) => {
          setSubmitting(true);
          setLocalError(null);
          try {
            const supabase = getSupabase();
            const { error: updateErr } = await supabase
              .from('ypwork_events')
              .update({
                title: patch.title,
                date: patch.date,
                time: patch.time,
                location: patch.location,
                description: patch.description,
                department_id: patch.departmentId || null,
                color: patch.color,
              })
              .eq('id', event.id);

            if (updateErr) throw updateErr;

            // v1.6: optimistic patch — realtime จะ sync ภายหลัง
            patchEvent({
              title: patch.title,
              date: patch.date,
              time: patch.time,
              location: patch.location,
              description: patch.description,
              department_id: patch.departmentId || null,
              color: patch.color,
            });

            setEditEventOpen(false);
            setToast({ msg: 'บันทึกแล้ว', type: 'success' });
          } catch (e: any) {
            setLocalError(`ไม่สามารถแก้ไขงาน: ${e.message || 'unknown error'}`);
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
      />

      {/* ═══════════════════════════════════════════════════════════════
          MANAGE SHEET
          ═══════════════════════════════════════════════════════════════ */}
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
              setManageOpen(false);
              setTimeout(() => setEditEventOpen(true), 280);
            }}
          >
            <div className="yp-manage-sheet__icon">
              <Pencil />
            </div>
            <div className="yp-manage-sheet__body">
              <div className="yp-manage-sheet__title">แก้ไขงาน</div>
              <div className="yp-manage-sheet__desc">
                เปลี่ยนชื่องาน วันที่ เวลา สถานที่ รายละเอียด สี
              </div>
            </div>
            <ChevronRight />
          </button>

          {isGroup ? (
            <>
              <button
                type="button"
                className="yp-manage-sheet__action"
                onClick={() => {
                  setManageOpen(false);
                  setTimeout(() => setAddTaskOpen(true), 280);
                }}
              >
                <div className="yp-manage-sheet__icon">
                  <Plus />
                </div>
                <div className="yp-manage-sheet__body">
                  <div className="yp-manage-sheet__title">เพิ่ม task ย่อย</div>
                  <div className="yp-manage-sheet__desc">
                    สร้าง task ใหม่ในกลุ่มงานนี้
                  </div>
                </div>
                <ChevronRight />
              </button>

              {totalTasks > 0 ? (
                <button
                  type="button"
                  className="yp-manage-sheet__action"
                  onClick={() => {
                    setManageOpen(false);
                    setTimeout(() => setEditTaskPickerOpen(true), 280);
                  }}
                >
                  <div className="yp-manage-sheet__icon">
                    <Pencil />
                  </div>
                  <div className="yp-manage-sheet__body">
                    <div className="yp-manage-sheet__title">แก้ไข task ย่อย</div>
                    <div className="yp-manage-sheet__desc">
                      เลือก task ที่ต้องการแก้ไข ({totalTasks} รายการ)
                    </div>
                  </div>
                  <ChevronRight />
                </button>
              ) : null}
            </>
          ) : null}

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
              <div className="yp-manage-sheet__title" style={{ color: '#BE123C' }}>
                ลบงานนี้
              </div>
              <div className="yp-manage-sheet__desc">
                {isGroup
                  ? `จะลบ task ทั้งหมด ${totalTasks} รายการด้วย`
                  : 'จะลบงานนี้ออกจากระบบ'}{' '}
                — ไม่สามารถย้อนกลับได้
              </div>
            </div>
            <ChevronRight />
          </button>
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════════
          EDIT TASK PICKER — แสดงรายการ task ให้เลือกเพื่อแก้ไข
          ═══════════════════════════════════════════════════════════════ */}
      <BottomSheet
        open={editTaskPickerOpen}
        onClose={() => setEditTaskPickerOpen(false)}
        title="เลือก task ที่จะแก้ไข"
      >
        <div className="yp-manage-task-picker">
          {(event.tasks || []).map((t) => {
            const sLabel =
              t.status === 'done' ? 'เสร็จแล้ว' : t.status === 'ongoing' ? 'กำลังทำ' : 'รอทำ';
            return (
              <button
                key={t.id}
                type="button"
                className="yp-manage-task-picker__item"
                onClick={() => {
                  setEditTaskPickerOpen(false);
                  setTimeout(() => {
                    setEditTaskId(t.id);
                    setEditTaskOpen(true);
                  }, 280);
                }}
              >
                <div
                  className={`yp-task-status-dot yp-task-status-dot--${t.status}`}
                  aria-hidden="true"
                />
                <div className="yp-manage-task-picker__body">
                  <div className="yp-manage-task-picker__title">{t.title}</div>
                  <div className="yp-manage-task-picker__meta">
                    {sLabel}
                    {t.priority === 'high' ? ' · เร่งด่วน' : ''}
                    {t.due_date ? ' · มีกำหนด' : ''}
                  </div>
                </div>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════════
          CONFIRM DELETE TASK SHEET
          ═══════════════════════════════════════════════════════════════ */}
      <BottomSheet
        open={confirmDeleteTaskOpen}
        onClose={() => {
          setConfirmDeleteTaskOpen(false);
          setDeleteTaskId(null);
        }}
        title="ลบ task?"
        footer={
          <div className="yp-form-actions">
            <button
              type="button"
              className="yp-btn yp-btn--ghost yp-btn--block"
              onClick={() => {
                setConfirmDeleteTaskOpen(false);
                setDeleteTaskId(null);
              }}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="yp-btn yp-btn--danger yp-btn--block"
              onClick={handleDeleteTask}
              disabled={submitting}
            >
              {submitting ? 'กำลังลบ...' : 'ลบ'}
            </button>
          </div>
        }
      >
        <div className="yp-confirm-body">
          <div className="yp-confirm-body__icon yp-confirm-body__icon--danger">
            <AlertTriangle width={20} height={20} />
          </div>
          <div className="yp-confirm-body__text">
            คุณแน่ใจหรือไม่ว่าต้องการลบ task{' '}
            <strong>“{event.tasks?.find((t) => t.id === deleteTaskId)?.title || ''}”</strong>
            {' '}— ไม่สามารถย้อนกลับได้
          </div>
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════════
          CONFIRM DELETE EVENT SHEET
          ═══════════════════════════════════════════════════════════════ */}
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
              className="yp-btn yp-btn--danger yp-btn--block"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'กำลังลบ...' : 'ลบงาน'}
            </button>
          </div>
        }
      >
        <div className="yp-confirm-body">
          <div className="yp-confirm-body__icon yp-confirm-body__icon--danger">
            <AlertTriangle width={20} height={20} />
          </div>
          <div className="yp-confirm-body__text">
            ลบ <strong>“{event.title}”</strong>
            {isGroup && totalTasks > 0
              ? ` และ task ทั้งหมด ${totalTasks} รายการ`
              : ''}
            {' '}— ไม่สามารถย้อนกลับได้
          </div>
        </div>
      </BottomSheet>

      {/* ── Toast (auto-dismiss) ── */}
      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background:
              toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : toast.type === 'error'
                ? 'rgba(190, 18, 60, 0.95)'
                : 'rgba(79, 70, 229, 0.95)',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
          }}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TaskRow — render row ของ task ในกลุ่มงาน (เหมือน demo task-row.js)
// ═══════════════════════════════════════════════════════════════
function TaskRow({
  task,
  onStatusClick,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;
  const dueLabel = task.due_date ? relativeDay(task.due_date) : '';
  const overdue = task.due_date && isPast(task.due_date) && task.status !== 'done';
  const priority = task.priority || 'medium';
  const priorityLbl =
    priority === 'high' ? 'เร่งด่วน' : priority === 'low' ? 'ไม่เร่ง' : 'ปกติ';
  const tags = Array.isArray(task.tags) ? task.tags : [];

  return (
    <div
      className={`yp-task-row${task.status === 'done' ? ' is-done' : ''}`}
      data-task-id={task.id}
      role="button"
      tabIndex={0}
      onClick={onStatusClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStatusClick();
        }
      }}
      style={{ cursor: 'pointer' }}
      aria-label={`เปลี่ยนสถานะ task: ${task.title}`}
    >
      <button
        type="button"
        className={`yp-task-status-dot yp-task-status-dot--${task.status}`}
        aria-label={`เปลี่ยนสถานะ — ${statusLabel(task.status)}`}
        onClick={(e) => {
          e.stopPropagation();
          onStatusClick();
        }}
        style={{
          border: '2px solid',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
        }}
      />
      <div className="yp-task-row__body">
        <div className="yp-task-row__title">{task.title}</div>
        <div className="yp-task-row__meta">
          <span
            className={`yp-task-row__chip yp-task-row__status yp-task-row__status--${task.status}`}
          >
            {task.status === 'done' ? (
              <Check width={11} height={11} />
            ) : task.status === 'ongoing' ? (
              <RefreshCw width={11} height={11} />
            ) : (
              <Clock width={11} height={11} />
            )}
            {statusLabel(task.status)}
          </span>

          {priority !== 'medium' ? (
            <span
              className={`yp-task-row__chip yp-task-row__priority is-priority-${priority}`}
            >
              {priorityLbl}
            </span>
          ) : null}

          {assignee ? (
            <span className="yp-task-row__chip yp-task-row__chip--assignee">
              <span className="yp-task-row__avatar">
                <Avatar
                  name={assignee.full_name}
                  color={assignee.color || '#4F46E5'}
                  size={16}
                />
              </span>
              {assignee.full_name.split(' ')[0]}
            </span>
          ) : null}

          {dueLabel ? (
            <span
              className={`yp-task-row__chip yp-task-row__chip--due${overdue ? ' is-overdue' : ''}`}
            >
              {overdue ? <AlertTriangle width={11} height={11} /> : <CalIcon width={11} height={11} />}
              <span className="yp-task-row__chip-label">กำหนด</span>
              {dueLabel}
            </span>
          ) : null}

          {task.estimated_time ? (
            <span className="yp-task-row__chip yp-task-row__chip--est">
              <Clock width={11} height={11} />
              <span className="yp-task-row__chip-label">ใช้เวลา</span>
              {task.estimated_time}
            </span>
          ) : null}

          {tags.map((t) => (
            <span key={t} className="yp-task-row__tag">
              #{t}
            </span>
          ))}
        </div>
        {task.notes ? <div className="yp-task-row__notes">{task.notes}</div> : null}
      </div>
      <div className="yp-task-row__actions">
        <button
          type="button"
          className="yp-task-row__edit"
          aria-label="แก้ไข task"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil />
        </button>
        <button
          type="button"
          className="yp-task-row__delete"
          aria-label="ลบ task"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AddTaskSheet — Bottom sheet สำหรับเพิ่ม task (ครบทุก field)
// ═══════════════════════════════════════════════════════════════
interface TaskPayload {
  title: string;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  estimatedTime: string;
  tags: string[];
  notes: string;
}

function AddTaskSheet({
  open,
  onClose,
  event,
  users,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  event: YPEvent;
  users: UserProfile[];
  onSubmit: (payload: TaskPayload) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = React.useState<string>('');
  const [dueDate, setDueDate] = React.useState<string>(event.date || '');
  const [estimatedTime, setEstimatedTime] = React.useState('');
  const [tagsStr, setTagsStr] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);

  // v1.5: รีเซ็ต form โดยใช้ key-prop remount pattern แทน useEffect
  // (parent component ส่ง key ที่เปลี่ยนเมื่อ open เปลี่ยน → component remount → state กลับสู่ค่าเริ่มต้น)

  const handleSubmit = () => {
    if (!title.trim()) {
      setErr('กรุณากรอกชื่อ task');
      return;
    }
    const tags = tagsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    onSubmit({
      title: title.trim(),
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      estimatedTime: estimatedTime.trim(),
      tags,
      notes: notes.trim(),
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="เพิ่ม task ใหม่"
      footer={
        <div className="yp-form-actions">
          <button
            type="button"
            className="yp-btn yp-btn--ghost yp-btn--block"
            onClick={onClose}
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary yp-btn--block"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'กำลังเพิ่ม...' : (
              <>
                <Plus width={16} height={16} />
                <span style={{ marginLeft: 6 }}>เพิ่ม task</span>
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Parent chip */}
      <div className="yp-form-modal__parent">
        <span className="yp-form-modal__parent-label">ในงาน</span>
        <span
          className="yp-form-modal__parent-chip"
          style={{ ['--accent' as string]: event.color || '#4F46E5' }}
        >
          {event.type === 'group' ? <Layers width={14} height={14} /> : <Flag width={14} height={14} />}
          <span>{event.title}</span>
        </span>
      </div>

      {err ? (
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
          {err}
        </div>
      ) : null}

      {/* Title */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">ชื่อ task</div>
        <div className="field">
          <input
            id="task-title"
            type="text"
            className="yp-input yp-input--lg"
            required
            placeholder="เช่น จองหอประชุมและเวที"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          <div className="field__hint">
            อธิบายสิ่งที่ต้องทำให้ชัดเจน — จะได้ติดตามง่าย
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">ความเร่งด่วน</div>
        <div className="yp-priority-picker">
          {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
            return (
              <button
                key={p}
                type="button"
                className={`yp-priority-option${priority === p ? ' is-selected' : ''}`}
                onClick={() => setPriority(p)}
              >
                <div className={`yp-priority-option__dot ${meta.dotClass}`} />
                <div className="yp-priority-option__title">{meta.label}</div>
                <div className="yp-priority-option__desc">{meta.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee + schedule */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">มอบหมายและกำหนดเวลา</div>
        <div className="field">
          <label className="field__label" htmlFor="task-assignee">
            ผู้รับผิดชอบ
          </label>
          <select
            id="task-assignee"
            className="yp-select"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={submitting}
          >
            <option value="">— ยังไม่ระบุ —</option>
            {users.map((u) => (
              <option key={u.auth_uid} value={u.auth_uid}>
                {u.full_name}
                {u.role ? ` · ${u.role}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="task-due">
            กำหนดส่ง{' '}
            <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)' }}>
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="task-due"
            type="date"
            className="yp-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="task-est">
            เวลาโดยประมาณ{' '}
            <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)' }}>
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="task-est"
            type="text"
            className="yp-input"
            placeholder="เช่น 2 ชม. · 1 วัน · 30 นาที"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมวด/ป้าย{' '}
          <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)', textTransform: 'none', letterSpacing: 0 }}>
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <input
            id="task-tags"
            type="text"
            className="yp-input"
            placeholder="เช่น ด้านเอกสาร, ด้านสถานที่, ด้านการเงิน"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            คั่นด้วยจุลภาค — จะแสดงเป็น{' '}
            <span style={{ color: 'var(--yp-indigo-600)', fontWeight: 'var(--yp-fw-semibold)' }}>#ด้านเอกสาร</span>{' '}
            <span style={{ color: 'var(--yp-indigo-600)', fontWeight: 'var(--yp-fw-semibold)' }}>#ด้านสถานที่</span>{' '}
            เพื่อกรองและจัดกลุ่ม task
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมายเหตุ{' '}
          <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)', textTransform: 'none', letterSpacing: 0 }}>
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <textarea
            id="task-notes"
            className="yp-input yp-textarea"
            placeholder="ขอบเขต · ไฟล์แนบ · ลิงก์อ้างอิง · ฯลฯ"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={4}
          />
        </div>
      </div>
    </BottomSheet>
  );
}

// ═══════════════════════════════════════════════════════════════
// EditTaskSheet — เหมือน AddTaskSheet แต่ pre-fill ค่าเดิม
// ═══════════════════════════════════════════════════════════════
function EditTaskSheet({
  open,
  onClose,
  event,
  task,
  users,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  event: YPEvent;
  task: Task;
  users: UserProfile[];
  onSubmit: (payload: TaskPayload) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = React.useState(task.title);
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = React.useState<string>(
    task.assignees && task.assignees.length > 0 ? task.assignees[0].auth_uid : ''
  );
  const [dueDate, setDueDate] = React.useState<string>(task.due_date || '');
  const [estimatedTime, setEstimatedTime] = React.useState(task.estimated_time || '');
  const [tagsStr, setTagsStr] = React.useState(
    Array.isArray(task.tags) ? task.tags.join(', ') : ''
  );
  const [notes, setNotes] = React.useState(task.notes || '');
  const [err, setErr] = React.useState<string | null>(null);

  // v1.5: รีเซ็ต form โดยใช้ key-prop remount pattern แทน useEffect
  // (parent ส่ง key={`edit-task-${editTask.id}`} → remount เมื่อ task เปลี่ยน → state เริ่มต้นจาก useState)

  const handleSubmit = () => {
    if (!title.trim()) {
      setErr('กรุณากรอกชื่อ task');
      return;
    }
    const tags = tagsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    onSubmit({
      title: title.trim(),
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      estimatedTime: estimatedTime.trim(),
      tags,
      notes: notes.trim(),
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="แก้ไข task"
      footer={
        <div className="yp-form-actions">
          <button
            type="button"
            className="yp-btn yp-btn--ghost yp-btn--block"
            onClick={onClose}
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary yp-btn--block"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'กำลังบันทึก...' : (
              <>
                <Check width={16} height={16} />
                <span style={{ marginLeft: 6 }}>บันทึกการแก้ไข</span>
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Parent chip */}
      <div className="yp-form-modal__parent">
        <span className="yp-form-modal__parent-label">ในงาน</span>
        <span
          className="yp-form-modal__parent-chip"
          style={{ ['--accent' as string]: event.color || '#4F46E5' }}
        >
          {event.type === 'group' ? <Layers width={14} height={14} /> : <Flag width={14} height={14} />}
          <span>{event.title}</span>
        </span>
      </div>

      {err ? (
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
          {err}
        </div>
      ) : null}

      {/* Title */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">ชื่อ task</div>
        <div className="field">
          <input
            id="ed-task-title"
            type="text"
            className="yp-input yp-input--lg"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            อธิบายสิ่งที่ต้องทำให้ชัดเจน — จะได้ติดตามง่าย
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">ความเร่งด่วน</div>
        <div className="yp-priority-picker">
          {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
            return (
              <button
                key={p}
                type="button"
                className={`yp-priority-option${priority === p ? ' is-selected' : ''}`}
                onClick={() => setPriority(p)}
              >
                <div className={`yp-priority-option__dot ${meta.dotClass}`} />
                <div className="yp-priority-option__title">{meta.label}</div>
                <div className="yp-priority-option__desc">{meta.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee + schedule */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">มอบหมายและกำหนดเวลา</div>
        <div className="field">
          <label className="field__label" htmlFor="ed-task-assignee">
            ผู้รับผิดชอบ
          </label>
          <select
            id="ed-task-assignee"
            className="yp-select"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={submitting}
          >
            <option value="">— ยังไม่ระบุ —</option>
            {users.map((u) => (
              <option key={u.auth_uid} value={u.auth_uid}>
                {u.full_name}
                {u.role ? ` · ${u.role}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ed-task-due">
            กำหนดส่ง{' '}
            <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)' }}>
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="ed-task-due"
            type="date"
            className="yp-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ed-task-est">
            เวลาโดยประมาณ{' '}
            <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)' }}>
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="ed-task-est"
            type="text"
            className="yp-input"
            placeholder="เช่น 2 ชม. · 1 วัน · 30 นาที"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมวด/ป้าย{' '}
          <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)', textTransform: 'none', letterSpacing: 0 }}>
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <input
            id="ed-task-tags"
            type="text"
            className="yp-input"
            placeholder="เช่น ด้านเอกสาร, ด้านสถานที่, ด้านการเงิน"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            คั่นด้วยจุลภาค — จะแสดงเป็น{' '}
            <span style={{ color: 'var(--yp-indigo-600)', fontWeight: 'var(--yp-fw-semibold)' }}>#ด้านเอกสาร</span>{' '}
            <span style={{ color: 'var(--yp-indigo-600)', fontWeight: 'var(--yp-fw-semibold)' }}>#ด้านสถานที่</span>{' '}
            เพื่อกรองและจัดกลุ่ม task
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมายเหตุ{' '}
          <span style={{ color: 'var(--yp-text-faint)', fontWeight: 'var(--yp-fw-medium)', textTransform: 'none', letterSpacing: 0 }}>
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <textarea
            id="ed-task-notes"
            className="yp-input yp-textarea"
            placeholder="ขอบเขต · ไฟล์แนบ · ลิงก์อ้างอิง · ฯลฯ"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={4}
          />
        </div>
      </div>
    </BottomSheet>
  );
}

// ═══════════════════════════════════════════════════════════════
// EditEventSheet — Bottom sheet สำหรับแก้ไขงาน (เหมือน demo edit.js)
// ═══════════════════════════════════════════════════════════════
interface EventPatch {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  departmentId: string;
  color: string;
}

function EditEventSheet({
  open,
  onClose,
  event,
  departments,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  event: YPEvent;
  departments: Department[];
  onSubmit: (patch: EventPatch) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = React.useState(event.title);
  const [date, setDate] = React.useState(event.date);
  const [time, setTime] = React.useState(event.time || '');
  const [location, setLocation] = React.useState(event.location || '');
  const [description, setDescription] = React.useState(event.description || '');
  const [departmentId, setDepartmentId] = React.useState(
    event.department_id || departments[0]?.id || ''
  );
  const [color, setColor] = React.useState(event.color || COLOR_OPTIONS[0]);

  // v1.5: รีเซ็ต form โดยใช้ key-prop remount pattern แทน useEffect
  // (parent ส่ง key={`edit-event-${open ? 'open' : 'closed'}`} → remount เมื่อ open เปลี่ยน)

  const handleSubmit = () => {
    onSubmit({
      title: title.trim() || event.title,
      date: date || event.date,
      time,
      location: location.trim(),
      description: description.trim(),
      departmentId,
      color,
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="แก้ไขงาน"
      footer={
        <div className="yp-form-actions">
          <button
            type="button"
            className="yp-btn yp-btn--ghost yp-btn--block"
            onClick={onClose}
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary yp-btn--block"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      }
    >
      <div className="field">
        <label className="field__label" htmlFor="ed-title">ชื่องาน</label>
        <input
          id="ed-title"
          type="text"
          className="yp-input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ed-date">วันที่</label>
        <input
          id="ed-date"
          type="date"
          className="yp-input"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ed-time">เวลา</label>
        <input
          id="ed-time"
          type="time"
          className="yp-input"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ed-location">สถานที่</label>
        <input
          id="ed-location"
          type="text"
          className="yp-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ed-desc">รายละเอียด</label>
        <textarea
          id="ed-desc"
          className="yp-input yp-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={4}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ed-dept">ฝ่ายที่รับผิดชอบ</label>
        <select
          id="ed-dept"
          className="yp-select"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          disabled={submitting}
        >
          <option value="">— ไม่ระบุ —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.icon} {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label">สีประจำงาน</label>
        <div className="yp-color-picker">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`yp-color-option${color === c ? ' is-selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`เลือกสี ${c}`}
              disabled={submitting}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
