'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Supabase Realtime Hooks (v1.6)
// ═══════════════════════════════════════════════════════════════
// ชุด hooks สำหรับ subscribe ข้อมูลแบบ realtime ผ่าน Supabase Realtime
//
// หลักการ (ตามที่ user ต้องการ):
//   - ไม่มี polling — เว็บไม่ได้ยิง request ทุก ๆ วินาที
//   - พร้อมรับข้อมูลตลอด — เปิด WebSocket channel ค้างไว้
//   - เมื่อ DB เปลี่ยน → Supabase push ผ่าน channel → เราอัพเดต state
//   - ไม่มีข้อมูลใหม่ → ไม่มีอะไรเกิดขึ้น → ไม่กินคำขอ HTTP
//
// Trade-offs:
//   - ใช้ WebSocket 1 ตัวต่อ client (Supabase จัดการ multiplexing เอง)
//   - Reconnect อัตโนมัติเมื่อ connection หลุด
//   - กรองเฉพาะ event ที่เกี่ยวข้องกับหน้านั้น ๆ (filter by table/event)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { YPEvent, Task, UserProfile, Department } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════
// Shared client (singleton) — ใช้ client เดียวกันทั้ง app
// ═══════════════════════════════════════════════════════════════
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) _client = createClient();
  return _client;
}

// ═══════════════════════════════════════════════════════════════
// Type helpers — normalize raw rows from Supabase
// ═══════════════════════════════════════════════════════════════
type RawEvent = any;
type RawTask = any;

function normalizeEvent(e: RawEvent): YPEvent {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date,
    end_date: e.end_date ?? null,
    time: e.time ?? '',
    location: e.location ?? '',
    description: e.description ?? '',
    department_id: e.department_id ?? null,
    status: e.status,
    color: e.color ?? '#4F46E5',
    created_by: e.created_by ?? null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    department: e.department
      ? Array.isArray(e.department)
        ? (e.department[0] as Department)
        : (e.department as Department)
      : null,
    tasks: (Array.isArray(e.tasks) ? e.tasks : []).map(normalizeTask),
  };
}

function normalizeTask(t: RawTask): Task {
  return {
    id: t.id,
    event_id: t.event_id,
    title: t.title,
    due_date: t.due_date ?? null,
    status: t.status,
    priority: t.priority,
    estimated_time: t.estimated_time ?? '',
    notes: t.notes ?? '',
    tags: Array.isArray(t.tags) ? t.tags : [],
    sort_order: t.sort_order ?? 0,
    created_at: t.created_at,
    updated_at: t.updated_at,
    assignees: Array.isArray(t.assignees) ? t.assignees : [],
  };
}

// ═══════════════════════════════════════════════════════════════
// Fetch helpers — used by hooks to (re)load data
// ═══════════════════════════════════════════════════════════════
const EVENT_FIELDS = `
  id, type, title, date, end_date, time, location, description,
  department_id, status, color, created_by, created_at, updated_at,
  department:departments ( id, name, color, icon, description ),
  tasks:ypwork_tasks (
    id, event_id, title, due_date, status, priority,
    estimated_time, notes, tags, sort_order, created_at, updated_at
  )
`;

async function fetchEvents(): Promise<YPEvent[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ypwork_events')
    .select(EVENT_FIELDS)
    .order('date', { ascending: true });
  if (error) throw error;

  const events = (data || []).map(normalizeEvent);

  // fetch all assignees in one shot
  const taskIds = events.flatMap((e) => (e.tasks || []).map((t) => t.id));
  if (taskIds.length === 0) return events;

  const { data: aRows } = await supabase
    .from('ypwork_task_assignees')
    .select('task_id, user_auth_uid')
    .in('task_id', taskIds);
  const uids = Array.from(new Set((aRows || []).map((a: any) => a.user_auth_uid)));
  let usersMap = new Map<string, UserProfile>();
  if (uids.length > 0) {
    const { data: uRows } = await supabase
      .from('council_users')
      .select('auth_uid, full_name, color, role, account_type, year, department_id')
      .in('auth_uid', uids);
    for (const u of uRows || []) {
      usersMap.set(u.auth_uid, {
        auth_uid: u.auth_uid,
        full_name: u.full_name,
        student_id: null,
        national_id: null,
        year: u.year ?? null,
        role: u.role ?? 'member',
        account_type: (u.account_type || 'student') as 'student' | 'teacher' | 'other',
        approved: true,
        disabled: false,
        email: '',
        department_id: u.department_id ?? null,
        color: u.color ?? '#4F46E5',
      });
    }
  }
  const assigneesMap = new Map<string, UserProfile[]>();
  for (const a of aRows || []) {
    if (!assigneesMap.has(a.task_id)) assigneesMap.set(a.task_id, []);
    const u = usersMap.get(a.user_auth_uid);
    if (u) assigneesMap.get(a.task_id)!.push(u);
  }
  return events.map((e) => ({
    ...e,
    tasks: (e.tasks || []).map((t) => ({
      ...t,
      assignees: assigneesMap.get(t.id) || [],
    })),
  }));
}

