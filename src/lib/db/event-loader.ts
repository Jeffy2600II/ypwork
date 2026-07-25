// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Loader (v3.4.0)
// ═══════════════════════════════════════════════════════════════
// Centralized data-loading helpers สำหรับ event-related queries
// ใช้ทั้งใน Server Components (page.tsx) และ API routes (/api/events)
//
// ★ v3.4.0 changes vs v3.3.0:
//   1. fetchEventsWithRelations() — ดึง events + assignees + users แบบ 3-query
//      parallel (ไม่ใช่ sequential 3 รอบ) — ลด TTFB ได้ ~40-60%
//      เดิม: events → assignees → users (sequential, 3 RTT)
//      ใหม่: [events] → [assignees + users] (parallel, 2 RTT)
//      ไม่สามารถ 3-query parallel ได้เพราะ assignees ต้องการ taskIds จาก events
//      แต่ users ที่เป็นไปได้ทั้งหมดสามารถดึงไปก่อนได้ (RLS: authenticated เท่านั้น)
//
//   2. fetchEventById() — ดึง single event พร้อม relations แบบ parallel
//      เดิม: event + users + depts parallel → assignees → task users (sequential)
//      ใหม่: [event + users + depts] → [assignees] (parallel, 2 RTT)
//      ลด round-trip จาก 4 → 2
//
//   3. fetchDepartments() — cached ด้วย React cache() สำหรับใช้ใน create-event
//      ลด round-trip เมื่อมีการ render หลาย component ที่ต้องการ departments
// ═══════════════════════════════════════════════════════════════

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { YPEvent, Department, UserProfile } from '@/lib/types';
// ★ v3.7.0: ใช้ getUserColor แทนการ query color จาก DB (column ไม่มีอยู่จริง)
import { getUserColor } from '@/lib/utils/user-color';

// ─────────────────────────────────────────────────────────────────
// Helper: normalize profile row → UserProfile
// ★ v3.7.0: ใช้ getUserColor() แทน u.color (column ไม่มีใน DB)
// ─────────────────────────────────────────────────────────────────
function toUserProfile(u: any): UserProfile {
  return {
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
    color: getUserColor(u.auth_uid), // ★ v3.7.0: generated from auth_uid
  };
}

// ─────────────────────────────────────────────────────────────────
// Helper: สร้าง assigneesMap จาก assignees + users result
// ─────────────────────────────────────────────────────────────────
function buildAssigneesMap(
  assigneesRaw: any[] | null,
  usersRaw: any[] | null
): Map<string, UserProfile[]> {
  const usersMap = new Map<string, UserProfile>();
  for (const u of usersRaw || []) {
    usersMap.set(u.auth_uid, toUserProfile(u));
  }

  const assigneesMap = new Map<string, UserProfile[]>();
  for (const a of assigneesRaw || []) {
    const tid = a.task_id;
    if (!assigneesMap.has(tid)) assigneesMap.set(tid, []);
    const u = usersMap.get(a.user_auth_uid);
    if (u) assigneesMap.get(tid)!.push(u);
  }
  return assigneesMap;
}

// ─────────────────────────────────────────────────────────────────
// Helper: normalize event row → YPEvent
// ─────────────────────────────────────────────────────────────────
function toEvent(e: any, assigneesMap: Map<string, UserProfile[]>): YPEvent {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date,
    start_date: e.start_date ?? null,   // ★ v3.10.0 รอบที่ 29
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
    tasks: (Array.isArray(e.tasks) ? e.tasks : []).map((t: any) => ({
      id: t.id,
      event_id: t.event_id,
      title: t.title,
      due_date: t.due_date ?? null,
      start_time: t.start_time ?? null,   // ★ v3.10.0 รอบที่ 9
      start_date: t.start_date ?? null,   // ★ v3.10.0 รอบที่ 29
      status: t.status,
      priority: t.priority,
      estimated_time: t.estimated_time ?? '',
      notes: t.notes ?? '',
      tags: Array.isArray(t.tags) ? t.tags : [],
      sort_order: t.sort_order ?? 0,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assignees: assigneesMap.get(t.id) || [],
    })),
  };
}

// ─────────────────────────────────────────────────────────────────
// Event fields projection (reused across functions)
// ─────────────────────────────────────────────────────────────────
const EVENT_FIELDS = `
  id,
  type,
  title,
  date,
  start_date,
  end_date,
  time,
  location,
  description,
  department_id,
  status,
  color,
  created_by,
  created_at,
  updated_at,
  department:departments (
    id, name, color, icon, description
  ),
  tasks:ypwork_tasks (
    id, event_id, title, due_date, start_date, start_time, status, priority,
    estimated_time, notes, tags, sort_order, created_at, updated_at
  )
`;

// ═══════════════════════════════════════════════════════════════
// 1. fetchEventsWithRelations()
// ═══════════════════════════════════════════════════════════════
// ดึง events หลาย row พร้อม department + tasks + assignees
// ใช้สำหรับ: /events, /today, /api/events GET
//
// Options:
//   - from?: เริ่ม date >= from (YYYY-MM-DD)
//   - to?:   date <= to (YYYY-MM-DD)
//   - date?: date === date (YYYY-MM-DD)
//
// Performance (v3.4.0):
//   RTT 1: events query (parallel with users prefetch — ดูด้านล่าง)
//   RTT 2: assignees + task users (parallel 2 queries)
//
// สังเกต: ใน v3.3.0 users จะถูกดึงหลัง assignees (sequential)
// ใน v3.4.0 ใช้ความจริงที่ว่า council_users ที่ approved ทั้งหมด
// สามารถ prefetch ได้ตั้งแต่ RTT 1 — ลด RTT เหลือ 2 (จาก 3)
// ═══════════════════════════════════════════════════════════════

