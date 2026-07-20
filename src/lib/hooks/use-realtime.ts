'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Supabase Realtime Hooks (v1.8.3 — defensive + unique channels)
// ═══════════════════════════════════════════════════════════════
// ชุด hooks สำหรับ subscribe ข้อมูลแบบ realtime ผ่าน Supabase Realtime
//
// หลักการ (ตามที่ user ต้องการ):
//   - ไม่มี polling — เว็บไม่ได้ยิง request ทุก ๆ วินาที
//   - พร้อมรับข้อมูลตลอด — เปิด WebSocket channel ค้างไว้
//   - เมื่อ DB เปลี่ยน → Supabase push ผ่าน channel → เราอัพเดต state
//   - ไม่มีข้อมูลใหม่ → ไม่มีอะไรเกิดขึ้น → ไม่กินคำขอ HTTP
//
// v1.8.3 changes (defensive + unique channels):
//   - แก้บั๊ก "This page couldn't load" บน /today และ /profile — เกิดจาก
//     2 hooks ใช้ชื่อ channel เดียวกัน (AppShell + TodayClient/ProfileView
//     เรียก useRealtimeSessionUser ทั้งคู่) เวลา cleanup อันนึง removeChannel
//     ไปทำลาย subscription ของอีกอัน → ใช้ useUniqueChannelName() แก้
//   - getClient() ไม่ throw แล้ว — คืน null แล้วให้ hook ข้าม subscription
//     (ป้องกัน crash ทั้งหน้าเวลา env var ไม่ครบ)
//   - ทุก useEffect ที่ subscribe channel ถูกห่อด้วย try-catch
//   - ทุก cleanup เรียก removeChannel ใน try-catch (กัน throw ตอน channel
//     ถูก remove ไปแล้ว)
//   - รองรับทั้ง NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) และ
//     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel × Supabase integration)
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
import type { YPEvent, Task, UserProfile, Department, SessionUser } from '@/lib/types';
import { getUserColor } from '@/lib/utils/user-color';
// ★ v3.9.9: sessionStorage cache — เก็บข้อมูลไว้กลับเข้าหน้าเดิมเร็วขึ้น
import { getCached, setCached } from '@/lib/utils/session-cache';

// ═══════════════════════════════════════════════════════════════
// Shared client (singleton) — ใช้ client เดียวกันทั้ง app
// v1.8.3: ป้องกันไม่ให้ throw หาก env var ยังไม่ถูกตั้ง — คืน null แล้ว
//   ให้ hook ตัวบอกว่า loading/error แทน ไม่ใช่ crash ทั้งหน้า
// ═══════════════════════════════════════════════════════════════
let _client: SupabaseClient | null = null;
let _clientError: string | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  if (_clientError) return null; // ลองสร้างแล้วล้มเหลว — ไม่ต้องลอกซ้ำ
  try {
    _client = createClient();
    return _client;
  } catch (e: any) {
    _clientError = e?.message || 'ไม่สามารถสร้าง Supabase client ได้';
    // eslint-disable-next-line no-console
    console.error('[use-realtime] getClient() failed:', _clientError);
    return null;
  }
}

function getClientError(): string | null {
  return _clientError;
}

/**
 * v1.8.3: สร้าง channel name ที่ unique ต่อ hook instance
 * ป้องกันปัญหา 2 hooks ที่ใช้ชื่อ channel เดียวกัน (เช่น AppShell + TodayClient
 * ที่เรียก useRealtimeSessionUser ทั้งคู่) ทำให้ removeChannel ของอันหนึ่ง
 * ไปทำลาย subscription ของอีกอัน
 */
