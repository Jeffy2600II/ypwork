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
import { useRealtimeEventById } from '@/lib/hooks/use-realtime';
import { InfoButton, InfoSheetHeader, InfoSectionTitle, InfoCallout, InfoSteps, InfoStep, InfoKeyValue, InfoKeyValueRow, InfoPill, InfoHighlight, InfoTldr } from '@/components/ui/info-button';

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

// ★ v3.8.0: Predefined "ใช้เวลาประมาณ" options — เปลี่ยนจาก text input
//   เป็น select เพื่อกัน user พิมพ์ค่าที่ไม่มาตรฐาน
//   value = ค่าที่เก็บใน DB, label = ค่าที่แสดง
//   '' = ไม่ระบุ (ส่ง empty string ไป DB)
const ESTIMATED_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— ไม่ระบุ —' },
  { value: '15 นาที', label: '15 นาที' },
  { value: '30 นาที', label: '30 นาที' },
  { value: '45 นาที', label: '45 นาที' },
  { value: '1 ชม.', label: '1 ชั่วโมง' },
  { value: '2 ชม.', label: '2 ชั่วโมง' },
  { value: '3 ชม.', label: '3 ชั่วโมง' },
  { value: '4 ชม.', label: '4 ชั่วโมง' },
  { value: 'ครึ่งวัน', label: 'ครึ่งวัน (≈ 4 ชม.)' },
  { value: '1 วัน', label: '1 วัน' },
  { value: '2 วัน', label: '2 วัน' },
  { value: '1 สัปดาห์', label: '1 สัปดาห์' },
  { value: 'มากกว่า 1 สัปดาห์', label: 'มากกว่า 1 สัปดาห์' },
];

/**
 * ★ v3.8.0: Normalize estimated time value for select.
 *   - '' หรือ null → '' (เลือก "— ไม่ระบุ —")
 *   - ค่าอื่น → ส่งค่าเดิมไป select (ยังแสดงในกรณีที่ตรง option)
 *
 * ถ้าค่าเดิมใน DB ไม่ตรงกับตัวเลือกใน list →
 *   EditTaskSheet จะ inject option ชั่วคราวให้แสดงค่าเดิม (กันข้อมูลหาย)
 */