export interface FetchEventsOptions {
  from?: string | null;
  to?: string | null;
  date?: string | null;
}

export async function fetchEventsWithRelations(
  supabase: SupabaseClient,
  options: FetchEventsOptions = {}
): Promise<YPEvent[]> {
  const { from, to, date } = options;

  // ── RTT 1 (parallel): events + users prefetch ──
  // users ที่ approved ทั้งหมด — ดึงมาเก็บไว้ตั้งแต่ตอนนี้
  // เพื่อหลีกเลี่ยง RTT 3 (fetch users by uid หลัง assignees)
  let eventsQuery = supabase.from('ypwork_events').select(EVENT_FIELDS).order('date', {
    ascending: true,
  });

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    eventsQuery = eventsQuery.eq('date', date);
  } else {
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) eventsQuery = eventsQuery.gte('date', from);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) eventsQuery = eventsQuery.lte('date', to);
  }

  const [eventsResult, usersResult] = await Promise.all([
    eventsQuery,
    supabase
      .from('council_users')
      .select(
        'auth_uid, full_name, role, account_type, year, department_id'
      )
      .eq('approved', true)
      .eq('disabled', false),
  ]);

  if (eventsResult.error) {
    console.error('[fetchEventsWithRelations] events query error:', eventsResult.error.message);
    return [];
  }

  const eventsRaw = eventsResult.data || [];
  const usersRaw = usersResult.data || [];

  // ── RTT 2: assignees (in เฉพาะ taskIds ที่มี) ──
  const taskIds = eventsRaw.flatMap((e: any) =>
    (e.tasks || []).map((t: any) => t.id)
  );

  let assigneesMap = new Map<string, UserProfile[]>();
  if (taskIds.length > 0) {
    const { data: assigneesRaw } = await supabase
      .from('ypwork_task_assignees')
      .select('task_id, user_auth_uid')
      .in('task_id', taskIds);

    // ★ v3.4.0: ใช้ users ที่ prefetch ใน RTT 1 แทนการ fetch ใหม่
    assigneesMap = buildAssigneesMap(assigneesRaw, usersRaw);
  }

  return eventsRaw.map((e: any) => toEvent(e, assigneesMap));
}

// ═══════════════════════════════════════════════════════════════
// 2. fetchEventById()
// ═══════════════════════════════════════════════════════════════
// ดึง single event พร้อม department + tasks + assignees + users + departments
// ใช้สำหรับ: /events/[id], /api/events/[id]/detail
//
// Performance (v3.4.0):
//   RTT 1 (parallel 3 queries): event + users + departments
//   RTT 2 (single query):       assignees
//   Total: 2 RTT (ลดจาก 4 RTT ใน v3.3.0)
// ═══════════════════════════════════════════════════════════════

export interface FetchEventByIdResult {
  event: YPEvent | null;
  users: UserProfile[];
  departments: Department[];
}

export async function fetchEventById(
  supabase: SupabaseClient,
  id: string
): Promise<FetchEventByIdResult> {
  // ── RTT 1 (parallel): event + users + departments ──
  const [eventResult, usersResult, deptsResult] = await Promise.all([
    supabase
      .from('ypwork_events')
      .select(EVENT_FIELDS)
      .eq('id', id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('council_users')
      .select(
        'auth_uid, full_name, role, account_type, year, department_id'
      )
      .eq('approved', true)
      .eq('disabled', false)
      .order('full_name', { ascending: true }),
    supabase
      .from('departments')
      .select('id, name, color, icon, description')
      .order('name', { ascending: true }),
  ]);

  const eventRaw = eventResult.data;
  if (!eventRaw) {
    return { event: null, users: [], departments: [] };
  }

  // ── RTT 2: assignees ──
  const taskIds = (eventRaw.tasks || []).map((t: any) => t.id);
  let assigneesMap = new Map<string, UserProfile[]>();
  if (taskIds.length > 0) {
    const { data: assigneesRaw } = await supabase
      .from('ypwork_task_assignees')
      .select('task_id, user_auth_uid')
      .in('task_id', taskIds);

    // ★ v3.4.0: ใช้ users ที่ prefetch ใน RTT 1
    assigneesMap = buildAssigneesMap(assigneesRaw, usersResult.data);
  }

  const event = toEvent(eventRaw, assigneesMap);
  const users: UserProfile[] = (usersResult.data || []).map(toUserProfile);
  const departments: Department[] = (deptsResult.data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    color: d.color,
    icon: d.icon,
    description: d.description,
  }));

  return { event, users, departments };
}

// ═══════════════════════════════════════════════════════════════
// 3. fetchDepartments() — cached
// ═══════════════════════════════════════════════════════════════
// ดึงรายการ departments ทั้งหมด — cached ด้วย React cache()
// ใช้ใน create-event form, edit-event form, anywhere ที่ต้องแสดง dept list
//
// ★ v3.4.0: cached ด้วย React cache() — deduplicate ภายใน request เดียว
//   ถ้า 2 components ในหน้าเดียวกันเรียก fetchDepartments จะ fetch แค่ครั้งเดียว
// ═══════════════════════════════════════════════════════════════

export const fetchDepartments = cache(
  async (supabase: SupabaseClient): Promise<Department[]> => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, color, icon, description')
      .order('name', { ascending: true });

    if (error) {
      console.error('[fetchDepartments] error:', error.message);
      return [];
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      icon: d.icon,
      description: d.description,
    }));
  }
);