function useUniqueChannelName(prefix: string, suffix?: string): string {
  const id = React.useId();
  return suffix
    ? `${prefix}__${suffix}__${id}`
    : `${prefix}__${id}`;
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
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const res = await fetch('/api/events', { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดข้อมูลงานไม่สำเร็จ');
  }
  return (data.events || []) as YPEvent[];
}

async function fetchEventById(id: string): Promise<YPEvent | null> {
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const res = await fetch(`/api/events/${id}/detail`, { credentials: 'same-origin' });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดข้อมูลงานไม่สำเร็จ');
  }
  return (data.event || null) as YPEvent | null;
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
  // ★ v3.9.9: อ่าน sessionStorage cache ตอน mount — ถ้ามี cache ให้ใช้แทน initialEvents
  //   ทำให้กลับเข้าหน้าเดิมเร็วขึ้น (instant render) แทนที่จะรอ fetch ใหม่
  //   cache หมดอายุใน 5 นาที (ตาม TTL ใน session-cache.ts)
  //   realtime subscription ยังคงทำงานปกติ — cache แค่ช่วย initial state
  const CACHE_KEY = 'events';
  const cachedEvents = getCached<YPEvent[]>(CACHE_KEY);
  const initialData = cachedEvents && cachedEvents.length > 0 ? cachedEvents : initialEvents;

  const [events, setEvents] = React.useState<YPEvent[]>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialEvents ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ
  //   empty array ที่ไม่คาดคิด (เช่น RLS บล็อกชั่วคราว)
  const initialEventsRef = React.useRef(initialEvents);

  // Stable reload function (does not depend on state)
  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEvents()
      .then((rows) => {
        // avoid race condition — only apply if still latest
        if (myToken === reloadTokenRef.current) {
          // v3.3.0 guard: ถ้า fetch สำเร็จแต่ส่งกลับ empty array ทันทีหลัง mount
          //   และ initialEvents มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน (อาจเป็น transient error)
          //   แต่ถ้าเป็น realtime update ที่ถูกต้อง (มี change) ให้ apply ปกติ
          if (
            rows.length === 0 &&
            initialEventsRef.current.length > 0 &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setEvents(rows);
            // ★ v3.9.9: เขียน cache ทุกครั้งที่ reload สำเร็จ
            //   ครั้งต่อไปที่ user กลับเข้าหน้านี้จะได้ข้อมูลล่าสุดเป็น initial state
            setCached(CACHE_KEY, rows);
          }
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

  // v1.8.2: Initial mount — reload() once to bypass Next.js RSC cache.
  //   ปัญหาเดิม: ถ้า user ไปหน้าอื่นแล้วย้อนกลับมาภายใน 30 วินาที
  //   Next.js จะใช้ cached RSC payload (initialEvents ตัวเก่า) แล้ว
  //   subscribe realtime — ถ้าไม่มี change ใหม่เกิดขึ้น user จะเห็น
  //   ข้อมูลเก่าตลอด → ต้อง reload() ทันทีหลัง mount เพื่อดึงข้อมูล
  //   ล่าสุดจาก DB (เสีย request 1 ครั้งต่อ navigation แต่ trade-off
  //   ที่ยอมรับได้เพื่อความถูกต้องของข้อมูล)
  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    // v1.8.3: ใช้ unique channel name เพื่อกัน conflict กับ hook อื่น
    const supabase = getClient();
    if (!supabase) return; // env var ไม่ครบ — ข้าม subscription, แค่อาศัย initial data

    let channel: any;
    try {
      channel = supabase
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
        // v1.8.2: event_members changes — คนเข้า/ออกงาน ต้อง reload
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_event_members' },
          () => reload()
        )
        // v1.8.2: council_users changes — คนเปลี่ยนชื่อ/สี/ฝ่าย ต้อง reload
        //         (assignees / members display ต้องอัพเดตตาม)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reload()
        )
        // v1.8.2: departments changes — admin เปลี่ยนชื่อ/สี/ไอคอนฝ่าย ต้อง reload
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeEvents] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore — channel อาจถูก remove ไปแล้ว
      }
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
  // ★ v3.9.9: อ่าน sessionStorage cache ตอน mount — ถ้ามี cache ให้ใช้แทน initialEvent
  //   cache key ขึ้นกับ eventId ของแต่ละงาน
  //   ทำให้กลับเข้าหน้า detail เดิมเร็วขึ้น (instant render)
  const CACHE_KEY = eventId ? `event:${eventId}` : null;
  const cachedEvent = CACHE_KEY ? getCached<YPEvent>(CACHE_KEY) : null;
  const initialData = cachedEvent ?? initialEvent;

  const [event, setEvent] = React.useState<YPEvent | null>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialEvent ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ
  //   null ที่ไม่คาดคิด (เช่น RLS บล็อกชั่วคราว)
  const initialEventRef = React.useRef(initialEvent);

  const reload = React.useCallback(() => {
    if (!eventId) return;
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEventById(eventId)
      .then((row) => {
        if (myToken === reloadTokenRef.current) {
          // v3.3.0 guard: ถ้า fetch สำเร็จแต่ส่งกลับ null ทันทีหลัง mount
          //   และ initialEvent มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน (อาจเป็น transient error)
          //   แต่ถ้าเป็น realtime update ที่ถูกต้อง (event ถูกลบ) ให้ apply ปกติ
          if (
            row === null &&
            initialEventRef.current !== null &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setEvent(row);
            // ★ v3.9.9: เขียน cache ทุกครั้งที่ reload สำเร็จ (ถ้า row ไม่ null)
            if (row && CACHE_KEY) {
              setCached(CACHE_KEY, row);
            }
          }
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
  }, [eventId, CACHE_KEY]);

  // v1.8.2: Initial mount — reload() once to bypass Next.js RSC cache.
  //   ถ้า user กลับเข้าหน้า detail ภายใน 30 วินาที Next.js จะใช้ cached
  //   payload → initialEvent ตัวเก่า → ต้อง reload เพื่อให้แน่ใจว่าข้อมูลสด
  React.useEffect(() => {
    if (eventId) reload();
  }, [eventId, reload]);

  React.useEffect(() => {
    if (!eventId) return;
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
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
        // v1.8.2: event_members changes — คนเข้า/ออกงานนี้
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_event_members' },
          () => reload()
        )
        // v1.8.2: council_users changes — assignee/member เปลี่ยนชื่อ/สี/ฝ่าย
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reload()
        )
        // v1.8.2: departments changes — admin เปลี่ยนฝ่ายของงานนี้
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeEventById] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
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
  // v3.3.0: เก็บ initialEvents ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ empty
  const initialEventsRef = React.useRef(initialEvents);

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
          // v3.3.0 guard: ถ้า filtered empty ทันทีหลัง mount และ initialEvents
          //   มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน (อาจเป็น transient error)
          if (
            filtered.length === 0 &&
            initialEventsRef.current.length > 0 &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setEvents(filtered);
          }
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

  // v1.8.2: Initial mount — reload() once to bypass Next.js RSC cache.
  React.useEffect(() => {
    if (dateStr) reload();
  }, [dateStr, reload]);

  React.useEffect(() => {
    if (!dateStr) return;
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
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
        // v1.8.2: event_members changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_event_members' },
          () => reload()
        )
        // v1.8.2: council_users changes — assignee/member เปลี่ยนชื่อ/สี
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reload()
        )
        // v1.8.2: departments changes — admin เปลี่ยนฝ่ายของงาน
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeEventsForDate] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
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
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
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
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel('ypwork-departments-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeDepartments] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
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
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const params = new URLSearchParams({ user_auth_uid: userAuthUid });
  if (departmentId) params.set('department_id', departmentId);
  const res = await fetch(`/api/profile/stats?${params.toString()}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดสถิติไม่สำเร็จ');
  }
  return data.stats as ProfileStats;
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
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
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
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeProfileStats] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
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
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
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

  // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
  const { data: users } = await supabase
    .from('council_users')
    .select('auth_uid, full_name')
    .in('auth_uid', actorIds);

  const userMap = new Map<string, { name: string; color: string }>();
  for (const u of users || []) {
    userMap.set(u.auth_uid, {
      name: u.full_name,
      color: getUserColor(u.auth_uid), // ★ v3.7.0: generated color
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
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel('ypwork-activity-log-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_activity_log' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeActivityLog] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
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
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
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
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel('ypwork-years-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_years' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeYears] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [reload]);

  return { years, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8.2 · useRealtimeDeptMembers — สมาชิกในฝ่ายแบบ live
// ใช้ใน: Today (dept overview — แสดง avatar group + จำนวนสมาชิก)
// เมื่อ admin เพิ่ม/ลบ/ย้ายคนเข้าฝ่าย → รายการสมาชิกอัพเดตทันที
//
// subscribe: council_users (filter by department_id) — แต่เนื่องจาก
//   Supabase Realtime filter รองรับเฉพาะ column ในตารางเดียวกัน
//   เราจึง subscribe ทุก council_users changes แล้ว reload (เหมือน hook อื่น ๆ)
// ═══════════════════════════════════════════════════════════════

async function fetchDeptMembers(departmentId: string): Promise<UserProfile[]> {
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const res = await fetch(`/api/departments/members?dept_id=${encodeURIComponent(departmentId)}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดสมาชิกฝ่ายไม่สำเร็จ');
  }
  return (data.members || []) as UserProfile[];
}

export function useRealtimeDeptMembers(
  departmentId: string | null,
  initialMembers: UserProfile[]
): {
  members: UserProfile[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [members, setMembers] = React.useState<UserProfile[]>(initialMembers);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialMembers ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ empty
  const initialMembersRef = React.useRef(initialMembers);

  const reload = React.useCallback(() => {
    if (!departmentId) {
      setMembers([]);
      return;
    }
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchDeptMembers(departmentId)
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          // v3.3.0 guard: ถ้า fetch สำเร็จแต่ส่งกลับ empty ทันทีหลัง mount
          //   และ initialMembers มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน
          if (
            rows.length === 0 &&
            initialMembersRef.current.length > 0 &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setMembers(rows);
          }
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดสมาชิกฝ่ายไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [departmentId]);

  // v1.8.2: Initial mount — reload to bypass RSC cache
  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    if (!departmentId) return;
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(`ypwork-dept-members-${departmentId}`)
        // any council_users change → reload (filter ไม่ได้เพราะอาจเป็น
        // การย้ายคนเข้า/ออกฝ่าย ที่ต้องการฝั่ง server กรองใหม่)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeDeptMembers] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [departmentId, reload]);

  return { members, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8.2 · useRealtimeSessionUser — ข้อมูล user ตัวเองแบบ live
// ใช้ใน: Today (hero name), Profile, AppShell (header avatar)
// เมื่อ admin เปลี่ยนชื่อ/สี/ฝ่าย/role ของ user → UI อัพเดตทันที
//
// subscribe: council_users กรองด้วย auth_uid ของตัวเอง
// ═══════════════════════════════════════════════════════════════

async function fetchSessionUserLive(authUid: string): Promise<Partial<SessionUser> | null> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
  // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
  const { data, error } = await supabase
    .from('council_users')
    .select('auth_uid, full_name, role, account_type, year, department_id')
    .eq('auth_uid', authUid)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    auth_uid: data.auth_uid,
    full_name: data.full_name,
    year: data.year ?? null,
    role: data.role ?? 'member',
    account_type: (data.account_type || 'student') as 'student' | 'teacher' | 'other',
    department_id: data.department_id ?? null,
    color: getUserColor(data.auth_uid), // ★ v3.7.0: generated color
  };
}

export function useRealtimeSessionUser(
  initialUser: SessionUser
): {
  user: SessionUser;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [user, setUser] = React.useState<SessionUser>(initialUser);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  // v1.8.3: unique channel name ต่อ hook instance — กัน conflict เวลา
  //   AppShell + TodayClient/ProfileView เรียก hook นี้พร้อมกัน (ปัญหาเดิม
  //   คือ 2 hooks ใช้ชื่อ channel เดียวกัน เวลา cleanup อันนึง removeChannel
  //   ไปทำลาย subscription ของอีกอัน)
  const channelName = useUniqueChannelName(
    'ypwork-session-user',
    initialUser.auth_uid
  );

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchSessionUserLive(initialUser.auth_uid)
      .then((live) => {
        if (myToken === reloadTokenRef.current && live) {
          // merge — เก็บ email จาก initial (ไม่ได้ select ตอน fetch live
          // เพราะ email อาจไม่ได้อยู่ใน council_users)
          setUser((prev) => ({ ...prev, ...live, email: prev.email }));
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [initialUser.auth_uid]);

  // v1.8.2: Initial mount — reload to bypass RSC cache
  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'council_users',
            filter: `auth_uid=eq.${initialUser.auth_uid}`,
          },
          () => reload()
        )
        // ถ้าฝ่ายของ user เปลี่ยนชื่อ/สี/ไอคอน → ต้อง reload ด้วย
        // (เพราะ color ใน SessionUser อาจมาจากฝ่าย)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeSessionUser] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [initialUser.auth_uid, channelName, reload]);

  return { user, loading, error, reload };
}

// ═══════════════════════════════════════════════════════════════
// v1.9.2 · useRealtimePendingRequest — สำหรับหน้า /pending-status (FIXED)
// ═══════════════════════════════════════════════════════════════
// subscribe การลงทะเบียนใน council_join_requests แบบ realtime
//   - ใช้ student_id (นักเรียน) หรือ email (ครู/อื่นๆ) เป็น filter
//   - เมื่อ row ถูก delete (admin อนุมัติหรือปฏิเสธ) →
//     ตรวจสอบว่า "approved" (council_users มี row) หรือ "rejected"
//   - คืน status: 'pending' | 'approved' | 'rejected' | 'unknown'
//
// ★ v1.9.2 CRITICAL FIX:
//   ก่อนหน้านี้ ระบบใช้ Supabase client (anon key) เพื่อ SELECT
//   council_join_requests แต่ RLS บล็อก anon users → คืน null
//   → ระบบตีความเป็น 'rejected' ทั้งที่จริงยัง 'pending' อยู่
//
//   ตอนนี้ใช้ server-side API (/api/auth/check-pending-status)
//   ที่ใช้ service role (bypass RLS) เพื่อตรวจสอบสถานะที่แน่นอน
//   - ถ้า row มีอยู่ใน council_join_requests = pending เสมอ
//   - ถ้าไม่มี row แต่ council_users มี row = approved
//   - ถ้าไม่มี row ทั้งคู่ = rejected (definitively)
//
// Realtime channel ยังใช้สำหรับ trigger reload (เมื่อมีการเปลี่ยนแปลง)
// แต่การตรวจสอบสถานะทำผ่าน server API เท่านั้น
// ═══════════════════════════════════════════════════════════════

export type PendingStatus = 'pending' | 'approved' | 'rejected' | 'unknown';

export interface UseRealtimePendingRequestParams {
  /** student_id (นักเรียน) หรือ null ถ้าเป็นครู/อื่นๆ */
  studentId: string | null;
  /** email (ครู/อื่นๆ) หรือ synthesized email (นักเรียน) */
  email: string | null;
  /** ประเภทบัญชี — ใช้ตัดสินใจว่าจะลอง signIn ด้วยอะไร */
  accountType: 'student' | 'teacher' | 'other';
  /** national_id (เฉพาะนักเรียน — ใช้ signIn เมื่อคำขอถูกอนุมัติ) */
  nationalId?: string | null;
}

export interface UseRealtimePendingRequestResult {
  /** สถานะปัจจุบันของคำขอ */
  status: PendingStatus;
  /** ข้อมูลคำขอ (ถ้ายัง pending) */
  request: {
    full_name: string;
    student_id: string | null;
    email: string | null;
    submitted_at: string | null;
  } | null;
  loading: boolean;
  error: string | null;
}

/**
 * v1.9.2: เรียก server API เพื่อตรวจสอบสถานะแบบ definitive
 * ใช้ service role (bypass RLS) — ไม่ต้อง login ก็ตรวจได้
 *
 * Returns:
 *   - { status: 'pending', request: {...} } — ยังรออนุมัติ
 *   - { status: 'approved', user: {...} } — อนุมัติแล้ว
 *   - { status: 'rejected' } — ถูกปฏิเสธ/ไม่พบ
 *   - { status: 'unknown' } — API error หรือ input ไม่ครบ
 */
async function checkPendingStatusViaServer(
  studentId: string | null,
  email: string | null
): Promise<{
  status: PendingStatus;
  request: { full_name: string; student_id: string | null; email: string | null; submitted_at: string | null } | null;
}> {
  if (!studentId && !email) {
    return { status: 'unknown', request: null };
  }

  try {
    const params = new URLSearchParams();
    if (studentId) params.set('student_id', studentId);
    else if (email) params.set('email', email);

    const res = await fetch(`/api/auth/check-pending-status?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      console.error('[checkPendingStatusViaServer] HTTP error:', res.status);
      return { status: 'unknown', request: null };
    }

    const data = await res.json();

    if (data.status === 'pending' && data.request) {
      return {
        status: 'pending',
        request: {
          full_name: data.request.full_name,
          student_id: data.request.student_id ?? null,
          email: data.request.email ?? null,
          submitted_at: data.request.submitted_at ?? null,
        },
      };
    }

    if (data.status === 'approved') {
      return { status: 'approved', request: null };
    }

    if (data.status === 'rejected') {
      return { status: 'rejected', request: null };
    }

    // error อื่น ๆ — ถือว่า unknown (ไม่ตีความเป็น rejected)
    return { status: 'unknown', request: null };
  } catch (err) {
    console.error('[checkPendingStatusViaServer] fetch failed:', err);
    return { status: 'unknown', request: null };
  }
}

export function useRealtimePendingRequest(
  params: UseRealtimePendingRequestParams
): UseRealtimePendingRequestResult {
  const { studentId, email, accountType, nationalId } = params;
  const [status, setStatus] = React.useState<PendingStatus>('pending');
  const [request, setRequest] = React.useState<UseRealtimePendingRequestResult['request']>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const channelName = useUniqueChannelName('ypwork-pending-request', studentId || email || 'anon');

  // v1.9.2: reload ใช้ server API แทนการ query DB ตรง ๆ
  //   - server API ใช้ service role (bypass RLS) → ได้ผลที่แน่นอน
  //   - ถ้า row มีอยู่ → pending (เสมอ)
  //   - ถ้า row ไม่มี → approved หรือ rejected (ตามที่ council_users บอก)
  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkPendingStatusViaServer(studentId, email);
      setStatus(result.status);
      setRequest(result.request);
    } catch (e: any) {
      setError(e?.message || 'โหลดสถานะไม่สำเร็จ');
      // ถ้า fetch ไม่ได้ ไม่ตีความเป็น rejected — ถือว่า unknown
      setStatus('unknown');
    } finally {
      setLoading(false);
    }
  }, [studentId, email]);

  // Initial load
  React.useEffect(() => {
    reload();
  }, [reload]);

  // Realtime subscription — ฟัง council_join_requests changes
  // เมื่อมีการเปลี่ยนแปลง (insert/update/delete) → reload เพื่อตรวจสอบสถานะใหม่
  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return; // env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_join_requests' },
          () => {
            // reload ผ่าน server API เพื่อตรวจสอบสถานะใหม่
            reload();
          }
        )
        // ถ้า council_users มี row ใหม่ (admin อนุมัติ) → reload เพื่อตรวจ
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'council_users' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      console.error('[useRealtimePendingRequest] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [channelName, reload]);

  return { status, request, loading, error };
}

// ═══════════════════════════════════════════════════════════════
// v1.9.1 · useRealtimePendingRequests — สำหรับหน้า admin
// ═══════════════════════════════════════════════════════════════
// subscribe รายการการลงทะเบียนทั้งหมดใน council_join_requests แบบ realtime
//   - ใช้สำหรับ admin view (เมื่อมีคำขอใหม่/ถูกอนุมัติ/ถูกปฏิเสธ → list อัพเดตทันที)
//   - ฝั่ง client ใช้ getPendingRequests() จาก lib/db/pending-requests
//   - RLS อนุญาต authenticated SELECT
//
// ใช้งาน:
//   const { requests, loading, error, reload } = useRealtimePendingRequests();
// ═══════════════════════════════════════════════════════════════

export interface UseRealtimePendingRequestsResult {
  requests: PendingRequestAdminItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export interface PendingRequestAdminItem {
  id: string;
  full_name: string;
  student_id: string;
  year: number | null;
  email: string;
  message: string | null;
  account_type: 'student' | 'teacher' | 'other';
  national_id: string | null;
  department_id: string | null;
  created_at: string;
}

async function fetchAllPendingRequests(): Promise<PendingRequestAdminItem[]> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');

  const { data, error } = await supabase
    .from('council_join_requests')
    .select(
      'id, full_name, student_id, year, email, message, account_type, national_id, department_id, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as PendingRequestAdminItem[]) || [];
}

export function useRealtimePendingRequests(): UseRealtimePendingRequestsResult {
  const [requests, setRequests] = React.useState<PendingRequestAdminItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const channelName = useUniqueChannelName('ypwork-pending-requests-admin', 'all');

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    setError(null);
    fetchAllPendingRequests()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setRequests(rows);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดรายการคำขอไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, []);

  // Initial load
  React.useEffect(() => {
    reload();
  }, [reload]);

  // Realtime subscription — ฟัง council_join_requests changes + council_users INSERT
  // (เมื่อ admin อนุมัติคำขอ → row ใน council_join_requests จะถูก delete → reload)
  // (เมื่อมีคำขอใหม่ → row INSERT → reload)
  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_join_requests' },
          () => reload()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'council_users' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      console.error('[useRealtimePendingRequests] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [channelName, reload]);

  return { requests, loading, error, reload };
}

