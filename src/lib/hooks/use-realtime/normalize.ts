'use client';

/**
 * ============================================================
 * YP WORK - Realtime - Normalizers (r48)
 * ============================================================
 * แปลง raw rows จาก Supabase ให้เป็น typed objects (YPEvent, Task)
 * + EVENT_FIELDS: list of columns to SELECT (shared between hooks)
 * ============================================================
 */

import type { YPEvent, Task, Department } from '@/lib/types';

type RawEvent = any;
type RawTask = any;

export function normalizeEvent(e: RawEvent): YPEvent {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date ?? null,   // ★ r51: nullable สำหรับ group type
    start_date: e.start_date ?? null,
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

export function normalizeTask(t: RawTask): Task {
  return {
    id: t.id,
    event_id: t.event_id,
    title: t.title,
    due_date: t.due_date ?? null,
    start_time: t.start_time ?? null,
    start_date: t.start_date ?? null,
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

// Fields to SELECT for events (shared between fetchEvents and realtime reload)
export const EVENT_FIELDS = `
  id, type, title, date, start_date, end_date, time, location, description,
  department_id, status, color, created_by, created_at, updated_at,
  department:departments ( id, name, color, icon, description ),
  tasks:ypwork_tasks (
    id, event_id, title, due_date, start_date, start_time, status, priority,
    estimated_time, notes, tags, sort_order, created_at, updated_at
  )
`;