function getEstimatedTimeSelectValue(stored: string | null | undefined): string {
  return stored || '';
}

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

  // ★ v3.6.0: Prefetch /events route on mount — ลดเวลา navigation หลัง delete
  //   browser จะ cache HTML/RSC payload ไว้ พอกด delete จะ navigate ได้เร็วขึ้นมาก
  React.useEffect(() => {
    router.prefetch?.('/events');
  }, [router]);

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
      // v3.2.0: ใช้ API route แทน direct Supabase write (bypass RLS)
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');

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
      // v3.2.0: ใช้ API route แทน direct Supabase write (bypass RLS)
      const res = await fetch(`/api/events/${event.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
    } catch (e: any) {
      patchEvent({ status: oldStatus });
      setLocalError(`ไม่สามารถอัพเดตสถานะงาน: ${e.message || 'unknown error'}`);
    }
  };

  // v1.6: reloadEvent ย้ายไปใช้ useRealtimeEventById (reload ภายใน hook)
  // ไม่ต้องเขียนเองที่นี่ — เรียก reload() จาก hook ถ้าต้องการ force-refresh

  // ── Delete event (called from confirm sheet) ──
  // ★ v3.6.0: True instant navigation — แก้ปัญหาที่ v3.5.0 ยังช้า
  //   สาเหตุที่ v3.5.0 ยังช้า: router.replace('/events') เป็น SPA transition
  //   ที่ต้องรอ server render หน้า /events (force-dynamic + 2 DB queries) กว่าจะ paint
  //   รวม ~300-800ms + sheet close animation ~280ms = รวม ~600-1100ms
  //
  //   v3.6.0 fix:
  //   1. ใช้ window.location.replace() แทน router.replace() — hard navigation
  //      browser จัดการเอง เร็วกว่า SPA transition สำหรับหน้าที่เปลี่ยนข้อมูล
  //   2. แสดง loading overlay ทันที (ก่อน navigation) — user เห็น feedback ทันที
  //   3. prefetch /events ตั้งแต่ page mount — browser cache HTML ไว้แล้ว
  //   4. ส่ง delete request ผ่าน sendBeacon — ไม่ block navigation
  const handleDelete = async () => {
    if (!event) return;
    const eventId = event.id;

    // ★ v3.6.0: ปิดทุก sheet ทันที (ไม่รอ animation)
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
    setLocalError(null);
    deletingRef.current = true;

    // ★ v3.6.0: แสดง loading overlay ทันที — user เห็น feedback ภายใน 1 frame
    //   ก่อนหน้านี้ไม่มี visual feedback ระหว่าง navigation
    const overlay = document.createElement('div');
    overlay.id = 'yp-nav-loading';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(245, 244, 251, 0.92);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: yp-fade-in 180ms ease-out both;
    `;
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
        <div style="width:40px;height:40px;border-radius:50%;border:3px solid rgba(99,102,241,0.2);border-top-color:#4F46E5;animation:yp-spin 700ms linear infinite;"></div>
        <div style="font-size:14px;font-weight:600;color:#4F46E5;letter-spacing:0.02em;">กำลังกลับสู่รายการ...</div>
      </div>
      <style>@keyframes yp-spin{to{transform:rotate(360deg)}}@keyframes yp-fade-in{from{opacity:0}to{opacity:1}}</style>
    `;
    document.body.appendChild(overlay);

    // ★ v3.6.0: ส่ง delete request ผ่าน fetch with keepalive — ไม่ block navigation
    //   keepalive: true ทำให้ request ทำงานต่อแม้ page จะ unload แล้ว
    //   เหมือน sendBeacon แต่รองรับ custom method (DELETE)
    try {
      fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    } catch {
      // Silent — navigation จะทำงานอยู่แล้ว
    }

    // ★ v3.6.0: Hard navigation ด้วย window.location.replace
    //   เร็วกว่า router.replace สำหรับหน้าที่เปลี่ยนข้อมูล เพราะ:
    //   - ไม่ต้อง serialize/deserialize RSC payload
    //   - browser จัดการ native navigation (optimized)
    //   - server stream HTML ตรงๆ
    //   ใช้ requestAnimationFrame เพื่อให้ overlay paint ก่อน navigation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.location.replace('/events');
        } catch {
          window.location.href = '/events';
        }
      });
    });
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
      // v3.2.0: ใช้ API route แทน direct Supabase write (bypass RLS)
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
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
      className="yp-page yp-page-enter yp-accented"
      style={{ ['--accent' as string]: accent }}
    >
      {error ? (
        <div className="yp-error-banner">
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
            {/* ★ v3.8.0: ถ้าไม่ได้เลือกเวลา → แสดง "ยังไม่ได้เลือกเวลา" (faint)
                แทนที่จะไม่แสดงอะไรเลย — user จะได้รู้ว่า field นี้มี แค่ยังไม่ได้ตั้ง */}
            {event.time ? (
              <span className="yp-detail-hero__meta-item">
                <Clock /> {event.time}
              </span>
            ) : (
              <span className="yp-detail-hero__meta-item yp-detail-hero__meta-item--muted">
                <Clock /> ยังไม่ได้เลือกเวลา
              </span>
            )}
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
            {/* ★ v3.8.0: ถ้าไม่ได้เลือกเวลา → แสดง "ยังไม่ได้เลือกเวลา" (faint) */}
            {event.time ? (
              <span className="yp-single-hero__meta-item">
                <Clock /> {event.time}
              </span>
            ) : (
              <span className="yp-single-hero__meta-item yp-single-hero__meta-item--muted">
                <Clock /> ยังไม่ได้เลือกเวลา
              </span>
            )}
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
        <div className="yp-stat-grid">
          <div className="yp-stat yp-accented">
            <div className="yp-stat__icon">
              <Layers width={18} height={18} />
            </div>
            <div className="yp-stat__body">
              <div className="yp-stat__value">{totalTasks}</div>
              <div className="yp-stat__label">จำนวน task</div>
            </div>
          </div>
          <div className="yp-stat yp-accented" style={{ ['--accent' as string]: '#10B981' }}>
            <div className="yp-stat__icon">
              <Check width={18} height={18} />
            </div>
            <div className="yp-stat__body">
              <div className="yp-stat__value">{doneTasks}</div>
              <div className="yp-stat__label">เสร็จแล้ว</div>
            </div>
          </div>
          <div className="yp-stat yp-accented">
            <div className="yp-stat__icon">
              <Clock width={18} height={18} />
            </div>
            <div className="yp-stat__body">
              <div className="yp-stat__value">{progress}%</div>
              <div className="yp-stat__label">ความคืบหน้า</div>
            </div>
          </div>
          <div
            className="yp-stat yp-accented"
            style={{ ['--accent' as string]: department?.color || '#4F46E5' }}
          >
            <div className="yp-stat__icon">
              <span className="yp-stat__icon-text">{department?.icon || '◎'}</span>
            </div>
            <div className="yp-stat__body">
              <div className="yp-stat__value yp-stat__value--text">
                {department ? department.name.replace('ฝ่าย', '') : '-'}
              </div>
              <div className="yp-stat__label">ฝ่ายรับผิดชอบ</div>
            </div>
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
          <h2 className="yp-detail-section__title">
            สถานะปัจจุบัน
          </h2>
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
            <InfoButton
              size="sm"
              content={
                <>
                  <InfoSheetHeader
                    icon={<Layers size={20} strokeWidth={2} />}
                    title="Task ย่อย"
                    subtitle="แต่ละขั้นตอนของกลุ่มงาน — ทำเสร็จทีละ task จนครบ"
                  />

                  <InfoTldr>
                    Task ย่อย = <InfoPill>ขั้นตอนย่อย</InfoPill>{' '}
                    ของงานใหญ่ — แตะ task เพื่อเปลี่ยนสถานะ สถานะรวมคำนวณอัตโนมัติ
                  </InfoTldr>

                  <p>
                    กลุ่มงานประกอบด้วย <InfoHighlight>หลาย task ย่อย</InfoHighlight>{' '}
                    ที่แต่ละ task ทำหน้าที่เฉพาะ — เช่น วันแม่อาจมี task: ซื้อของ, ตกแต่งบูธ,
                    ซ้อมร้องเพลง, ดูแลวันจริง แต่ละ task มีสถานะของตัวเอง
                    และสามารถมอบหมายให้คนละฝ่ายทำได้
                  </p>

                  <InfoSectionTitle>วิธีใช้งาน task</InfoSectionTitle>

                  <InfoSteps>
                    <InfoStep title="เพิ่ม task ใหม่">
                      กดปุ่ม <InfoPill>+ เพิ่ม task</InfoPill>{' '}
                      ด้านล่างรายการ กรอกชื่อ + วันที่ + มอบหมายได้
                    </InfoStep>
                    <InfoStep title="เปลี่ยนสถานะ task">
                      แตะที่ task → เลือกสถานะ (วางแผน / กำลังทำ / เสร็จแล้ว)
                      สถานะของกลุ่มงานจะคำนวณใหม่อัตโนมัติ
                    </InfoStep>
                    <InfoStep title="แก้ไข task">
                      กดปุ่มดินสอ → แก้ไขชื่อ, วันที่, assignee ได้
                    </InfoStep>
                    <InfoStep title="ลบ task">
                      กดปุ่มถังขยะ — ระบบจะถามยืนยันก่อนลบ
                    </InfoStep>
                  </InfoSteps>

                  <InfoSectionTitle>สถานะรวมคำนวณยังไง?</InfoSectionTitle>
                  <InfoKeyValue>
                    <InfoKeyValueRow k={<><InfoPill>วางแผน</InfoPill></>} v="ทุก task ยังเป็น &ldquo;วางแผน&rdquo;" />
                    <InfoKeyValueRow k={<><InfoPill>กำลังทำ</InfoPill></>} v="มีอย่างน้อย 1 task เป็น &ldquo;กำลังทำ&rdquo; แต่ยังไม่ครบเสร็จ" />
                    <InfoKeyValueRow k={<><InfoPill>เสร็จแล้ว</InfoPill></>} v="ทุก task เป็น &ldquo;เสร็จแล้ว&rdquo;" />
                  </InfoKeyValue>

                  <InfoCallout type="info" title="เคล็ดลับการแบ่ง task">
                    แบ่ง task ให้<strong>แต่ละ task ทำได้ใน 1-2 ชั่วโมง</strong> —
                    ถ้า task ใหญ่เกินไป แยกเป็น task ย่อยกว่านั้น ทำให้ติดตามความคืบหน้าได้แม่นยำกว่า
                  </InfoCallout>
                </>
              }
            />
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
              <>
                {/* ★ v3.10.0: แยก task ออกเป็นช่วงเช้า / ช่วงบ่าย / ไม่ระบุเวลา
                    เรียงตามเวลาเริ่มทำ (start_time) ภายในแต่ละช่วง
                    ช่วงเช้า = ก่อน 13:00, ช่วงบ่าย = 13:00 ขึ้นไป */}
                {(() => {
                  const tasks = event.tasks || [];
                  // แยกกลุ่มตาม start_time
                  const morning = tasks
                    .filter((t) => t.start_time && t.start_time < '13:00')
                    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
                  const afternoon = tasks
                    .filter((t) => t.start_time && t.start_time >= '13:00')
                    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
                  const noTime = tasks.filter((t) => !t.start_time);

                  const renderTask = (t: Task) => (
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
                  );

                  return (
                    <>
                      {morning.length > 0 ? (
                        <div className="yp-task-group yp-task-group--morning">
                          <div className="yp-task-group__header">
                            <span className="yp-task-group__icon">☀️</span>
                            <span className="yp-task-group__label">ช่วงเช้า</span>
                            <span className="yp-task-group__count">{morning.length} งาน</span>
                          </div>
                          <div className="yp-task-group__items">
                            {morning.map(renderTask)}
                          </div>
                        </div>
                      ) : null}

                      {afternoon.length > 0 ? (
                        <div className="yp-task-group yp-task-group--afternoon">
                          <div className="yp-task-group__header">
                            <span className="yp-task-group__icon">🌤️</span>
                            <span className="yp-task-group__label">ช่วงบ่าย</span>
                            <span className="yp-task-group__count">{afternoon.length} งาน</span>
                          </div>
                          <div className="yp-task-group__items">
                            {afternoon.map(renderTask)}
                          </div>
                        </div>
                      ) : null}

                      {noTime.length > 0 ? (
                        <div className="yp-task-group yp-task-group--notime">
                          <div className="yp-task-group__header">
                            <span className="yp-task-group__icon">🕒</span>
                            <span className="yp-task-group__label">ไม่ระบุเวลา</span>
                            <span className="yp-task-group__count">{noTime.length} งาน</span>
                          </div>
                          <div className="yp-task-group__items">
                            {noTime.map(renderTask)}
                          </div>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </>
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
            // v3.2.0: ใช้ API route แทน direct Supabase insert (bypass RLS)
            const res = await fetch(`/api/events/${event.id}/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: payload.title,
                priority: payload.priority,
                due_date: payload.dueDate || null,
                start_time: payload.startTime || null,   // ★ v3.10.0
                estimated_time: payload.estimatedTime,
                notes: payload.notes,
                tags: payload.tags,
                assignee_id: payload.assigneeId || null,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
            if (data.task) {
              // v1.6: optimistic add ทันที — realtime จะ confirm ภายหลัง
              addTask(data.task as Task);
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
              // v3.2.0: ใช้ API route แทน direct Supabase write (bypass RLS)
              const [taskRes, assigneeRes] = await Promise.all([
                fetch(`/api/tasks/${editTask.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: payload.title,
                    priority: payload.priority,
                    due_date: payload.dueDate || null,
                    start_time: payload.startTime || null,   // ★ v3.10.0
                    estimated_time: payload.estimatedTime,
                    notes: payload.notes,
                    tags: payload.tags,
                  }),
                }),
                fetch(`/api/tasks/${editTask.id}/assignee`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assignee_id: payload.assigneeId || null }),
                }),
              ]);

              const taskData = await taskRes.json();
              if (!taskRes.ok || !taskData.success) throw new Error(taskData.error || 'unknown error');
              const assigneeData = await assigneeRes.json();
              if (!assigneeRes.ok || !assigneeData.success) throw new Error(assigneeData.error || 'unknown error');

              // v1.6: optimistic patch — realtime จะ confirm ภายหลัง
              patchTask(editTask.id, {
                title: payload.title,
                priority: payload.priority,
                due_date: payload.dueDate || null,
                start_time: payload.startTime || null,   // ★ v3.10.0
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
            // v3.2.0: ใช้ API route แทน direct Supabase write (bypass RLS)
            const res = await fetch(`/api/events/${event.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: patch.title,
                date: patch.date,
                time: patch.time,
                location: patch.location,
                description: patch.description,
                department_id: patch.departmentId || null,
                color: patch.color,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');

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
              <div className="yp-manage-sheet__title yp-text-danger">
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
                    {t.due_date ? ' · มีเวลาเริ่ม' : ''}
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
        <div className={`yp-toast yp-toast--${toast.type || 'info'}`}>
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
  // ★ v3.10.0: ใช้ "เวลาเริ่มทำ" (start_time) แทน "กำหนดส่ง"
  const startTimeLabel = task.start_time || '';
  const overdue = task.due_date && isPast(task.due_date) && task.status !== 'done';
  const priority = task.priority || 'medium';
  const priorityLbl =
    priority === 'high' ? 'เร่งด่วน' : priority === 'low' ? 'ไม่เร่ง' : 'ปกติ';
  const tags = Array.isArray(task.tags) ? task.tags : [];

  // ★ v3.10.0u2: สร้าง meta line แบบ EventCard — รวมข้อมูลสำคัญเป็นบรรทัดเดียว
  //   "เริ่ม 14:30 · วันนี้ · ใช้เวลา 2 ชม · โดย นาย A"
  const metaParts: string[] = [];
  if (startTimeLabel) {
    metaParts.push(`เริ่ม ${startTimeLabel}`);
  } else if (dueLabel) {
    metaParts.push(`เริ่ม ${dueLabel}`);
  }
  if (task.estimated_time) {
    metaParts.push(`ใช้เวลา ${task.estimated_time}`);
  }
  if (assignee) {
    metaParts.push(`โดย ${assignee.full_name.split(' ')[0]}`);
  }

  return (
    <div
      className={`yp-task-row yp-task-row--v2 yp-cursor-pointer${task.status === 'done' ? ' is-done' : ''}`}
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
      aria-label={`เปลี่ยนสถานะ task: ${task.title}`}
    >
      {/* ★ v3.10.0u2: Head row — เหมือน EventCard head
          icon (status dot) + title/meta + status chip + actions */}
      <div className="yp-task-row__head">
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
        <div className="yp-task-row__main">
          <div className="yp-task-row__title">{task.title}</div>
          {metaParts.length > 0 ? (
            <div className="yp-task-row__meta-line">{metaParts.join(' · ')}</div>
          ) : null}
        </div>
        <span
          className={`yp-chip ${statusChipClass(task.status)}`}
        >
          <span className="yp-chip-dot" aria-hidden="true" />
          {statusLabel(task.status)}
        </span>
        {/* ★ v3.10.0u2: Actions ฝั่งขวา — เหมือน EventCard ไม่มี actions
            แต่ task ต้องมี edit/delete เลยใส่เป็นปุ่มเล็ก ๆ */}
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
            <Pencil width={14} height={14} />
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
            <Trash2 width={14} height={14} />
          </button>
        </div>
      </div>

      {/* ★ v3.10.0u2: Footer row — priority + tags (เหมือน progress row ของ EventCard) */}
      {(priority !== 'medium' || tags.length > 0 || task.notes) ? (
        <div className="yp-task-row__footer">
          {priority !== 'medium' ? (
            <span
              className={`yp-task-row__chip yp-task-row__priority is-priority-${priority}`}
            >
              {priorityLbl}
            </span>
          ) : null}
          {tags.map((t) => (
            <span key={t} className="yp-task-row__tag">
              #{t}
            </span>
          ))}
          {overdue ? (
            <span className="yp-task-row__chip yp-task-row__chip--overdue">
              <AlertTriangle width={11} height={11} />
              เลยเวลาเริ่ม
            </span>
          ) : null}
        </div>
      ) : null}

      {task.notes ? <div className="yp-task-row__notes">{task.notes}</div> : null}
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
  startTime: string | null;   // ★ v3.10.0: เวลาเริ่มทำ (HH:MM)
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
  const [startTime, setStartTime] = React.useState<string>('');   // ★ v3.10.0
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
      startTime: startTime || null,   // ★ v3.10.0
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
                <span className="yp-btn__text-with-icon">เพิ่ม task</span>
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
        <div className="yp-form-modal__section-title">มอบหมายและเวลา</div>
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
            วันที่เริ่มทำ{' '}
            <span className="yp-text-faint-medium">
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
        {/* ★ v3.10.0: เวลาเริ่มทำ (HH:MM) — ใช้สำหรับแยกช่วงเช้า/บ่าย */}
        <div className="field">
          <label className="field__label" htmlFor="task-start-time">
            เริ่มกี่โมง{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ — ใช้แยกช่วงเช้า/บ่าย)
            </span>
          </label>
          <input
            id="task-start-time"
            type="time"
            className="yp-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            ช่วงเช้า = ก่อน 13:00 · ช่วงบ่าย = 13:00 ขึ้นไป —
            ระบบจะจัดกลุ่ม task ตามเวลานี้ในหน้างาน
          </div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="task-est">
            ใช้เวลาประมาณ{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ)
            </span>
          </label>
          {/* ★ v3.8.0: เปลี่ยนจาก text input → select picker
              กัน user พิมพ์ค่าที่ไม่มาตรฐาน เช่น "20 นาทีๆ" หรือ "2 ชม 30 นา" */}
          <select
            id="task-est"
            className="yp-select"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            disabled={submitting}
          >
            {ESTIMATED_TIME_OPTIONS.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="field__hint">
            เลือกช่วงเวลาที่ใกล้ที่สุด — จะแสดงในรายการ task เพื่อประเมินเวลารวม
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมวด/ป้าย{' '}
          <span className="yp-text-faint-normal">
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
            <span className="yp-text-tag">#ด้านเอกสาร</span>{' '}
            <span className="yp-text-tag">#ด้านสถานที่</span>{' '}
            เพื่อกรองและจัดกลุ่ม task
          </div>
        </div>
      </div>

      {/* ★ v3.8.0: เปลี่ยน "หมายเหตุ" → "รายละเอียด" + placeholder ที่เป็นจริง */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          รายละเอียด{' '}
          <span className="yp-text-faint-normal">
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <textarea
            id="task-notes"
            className="yp-textarea"
            placeholder="อธิบายขอบเขตของ task นี้ สิ่งที่ต้องทำ หรือหมายเหตุเพิ่มเติม เช่น ต้องประสานงานกับฝ่ายเอกสารก่อนเริ่มงาน"
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
  const [startTime, setStartTime] = React.useState<string>(task.start_time || '');   // ★ v3.10.0
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
      startTime: startTime || null,   // ★ v3.10.0
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
                <span className="yp-text-with-icon-left">บันทึกการแก้ไข</span>
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
          {/* ★ v3.8.0: เพิ่ม placeholder ที่หายไป (ก่อนหน้านี้ไม่มี placeholder เลย) */}
          <input
            id="ed-task-title"
            type="text"
            className="yp-input yp-input--lg"
            required
            placeholder="เช่น จองหอประชุมและเวที"
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
        <div className="yp-form-modal__section-title">มอบหมายและเวลา</div>
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
            วันที่เริ่มทำ{' '}
            <span className="yp-text-faint-medium">
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
        {/* ★ v3.10.0: เวลาเริ่มทำ (HH:MM) — EditTaskSheet */}
        <div className="field">
          <label className="field__label" htmlFor="ed-task-start-time">
            เริ่มกี่โมง{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ — ใช้แยกช่วงเช้า/บ่าย)
            </span>
          </label>
          <input
            id="ed-task-start-time"
            type="time"
            className="yp-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            ช่วงเช้า = ก่อน 13:00 · ช่วงบ่าย = 13:00 ขึ้นไป —
            ระบบจะจัดกลุ่ม task ตามเวลานี้ในหน้างาน
          </div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ed-task-est">
            ใช้เวลาประมาณ{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ)
            </span>
          </label>
          {/* ★ v3.8.0: เปลี่ยนจาก text input → select picker
              กัน user พิมพ์ค่าที่ไม่มาตรฐาน เช่น "20 นาทีๆ" หรือ "2 ชม 30 นา"
              ถ้าค่าเดิมใน DB ไม่ตรงกับ option → เพิ่ม option ชั่วคราวให้แสดง */}
          <select
            id="ed-task-est"
            className="yp-select"
            value={getEstimatedTimeSelectValue(estimatedTime)}
            onChange={(e) => setEstimatedTime(e.target.value)}
            disabled={submitting}
          >
            {ESTIMATED_TIME_OPTIONS.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {/* ★ v3.8.0: ถ้าค่าใน DB ไม่ตรง option → เพิ่ม option ชั่วคราว
                กันข้อมูลเดิมหายไปเมื่อเปิด edit ครั้งแรก */}
            {estimatedTime &&
              !ESTIMATED_TIME_OPTIONS.some((o) => o.value === estimatedTime) ? (
              <option value={estimatedTime}>
                {estimatedTime} (ค่าเดิม)
              </option>
            ) : null}
          </select>
          <div className="field__hint">
            เลือกช่วงเวลาที่ใกล้ที่สุด — จะแสดงในรายการ task เพื่อประเมินเวลารวม
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมวด/ป้าย{' '}
          <span className="yp-text-faint-normal">
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
            <span className="yp-text-tag">#ด้านเอกสาร</span>{' '}
            <span className="yp-text-tag">#ด้านสถานที่</span>{' '}
            เพื่อกรองและจัดกลุ่ม task
          </div>
        </div>
      </div>

      {/* ★ v3.8.0: เปลี่ยน "หมายเหตุ" → "รายละเอียด" + placeholder ที่เป็นจริง */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          รายละเอียด{' '}
          <span className="yp-text-faint-normal">
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <textarea
            id="ed-task-notes"
            className="yp-textarea"
            placeholder="อธิบายขอบเขตของ task นี้ สิ่งที่ต้องทำ หรือหมายเหตุเพิ่มเติม เช่น ต้องประสานงานกับฝ่ายเอกสารก่อนเริ่มงาน"
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
          className="yp-textarea"
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
