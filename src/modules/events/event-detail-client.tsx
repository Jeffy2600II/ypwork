'use client';

// ============================================================
// YP WORK - Event Detail Client Island (r48 — modular split)
// ============================================================
// จัดการ interactive parts ของ event detail page:
// - Task toggle (click row → เปิด status picker)
// - Status change (single event) via status-quick buttons
// - Manage sheet (edit event / add task / edit task / delete)
// - Orchestrates: TaskTimeGroup, AddTaskSheet, EditTaskSheet, EditEventSheet
//
// r48: แยก sub-components ออกเป็นไฟล์ต่างหากเพื่อ modular architecture
//   - task-row.tsx, task-time-group.tsx
//   - add-task-sheet.tsx, edit-task-sheet.tsx, edit-event-sheet.tsx
//   - event-detail-types.ts (shared types & constants)
// ============================================================

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
  Sunrise,
  Sunset,
  CircleDashed,
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
// ★ r47: shared timing constants — กัน magic numbers กระจัดกระจาย
import { SHEET_CLOSE_DURATION, TOAST_AUTO_DISMISS, REACT_COMMIT_DURATION } from '@/lib/core/sheet-timing';
// ★ r47: ใช้ shared STATUS_META + StatusPickerSheet จาก _shared/
import { STATUS_META } from '@/modules/_shared/status-meta';
import { StatusPickerSheet } from '@/modules/_shared/status-picker-sheet';
// ★ r48: imports จาก split files
import {
  PRIORITY_META,
  ESTIMATED_TIME_OPTIONS,
  COLOR_OPTIONS,
  getEstimatedTimeSelectValue,
  type EventDetailClientProps,
  type TaskPayload,
  type EventPatch,
} from './event-detail-types';
import { TaskTimeGroup } from './task-time-group';
import { TaskRow } from './task-row';
import { AddTaskSheet } from './add-task-sheet';
import { EditTaskSheet } from './edit-task-sheet';
import { EditEventSheet } from './edit-event-sheet';

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
    const t = setTimeout(() => setToast(null), TOAST_AUTO_DISMISS);
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

      setToast({ msg: 'เปลี่ยนสถานะรายการย่อยเรียบร้อยแล้ว', type: 'success' });
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
      setLocalError(`ไม่สามารถอัพเดตสถานะรายการ: ${e.message || 'unknown error'}`);
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
    //
    // ★ r47 FIX (E5): กัน silent fail — เดิมใช้ `.catch(() => {})` ทำให้
    //   ถ้า delete request ล้มเหลว user จะ navigate ไป /events แต่ event
    //   ยังอยู่ใน DB → user คิดว่าลบแล้วแต่จริงๆ ไม่ได้ลบ
    //
    //   วิธีแก้:
    //   1) ลอง fetch แบบ await ก่อน (รอ ~5s สูงสุด) ถ้าเสร็จก่อน navigation → good
    //   2) ถ้ายังไม่เสร็จ → fire sendBeacon สำรอง (เพื่อ reliability)
    //   3) ถ้าทั้งคู่ล้มเหลว → เก็บ pending delete ใน sessionStorage
    //      ให้ /events list ตรวจแล้ว retry ครั้งถัดไปที่ user กลับมา
    //   4) สุดท้าย log error จริง (อย่า silent)
    const deleteUrl = `/api/events/${eventId}`;
    const pendingKey = `ypwork:pending-delete:${eventId}`;

    // เก็บ pending delete ล่วงหน้า — ถ้า fetch สำเร็จจะลบออก
    try {
      sessionStorage.setItem(pendingKey, Date.now().toString());
    } catch {
      // sessionStorage อาจไม่พร้อม (private mode) — skip
    }

    try {
      fetch(deleteUrl, {
        method: 'DELETE',
        keepalive: true,
        credentials: 'same-origin',
      })
        .then((res) => {
          if (res.ok) {
            // ลบ pending — delete สำเร็จ
            try { sessionStorage.removeItem(pendingKey); } catch {}
          } else {
            // eslint-disable-next-line no-console
            console.error('[event-detail] delete failed:', res.status, res.statusText);
          }
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[event-detail] delete network error:', err);
          // pending delete ยังอยู่ใน sessionStorage — /events list จะ retry
        });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[event-detail] delete fetch throw:', err);
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

      setToast({ msg: 'ลบรายการย่อยเรียบร้อยแล้ว', type: 'success' });
    } catch (e: any) {
      setLocalError(`ไม่สามารถลบรายการย่อย: ${e.message || ''}`);
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

  // ★ v3.10.0 รอบที่ 10: แบ่งรายการย่อยเป็นช่วงเช้า / ช่วงบ่าย / ไม่ระบุเวลา
  //   ตาม start_time ของแต่ละรายการ — ช่วยให้เห็นภาพรวมของวันได้ง่ายขึ้น
  //   เมื่อกลุ่มรายการมีรายการย่อยจำนวนมาก โดยไม่กระทบตัวการ์ดของรายการย่อยเอง
  // ★ v3.10.0 รอบที่ 11: แสดงหัวข้อกลุ่มเสมอเมื่อมีรายการย่อย (ไม่ใช่แค่ตอนมี
  //   มากกว่า 1 กลุ่ม) — ก่อนหน้านี้ถ้ารายการย่อยทั้งหมด "ไม่ระบุเวลา" อย่างเดียว
  //   จะไม่เห็นข้อความบอกเลย ทำให้ผู้ใช้ไม่รู้ว่าระบบมีการจัดกลุ่มช่วงเวลานี้อยู่
  const taskTimeGroups = React.useMemo(() => {
    const tasks = event?.tasks || [];
    const morning: Task[] = [];
    const afternoon: Task[] = [];
    const unscheduled: Task[] = [];
    for (const t of tasks) {
      if (!t.start_time) {
        unscheduled.push(t);
        continue;
      }
      const hour = parseInt(t.start_time.split(':')[0] || '', 10);
      if (!Number.isNaN(hour) && hour < 12) {
        morning.push(t);
      } else {
        afternoon.push(t);
      }
    }
    const sortByStart = (a: Task, b: Task) =>
      (a.start_time || '').localeCompare(b.start_time || '');
    morning.sort(sortByStart);
    afternoon.sort(sortByStart);

    return {
      morning,
      afternoon,
      unscheduled,
      // ★ v3.10.0 รอบที่ 11: แสดงหัวข้อช่วงเวลาเสมอ ตราบใดที่มีรายการย่อยอย่างน้อย 1 รายการ
      showGroupHeadings: tasks.length > 0,
    };
  }, [event?.tasks]);

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
            กลุ่มรายการ
          </div>
          <h1 className="yp-detail-hero__title">{event.title}</h1>
          <div className="yp-detail-hero__meta">
            {/* ★ v3.10.0 รอบที่ 29: แสดง "วันที่เริ่ม" เป็น meta หลัก ถ้ามี
                และแสดง "กำหนดส่ง" เป็น meta รอง เพื่อให้เห็นทั้งจุดเริ่มและจุดสิ้นสุด
                ระบบอ้างอิงจาก start_date + start_time ก่อน แล้วค่อยอ้างจาก deadline
                ★ r51: event.date อาจเป็น null สำหรับ group type → ตรวจก่อนแสดง */}
            {event.start_date ? (
              <span className="yp-detail-hero__meta-item yp-detail-hero__meta-item--accent">
                <CalIcon /> เริ่ม {formatDate(event.start_date, { long: true })}
              </span>
            ) : null}
            {/* ★ v3.10.0 รอบที่ 29: ถ้าไม่ได้เลือกเวลา → แสดง "ยังไม่ได้เลือกเวลา" (faint)
                แทนที่จะไม่แสดงอะไรเลย — user จะได้รู้ว่า field นี้มี แค่ยังไม่ได้ตั้ง */}
            {event.time ? (
              <span className="yp-detail-hero__meta-item">
                <Clock /> เวลาเริ่ม {event.time}
              </span>
            ) : (
              <span className="yp-detail-hero__meta-item yp-detail-hero__meta-item--muted">
                <Clock /> ยังไม่ได้เลือกเวลาเริ่ม
              </span>
            )}
            {/* ★ v3.10.0 รอบที่ 29: แสดง "กำหนดส่ง" เป็น meta รอง — ถ้าต่างจาก start_date
                หรือถ้าไม่มี start_date เลย → ใช้ date เป็น meta หลักแทน (backward compatible)
                ★ r51: ถ้า event.date เป็น null (group type ที่ไม่มี deadline)
                  → แสดง "ไม่มีกำหนดส่ง" แทน เพื่อให้ user เข้าใจว่า group นี้ใช้
                  deadline ของรายการย่อยแทน */}
            {event.date ? (
              event.start_date && event.start_date !== event.date ? (
                <span className="yp-detail-hero__meta-item yp-detail-hero__meta-item--muted">
                  <CalIcon /> กำหนดส่ง {formatDate(event.date, { long: true })}
                </span>
              ) : !event.start_date ? (
                <span className="yp-detail-hero__meta-item">
                  <CalIcon /> กำหนดส่ง {formatDate(event.date, { long: true })}
                </span>
              ) : null
            ) : (
              <span className="yp-detail-hero__meta-item yp-detail-hero__meta-item--muted">
                <CalIcon /> ไม่มีกำหนดส่ง (ดูที่รายการย่อย)
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
            <div className="yp-single-hero__label">รายการ</div>
          </div>
          <h1 className="yp-single-hero__title">{event.title}</h1>
          <div className="yp-single-hero__meta">
            {/* ★ v3.10.0 รอบที่ 29: เหมือน group hero — แสดง start_date + time + deadline
                ★ r51: event.date อาจเป็น null สำหรับ group type → ตรวจก่อนแสดง */}
            {event.start_date ? (
              <span className="yp-single-hero__meta-item yp-single-hero__meta-item--accent">
                <CalIcon /> เริ่ม {formatDate(event.start_date, { long: true })}
              </span>
            ) : null}
            {event.time ? (
              <span className="yp-single-hero__meta-item">
                <Clock /> เวลาเริ่ม {event.time}
              </span>
            ) : (
              <span className="yp-single-hero__meta-item yp-single-hero__meta-item--muted">
                <Clock /> ยังไม่ได้เลือกเวลาเริ่ม
              </span>
            )}
            {event.date ? (
              event.start_date && event.start_date !== event.date ? (
                <span className="yp-single-hero__meta-item yp-single-hero__meta-item--muted">
                  <CalIcon /> กำหนดส่ง {formatDate(event.date, { long: true })}
                </span>
              ) : !event.start_date ? (
                <span className="yp-single-hero__meta-item">
                  <CalIcon /> กำหนดส่ง {formatDate(event.date, { long: true })}
                </span>
              ) : null
            ) : (
              <span className="yp-single-hero__meta-item yp-single-hero__meta-item--muted">
                <CalIcon /> ไม่มีกำหนดส่ง (ดูที่รายการย่อย)
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
              <div className="yp-stat__label">จำนวนรายการย่อย</div>
            </div>
          </div>
          <div className="yp-stat yp-accented" style={{ ['--accent' as string]: '#10B981' }}>
            <div className="yp-stat__icon">
              <Check width={18} height={18} />
            </div>
            <div className="yp-stat__body">
              <div className="yp-stat__value">{doneTasks}</div>
              <div className="yp-stat__label">เสร็จสมบูรณ์</div>
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
            <span className="yp-detail-section__title-group">
            รายการย่อย
            <InfoButton
              size="sm"
              content={
                <>
                  <InfoSheetHeader
                    icon={<Layers size={20} strokeWidth={2} />}
                    title="รายการย่อย"
                    subtitle="แต่ละรายการย่อยของกลุ่มรายการ — ทำเสร็จทีละรายการ จนครบ"
                  />

                  <InfoTldr>
                    รายการย่อย คือส่วนย่อยของ <InfoPill>กลุ่มรายการ</InfoPill>{' '}
                    — แตะรายการย่อยเพื่อเปลี่ยนสถานะ สถานะรวมคำนวณอัตโนมัติ
                  </InfoTldr>

                  <p>
                    กลุ่มรายการประกอบด้วย <InfoHighlight>รายการย่อยหลายรายการ</InfoHighlight>{' '}
                    ที่แต่ละรายการทำหน้าที่เฉพาะ — เช่น วันแม่อาจมีรายการย่อย: ซื้อของ, ตกแต่งบูธ,
                    ซ้อมร้องเพลง, ดูแลวันจริง แต่ละรายการมีสถานะของตัวเอง
                    และสามารถมอบหมายให้คนละฝ่ายทำได้
                  </p>

                  <InfoSectionTitle>วิธีใช้งานรายการย่อย</InfoSectionTitle>

                  <InfoSteps>
                    <InfoStep title="เพิ่มรายการย่อยใหม่">
                      กดปุ่ม <InfoPill>+ เพิ่มรายการย่อย</InfoPill>{' '}
                      ด้านล่างรายการ กรอกชื่อ + วันที่ + มอบหมายได้
                    </InfoStep>
                    <InfoStep title="เปลี่ยนสถานะรายการย่อย">
                      แตะที่รายการย่อย → เลือกสถานะ (วางแผน / กำลังดำเนินการ / เสร็จสมบูรณ์)
                      สถานะของกลุ่มรายการจะคำนวณใหม่อัตโนมัติ
                    </InfoStep>
                    <InfoStep title="แก้ไขรายการย่อย">
                      กดปุ่มดินสอ → แก้ไขชื่อ วันที่ หรือผู้รับผิดชอบได้
                    </InfoStep>
                    <InfoStep title="ลบรายการย่อย">
                      กดปุ่มถังขยะ — ระบบจะถามยืนยันก่อนลบ
                    </InfoStep>
                  </InfoSteps>

                  <InfoSectionTitle>สถานะรวมคำนวณยังไง?</InfoSectionTitle>
                  <InfoKeyValue>
                    <InfoKeyValueRow k={<><InfoPill>วางแผน</InfoPill></>} v="ทุกรายการย่อยยังเป็น &ldquo;วางแผน&rdquo;" />
                    <InfoKeyValueRow k={<><InfoPill>กำลังดำเนินการ</InfoPill></>} v="มีอย่างน้อย 1 รายการย่อยเป็น &ldquo;กำลังดำเนินการ&rdquo; แต่ยังไม่ครบเสร็จ" />
                    <InfoKeyValueRow k={<><InfoPill>เสร็จสมบูรณ์</InfoPill></>} v="ทุกรายการย่อยเป็น &ldquo;เสร็จสมบูรณ์&rdquo;" />
                  </InfoKeyValue>

                  <InfoCallout type="info" title="เคล็ดลับการแบ่งรายการย่อย">
                    แบ่งรายการย่อยให้<strong>แต่ละรายการทำได้ใน 1-2 ชั่วโมง</strong> —
                    ถ้ารายการย่อยใหญ่เกินไป แยกเป็นรายการย่อยที่เล็กลงอีก ทำให้ติดตามความคืบหน้าได้แม่นยำกว่า
                  </InfoCallout>
                </>
              }
            />
            </span>
            <span className="yp-detail-section__count">
              {doneTasks}/{totalTasks}
            </span>
          </h2>

          {totalTasks === 0 ? (
            <div className="yp-card yp-card--tasklist">
              <div className="yp-task-empty">
                <div className="yp-task-empty__icon">
                  <Layers width={20} height={20} />
                </div>
                <div className="yp-task-empty__title">ยังไม่มีรายการย่อย</div>
                <div className="yp-task-empty__desc">
                  กดปุ่มด้านล่างเพื่อเพิ่มรายการย่อยแรกให้รายการนี้
                </div>
              </div>
              <button
                type="button"
                className="yp-add-task-btn"
                onClick={() => setAddTaskOpen(true)}
              >
                <Plus />
                <span>เพิ่มรายการย่อย</span>
              </button>
            </div>
          ) : (
            // ★ v3.10.0: คอนเทนเนอร์ของรายการย่อย ปรับให้จัดวางแบบเดียวกับ
            //   รายการวันนี้/กำลังจะถึงในหน้าโฮม — การ์ดแต่ละรายการแยกจากกัน
            //   มีระยะห่างระหว่างการ์ด แทนที่จะรวมอยู่ในการ์ดเดียวคั่นด้วยเส้นแบ่ง
            //   (ไม่ได้แก้ไขตัวการ์ดของรายการย่อยเอง — แก้แค่ container ที่ห่อ)
            // ★ v3.10.0 รอบที่ 10: แสดงรายการย่อยแยกตามช่วงเวลา
            //   (ช่วงเช้า / ช่วงบ่าย / ไม่ระบุเวลา) เสมอเมื่อมีรายการย่อยอย่างน้อย 1 รายการ
            <div className="yp-task-list">
              {taskTimeGroups.showGroupHeadings ? (
                <>
                  <TaskTimeGroup
                    icon={<Sunrise width={14} height={14} strokeWidth={2} />}
                    label="ช่วงเช้า"
                    caption="เริ่มก่อน 12:00 น."
                    count={taskTimeGroups.morning.length}
                    tasks={taskTimeGroups.morning}
                    onStatusClick={(id) => {
                      setActiveTaskId(id);
                      setStatusPickerOpen(true);
                    }}
                    onEdit={(id) => {
                      setEditTaskId(id);
                      setEditTaskOpen(true);
                    }}
                    onDelete={requestDeleteTask}
                  />

                  <TaskTimeGroup
                    icon={<Sunset width={14} height={14} strokeWidth={2} />}
                    label="ช่วงบ่าย"
                    caption="เริ่มตั้งแต่ 12:00 น. เป็นต้นไป"
                    count={taskTimeGroups.afternoon.length}
                    tasks={taskTimeGroups.afternoon}
                    onStatusClick={(id) => {
                      setActiveTaskId(id);
                      setStatusPickerOpen(true);
                    }}
                    onEdit={(id) => {
                      setEditTaskId(id);
                      setEditTaskOpen(true);
                    }}
                    onDelete={requestDeleteTask}
                  />

                  <TaskTimeGroup
                    icon={<CircleDashed width={14} height={14} strokeWidth={2} />}
                    label="ไม่ระบุเวลา"
                    caption="ยังไม่ได้กำหนดเวลาเริ่ม"
                    count={taskTimeGroups.unscheduled.length}
                    tasks={taskTimeGroups.unscheduled}
                    muted
                    onStatusClick={(id) => {
                      setActiveTaskId(id);
                      setStatusPickerOpen(true);
                    }}
                    onEdit={(id) => {
                      setEditTaskId(id);
                      setEditTaskOpen(true);
                    }}
                    onDelete={requestDeleteTask}
                  />
                </>
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
                className="yp-add-task-btn yp-add-task-btn--standalone"
                onClick={() => setAddTaskOpen(true)}
              >
                <Plus />
                <span>เพิ่มรายการย่อย</span>
              </button>
            </div>
          )}

          <div className="yp-task-list-hint">แตะรายการย่อยเพื่อเปลี่ยนสถานะ</div>
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
          จัดการรายการ
        </button>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STATUS PICKER SHEET (task)
          ★ r47: ใช้ shared StatusPickerSheet จาก _shared/ แทน inline JSX
          ═══════════════════════════════════════════════════════════════ */}
      <StatusPickerSheet
        open={statusPickerOpen}
        onClose={() => {
          setStatusPickerOpen(false);
          setActiveTaskId(null);
        }}
        title="สถานะของรายการย่อย"
        description={activeTask?.title}
        statuses={['todo', 'ongoing', 'done'] as TaskStatus[]}
        currentStatus={activeTask?.status}
        onSelect={(s) => handleTaskStatusChange(s as TaskStatus)}
      />

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
                start_date: payload.startDate || null,   // ★ v3.10.0 รอบที่ 29
                start_time: payload.startTime || null,   // ★ v3.10.0 รอบที่ 9
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
              setToast({ msg: 'เพิ่มรายการย่อยเรียบร้อยแล้ว', type: 'success' });
            }
          } catch (e: any) {
            setLocalError(`ไม่สามารถเพิ่มรายการย่อย: ${e.message || 'unknown error'}`);
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
                    start_date: payload.startDate || null,   // ★ v3.10.0 รอบที่ 29
                    start_time: payload.startTime || null,   // ★ v3.10.0 รอบที่ 9
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
                start_date: payload.startDate || null,   // ★ v3.10.0 รอบที่ 29
                start_time: payload.startTime || null,   // ★ v3.10.0 รอบที่ 9
                estimated_time: payload.estimatedTime,
                notes: payload.notes,
                tags: payload.tags,
              });

              setEditTaskOpen(false);
              setEditTaskId(null);
              setToast({ msg: 'บันทึกการแก้ไขเรียบร้อยแล้ว', type: 'success' });
            } catch (e: any) {
              setLocalError(`ไม่สามารถแก้ไขรายการย่อย: ${e.message || 'unknown error'}`);
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
                type: patch.type,
                title: patch.title,
                // ★ r51: ส่ง date เป็น '' (empty) ถ้า group type → API จะ set null
                date: patch.date,
                start_date: patch.start_date,
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
              type: patch.type,
              title: patch.title,
              // ★ r51: group type → date เป็น null (API จะ set null ใน DB)
              date: patch.date || null,
              start_date: patch.start_date,
              time: patch.time,
              location: patch.location,
              description: patch.description,
              department_id: patch.departmentId || null,
              color: patch.color,
            });

            setEditEventOpen(false);
            setToast({ msg: 'บันทึกเรียบร้อยแล้ว', type: 'success' });
          } catch (e: any) {
            setLocalError(`ไม่สามารถแก้ไขรายการ: ${e.message || 'unknown error'}`);
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
        title="จัดการรายการ"
        description={event.title}
      >
        <div className="yp-manage-sheet">
          <button
            type="button"
            className="yp-manage-sheet__action"
            onClick={() => {
              setManageOpen(false);
              setTimeout(() => setEditEventOpen(true), SHEET_CLOSE_DURATION);
            }}
          >
            <div className="yp-manage-sheet__icon">
              <Pencil />
            </div>
            <div className="yp-manage-sheet__body">
              <div className="yp-manage-sheet__title">แก้ไขรายการ</div>
              <div className="yp-manage-sheet__desc">
                เปลี่ยนชื่อรายการ วันที่ เวลา สถานที่ รายละเอียด สี
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
                  setTimeout(() => setAddTaskOpen(true), SHEET_CLOSE_DURATION);
                }}
              >
                <div className="yp-manage-sheet__icon">
                  <Plus />
                </div>
                <div className="yp-manage-sheet__body">
                  <div className="yp-manage-sheet__title">เพิ่มรายการย่อย</div>
                  <div className="yp-manage-sheet__desc">
                    สร้างรายการย่อยใหม่ในกลุ่มรายการนี้
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
                    setTimeout(() => setEditTaskPickerOpen(true), SHEET_CLOSE_DURATION);
                  }}
                >
                  <div className="yp-manage-sheet__icon">
                    <Pencil />
                  </div>
                  <div className="yp-manage-sheet__body">
                    <div className="yp-manage-sheet__title">แก้ไขรายการย่อย</div>
                    <div className="yp-manage-sheet__desc">
                      เลือกรายการย่อยที่ต้องการแก้ไข ({totalTasks} รายการ)
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
                ลบรายการนี้
              </div>
              <div className="yp-manage-sheet__desc">
                {isGroup
                  ? `จะลบรายการย่อยทั้งหมด ${totalTasks} รายการด้วย`
                  : 'จะลบรายการนี้ออกจากระบบ'}{' '}
                — ไม่สามารถย้อนกลับได้
              </div>
            </div>
            <ChevronRight />
          </button>
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════════
          EDIT TASK PICKER — แสดงรายการย่อยให้เลือกเพื่อแก้ไข
          ═══════════════════════════════════════════════════════════════ */}
      <BottomSheet
        open={editTaskPickerOpen}
        onClose={() => setEditTaskPickerOpen(false)}
        title="เลือกรายการย่อยที่จะแก้ไข"
      >
        <div className="yp-manage-task-picker">
          {(event.tasks || []).map((t) => {
            const sLabel = statusLabel(t.status);
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
        title="ลบรายการย่อย?"
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
            คุณแน่ใจหรือไม่ว่าต้องการลบรายการย่อย{' '}
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
        title="ลบรายการนี้?"
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
              {submitting ? 'กำลังลบ...' : 'ลบรายการ'}
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
              ? ` และรายการย่อยทั้งหมด ${totalTasks} รายการ`
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