async function fetchEventById(id: string): Promise<YPEvent | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ypwork_events')
    .select(EVENT_FIELDS)
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const ev = normalizeEvent(data);
  // fetch assignees
  const taskIds = (ev.tasks || []).map((t) => t.id);
  if (taskIds.length === 0) return ev;

  const { data: aRows } = await supabase
    .from('ypwork_task_assignees')
    .select('task_id, user_auth_uid')
    .in('task_id', taskIds);
  const uids = Array.from(new Set((aRows || []).map((a: any) => a.user_auth_uid)));
  let usersMap = new Map<string, UserProfile>();
  if (uids.length > 0) {
    const { data: uRows } = await supabase
      .from('council_users')
      .select('auth_uid, full_name, color, role, account_type, year, department_id')
      .in('auth_uid', uids);
    for (const u of uRows || []) {
      usersMap.set(u.auth_uid, {
        auth_uid: u.auth_uid,
        full_name: u.full_name,
        student_id: null,
        national_id: null,
        year: u.year ?? null,
        role: u.role ?? 'member',
        account_type: (u.account_type || 'student') as 'student' | 'teacher' | 'other',
        approved: true,
        disabled: false,
        email: '',
        department_id: u.department_id ?? null,
        color: u.color ?? '#4F46E5',
      });
    }
  }
  const assigneesMap = new Map<string, UserProfile[]>();
  for (const a of aRows || []) {
    if (!assigneesMap.has(a.task_id)) assigneesMap.set(a.task_id, []);
    const u = usersMap.get(a.user_auth_uid);
    if (u) assigneesMap.get(a.task_id)!.push(u);
  }
  ev.tasks = (ev.tasks || []).map((t) => ({
    ...t,
    assignees: assigneesMap.get(t.id) || [],
  }));
  return ev;
}

// ═══════════════════════════════════════════════════════════════
// useRealtimeEvents — สำหรับหน้า list/calendar/today
// รับ initialEvents (SSR) แล้ว subscribe realtime updates
// ═══════════════════════════════════════════════════════════════
export function useRealtimeEvents(initialEvents: YPEvent[]): {
  events: YPEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [events, setEvents] = React.useState<YPEvent[]>(initialEvents);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  // Stable reload function (does not depend on state)
  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEvents()
      .then((rows) => {
        // avoid race condition — only apply if still latest
        if (myToken === reloadTokenRef.current) {
          setEvents(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, []);

  // Initial mount: keep SSR data as-is, then subscribe for changes
  React.useEffect(() => {
    const supabase = getClient();
    const channel = supabase
      .channel('ypwork-events-realtime')
      // events changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_events' },
        () => {
          // Reload full set on any change — simple and stable.
          // (We avoid patching individual rows to keep correctness with
          //  joins like department + assignees; one round-trip is cheap.)
          reload();
        }
      )
      // tasks changes (affects progress + counts)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_tasks' },
        () => reload()
      )
      // assignees changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { events, loading, error, reload };
}

// ═══════════════════════════════════════════════════════════════
// useRealtimeEventById — สำหรับหน้า detail
// subscribe เฉพาะ event ตัวเอง + tasks ของ event นั้น
// ═══════════════════════════════════════════════════════════════
export function useRealtimeEventById(
  initialEvent: YPEvent | null,
  eventId: string | null
): {
  event: YPEvent | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** local patch helpers — สำหรับ optimistic updates ก่อน realtime มาถึง */
  patchEvent: (patch: Partial<YPEvent>) => void;
  patchTask: (taskId: string, patch: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  addTask: (task: Task) => void;
} {
  const [event, setEvent] = React.useState<YPEvent | null>(initialEvent);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    if (!eventId) return;
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEventById(eventId)
      .then((row) => {
        if (myToken === reloadTokenRef.current) {
          setEvent(row);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [eventId]);

  React.useEffect(() => {
    if (!eventId) return;
    const supabase = getClient();

    const channel = supabase
      .channel(`ypwork-event-${eventId}`)
      // changes on THIS event row
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ypwork_events',
          filter: `id=eq.${eventId}`,
        },
        () => reload()
      )
      // changes on tasks of THIS event (filter by event_id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ypwork_tasks',
          filter: `event_id=eq.${eventId}`,
        },
        () => reload()
      )
      // assignee changes — reload (no per-row filter possible easily)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, reload]);

  // local patch helpers — สำหรับ optimistic update
  const patchEvent = React.useCallback((patch: Partial<YPEvent>) => {
    setEvent((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);
  const patchTask = React.useCallback((taskId: string, patch: Partial<Task>) => {
    setEvent((prev) =>
      prev
        ? {
            ...prev,
            tasks: (prev.tasks || []).map((t) =>
              t.id === taskId ? { ...t, ...patch } : t
            ),
          }
        : prev
    );
  }, []);
  const removeTask = React.useCallback((taskId: string) => {
    setEvent((prev) =>
      prev
        ? { ...prev, tasks: (prev.tasks || []).filter((t) => t.id !== taskId) }
        : prev
    );
  }, []);
  const addTask = React.useCallback((task: Task) => {
    setEvent((prev) =>
      prev ? { ...prev, tasks: [...(prev.tasks || []), task] } : prev
    );
  }, []);

  return { event, loading, error, reload, patchEvent, patchTask, removeTask, addTask };
}
