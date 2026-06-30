'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Supabase Realtime Hooks (v1.8 — global realtime)
// ═══════════════════════════════════════════════════════════════
// ชุด hooks สำหรับ subscribe ข้อมูลแบบ realtime ผ่าน Supabase Realtime
//
// หลักการ (ตามที่ user ต้องการ):
//   - ไม่มี polling — เว็บไม่ได้ยิง request ทุก ๆ วินาที
//   - พร้อมรับข้อมูลตลอด — เปิด WebSocket channel ค้างไว้
//   - เมื่อ DB เปลี่ยน → Supabase push ผ่าน channel → เราอัพเดต state
//   - ไม่มีข้อมูลใหม่ → ไม่มีอะไรเกิดขึ้น → ไม่กินคำขอ HTTP
//
// v1.8.1 changes:
//   - เพิ่ม useRealtimeYears() — subscribe รายการปีการศึกษาจาก council_years
//     (ก่อนหน้านี้ register form hardcoded ['2568','2567','2566'])
//   - เปิด Realtime บน council_years ใน ypwork-v1.8.1-...sql
//
// v1.8 changes (Realtime ทั่วทั้งเว็บ):
//   - เพิ่ม useRealtimeDepartments() — subscribe การเปลี่ยนแปลงฝ่าย
//   - เพิ่ม useRealtimeProfileStats() — live stats ของ user ในหน้าโปรไฟล์
//   - เพิ่ม useRealtimeEventsForDate() — สำหรับ day view
//   - เพิ่ม useRealtimeActivityLog() — สำหรับ activity feed ในอนาคต
//   - ตารางที่ subscribe ครอบคลุม: ypwork_events, ypwork_tasks,
//     ypwork_task_assignees, ypwork_event_members, departments,
//     council_users, council_join_requests, ypwork_activity_log,
//     council_years (เพิ่มใน v1.8.1)
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


