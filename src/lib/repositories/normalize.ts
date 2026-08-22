// ═══════════════════════════════════════════════════════════════
// YP WORK · Repository · Normalize (Round 22)
// ═══════════════════════════════════════════════════════════════
// Single source of truth for data normalization.
// Consolidates 3 previous copies: event-loader.ts (server),
// normalize.ts (client), inline in detail/route.ts (server).
//
// Used by: repositories (server-side), real-time hooks (client-side).
// Safe for both server and client — no server-only imports.
// ═══════════════════════════════════════════════════════════════

import type { YPEvent, Task, Department, UserProfile } from '@/lib/types';
import { getUserColor } from '@/lib/utils/user-color';

// ── Field projections (shared across repositories) ─────────────

export const EVENT_FIELDS = `
  id, type, title, date, start_date, end_date, time, location, description,
  department_id, color, created_by, created_at, updated_at,
  department:departments ( id, name, color, icon, description ),
  tasks:ypwork_tasks (
    id, event_id, title, due_date, start_date, start_time, priority,
    estimated_time, notes, tags, sort_order, created_at, updated_at
  )
`;

export const TASK_FIELDS = `
  id, event_id, title, due_date, start_date, start_time, priority,
  estimated_time, notes, tags, sort_order, created_at, updated_at
`;

export const USER_FIELDS = `
  auth_uid, full_name, role, account_type, year, department_id
`;

// ── Normalizers ────────────────────────────────────────────────

export function normalizeUserProfile(u: any): UserProfile {
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
    color: getUserColor(u.auth_uid),
  };
}

export function normalizeTask(t: any, assigneesMap?: Map<string, UserProfile[]>): Task {
  return {
    id: t.id,
    event_id: t.event_id,
    title: t.title,
    due_date: t.due_date ?? null,
    start_time: t.start_time ?? null,
    start_date: t.start_date ?? null,
    priority: t.priority,
    estimated_time: t.estimated_time ?? '',
    notes: t.notes ?? '',
    tags: Array.isArray(t.tags) ? t.tags : [],
    sort_order: t.sort_order ?? 0,
    created_at: t.created_at,
    updated_at: t.updated_at,
    assignees: assigneesMap?.get(t.id) ?? (Array.isArray(t.assignees) ? t.assignees : []),
  };
}

export function normalizeEvent(
  e: any,
  assigneesMap?: Map<string, UserProfile[]>
): YPEvent {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date ?? null,
    start_date: e.start_date ?? null,
    end_date: e.end_date ?? null,
    time: e.time ?? '',
    location: e.location ?? '',
    description: e.description ?? '',
    department_id: e.department_id ?? null,
    color: e.color ?? '#4F46E5',
    created_by: e.created_by ?? null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    department: e.department
      ? Array.isArray(e.department)
        ? (e.department[0] as Department)
        : (e.department as Department)
      : null,
    tasks: (Array.isArray(e.tasks) ? e.tasks : []).map((t: any) =>
      normalizeTask(t, assigneesMap)
    ),
  };
}

// ── Assignees Map Builder ──────────────────────────────────────

export function buildAssigneesMap(
  assigneesRaw: any[] | null,
  usersRaw: any[] | null
): Map<string, UserProfile[]> {
  const usersMap = new Map<string, UserProfile>();
  for (const u of usersRaw || []) {
    usersMap.set(u.auth_uid, normalizeUserProfile(u));
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

export function normalizeDepartment(d: any): Department {
  return {
    id: d.id,
    name: d.name,
    color: d.color,
    icon: d.icon,
    description: d.description,
  };
}