// ═══════════════════════════════════════════════════════════════
// v1.8 · useRealtimeEventsForDate — สำหรับหน้า Day View (/events/day/[date])
// เหมือน useRealtimeEvents แต่กรองเฉพาะ events ของวันที่กำหนด
// ═══════════════════════════════════════════════════════════════
export function useRealtimeEventsForDate(
  initialEvents: YPEvent[],
  dateStr: string | null
): {
  events: YPEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [events, setEvents] = React.useState<YPEvent[]>(initialEvents);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    if (!dateStr) return;
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEvents()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          // กรองเฉพาะ event ของวันที่กำหนด (date หรือ end_date คลุมวันนี้)
          const filtered = rows.filter((e) => {
            if (e.date === dateStr) return true;
            if (e.end_date && e.date <= dateStr && e.end_date >= dateStr) return true;
            return false;
          });
          setEvents(filtered);
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
  }, [dateStr]);

  React.useEffect(() => {
    if (!dateStr) return;
    const supabase = getClient();
    const channel = supabase
      .channel(`ypwork-events-day-${dateStr}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_events' },
        () => reload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_tasks' },
        () => reload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr, reload]);

  return { events, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8 · useRealtimeDepartments — สำหรับแสดงรายการฝ่ายแบบ live
// ใช้ใน: register form (เลือกฝ่าย), profile (แสดงฝ่าย), today (stat ฝ่าย)
// เมื่อ admin เปลี่ยนชื่อ/สี/ไอคอนฝ่าย → ทุกหน้าอัพเดตทันที
// ═══════════════════════════════════════════════════════════════
async function fetchDepartments(): Promise<Department[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, color, icon, description, created_at, updated_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Department[];
}

export function useRealtimeDepartments(
  initialDepartments: Department[]
): {
  departments: Department[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [departments, setDepartments] = React.useState<Department[]>(initialDepartments);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchDepartments()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setDepartments(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลฝ่ายไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    const supabase = getClient();
    const channel = supabase
      .channel('ypwork-departments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { departments, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8 · useRealtimeProfileStats — live stats ของ user ในหน้าโปรไฟล์
// subscribe: ypwork_tasks, ypwork_task_assignees, ypwork_events,
//            council_users (เพื่อ detect การเปลี่ยนฝ่าย/สี/role ของตัวเอง)
// ═══════════════════════════════════════════════════════════════
export interface ProfileStats {
  deptEvents: number;
  myTasks: number;
  myDone: number;
  myPending: number;
  completionRate: number;
}

async function fetchProfileStats(
  userAuthUid: string,
  departmentId: string | null
): Promise<ProfileStats> {
  const supabase = getClient();

  // 1) งานในฝ่าย (events where department_id = user.department_id)
  let deptEvents = 0;
  if (departmentId) {
    const { count } = await supabase
      .from('ypwork_events')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', departmentId);
    deptEvents = count || 0;
  }

  // 2) Tasks ที่รับผิดชอบ (assignee = user.auth_uid)
  const { data: myAssignees } = await supabase
    .from('ypwork_task_assignees')
    .select('task_id')
    .eq('user_auth_uid', userAuthUid);

  const myTaskIds = (myAssignees || []).map((a: any) => a.task_id);
  let myTasks = 0;
  let myDone = 0;
  let myPending = 0;

  if (myTaskIds.length > 0) {
    const { data: myTasksRaw } = await supabase
      .from('ypwork_tasks')
      .select('id, status')
      .in('id', myTaskIds);

    myTasks = myTasksRaw?.length || 0;
    myDone = myTasksRaw?.filter((t: any) => t.status === 'done').length || 0;
    myPending = myTasks - myDone;
  }

  const completionRate = myTasks > 0 ? Math.round((myDone / myTasks) * 100) : 0;

  return { deptEvents, myTasks, myDone, myPending, completionRate };
}

export function useRealtimeProfileStats(
  userAuthUid: string,
  departmentId: string | null,
  initialStats: ProfileStats
): {
  stats: ProfileStats;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [stats, setStats] = React.useState<ProfileStats>(initialStats);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchProfileStats(userAuthUid, departmentId)
      .then((s) => {
        if (myToken === reloadTokenRef.current) {
          setStats(s);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดสถิติไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [userAuthUid, departmentId]);

  React.useEffect(() => {
    const supabase = getClient();
    const channel = supabase
      .channel(`ypwork-profile-${userAuthUid}`)
      // task changes → myTasks/myDone/myPending/completionRate เปลี่ยน
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_tasks' },
        () => reload()
      )
      // assignee changes → myTasks เปลี่ยน
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
        () => reload()
      )
      // events change → deptEvents เปลี่ยน
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_events' },
        () => reload()
      )
      // council_users change → ฝ่าย/สี/role ของตัวเองอาจเปลี่ยน
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'council_users',
          filter: `auth_uid=eq.${userAuthUid}`,
        },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userAuthUid, reload]);

  return { stats, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8 · useRealtimeActivityLog — สำหรับ activity feed (ในอนาคต)
// subscribe ypwork_activity_log + council_users (เพื่อ resolve actor name)
// ═══════════════════════════════════════════════════════════════
export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  created_at: string;
  actor_name?: string | null;
  actor_color?: string | null;
}

async function fetchActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ypwork_activity_log')
    .select(
      'id, actor_id, action, entity_type, entity_id, entity_title, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data || []) as ActivityLogEntry[];

  // resolve actor names (best-effort — ถ้า fail ก็ยังแสดงได้)
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])
  );
  if (actorIds.length === 0) return rows;

  const { data: users } = await supabase
    .from('council_users')
    .select('auth_uid, full_name, color')
    .in('auth_uid', actorIds);

  const userMap = new Map<string, { name: string; color: string }>();
  for (const u of users || []) {
    userMap.set(u.auth_uid, {
      name: u.full_name,
      color: u.color || '#4F46E5',
    });
  }

  return rows.map((r) => ({
    ...r,
    actor_name: r.actor_id ? userMap.get(r.actor_id)?.name || null : null,
    actor_color: r.actor_id ? userMap.get(r.actor_id)?.color || null : null,
  }));
}

export function useRealtimeActivityLog(limit = 50): {
  entries: ActivityLogEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [entries, setEntries] = React.useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchActivityLog(limit)
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setEntries(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลด activity log ไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [limit]);

  React.useEffect(() => {
    reload();
    const supabase = getClient();
    const channel = supabase
      .channel('ypwork-activity-log-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ypwork_activity_log' },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { entries, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8.1 · useRealtimeYears — รายการปีการศึกษาแบบ live
// ใช้ใน: register form (เลือกปีการศึกษา)
// เมื่อ admin เพิ่ม/ปิดปีใน YP Labs → หน้า register อัพเดตทันที
// (ก่อนหน้านี้ frontend hardcoded ['2568','2567','2566'])
//
// schema (จาก yplabs):
//   council_years (
//     year integer PRIMARY KEY,
//     closed boolean DEFAULT false
//   )
// ═══════════════════════════════════════════════════════════════

export interface CouncilYear {
  year: number;
  closed: boolean;
}

async function fetchYears(): Promise<CouncilYear[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('council_years')
    .select('year, closed')
    .order('year', { ascending: false });
  if (error) throw error;
  // normalize — ถ้า column `closed` ไม่มี (DB ยังไม่ migrate) ให้ถือว่าเปิดอยู่
  return (data || []).map((r: any) => ({
    year: Number(r.year),
    closed: Boolean(r.closed ?? false),
  }));
}

export function useRealtimeYears(
  initialYears: CouncilYear[]
): {
  years: CouncilYear[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [years, setYears] = React.useState<CouncilYear[]>(initialYears);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchYears()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setYears(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดรายการปีการศึกษาไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    const supabase = getClient();
    const channel = supabase
      .channel('ypwork-years-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'council_years' },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { years, loading, error, reload };
}
