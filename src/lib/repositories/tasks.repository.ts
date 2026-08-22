// ═══════════════════════════════════════════════════════════════
// YP WORK · Repository · Tasks (Round 22)
// ═══════════════════════════════════════════════════════════════
// Data access layer for tasks.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task, UserProfile } from '@/lib/types';
import { TASK_FIELDS, normalizeUserProfile } from './normalize';
import { getUserColor } from '@/lib/utils/user-color';

export interface CreateTaskData {
  event_id: string;
  title: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  start_time: string | null;
  estimated_time: string;
  notes: string;
  tags: string[];
  sort_order: number;
}

/** Create a task within an event, returns the created task */
export async function create(
  supabase: SupabaseClient,
  data: CreateTaskData
): Promise<{ task: Task | null; error: string | null }> {
  const { data: taskRow, error } = await supabase
    .from('ypwork_tasks')
    .insert({
      event_id: data.event_id,
      title: data.title,
      priority: data.priority,
      due_date: data.due_date,
      start_date: data.start_date,
      start_time: data.start_time,
      estimated_time: data.estimated_time,
      notes: data.notes,
      tags: data.tags,
      sort_order: data.sort_order,
    })
    .select(TASK_FIELDS)
    .limit(1)
    .maybeSingle();

  if (error || !taskRow) {
    return { task: null, error: error?.message ?? 'unknown' };
  }

  return {
    task: {
      ...taskRow,
      due_date: taskRow.due_date ?? null,
      start_time: taskRow.start_time ?? null,
      start_date: taskRow.start_date ?? null,
      estimated_time: taskRow.estimated_time ?? '',
      notes: taskRow.notes ?? '',
      tags: Array.isArray(taskRow.tags) ? taskRow.tags : [],
      sort_order: taskRow.sort_order ?? 0,
      assignees: [],
    } as Task,
    error: null,
  };
}

/** Assign a user to a task (replaces all existing assignees) */
export async function setAssignee(
  supabase: SupabaseClient,
  taskId: string,
  assigneeAuthUid: string | null
): Promise<{ error: string | null }> {
  // Delete existing assignees
  const { error: delErr } = await supabase
    .from('ypwork_task_assignees')
    .delete()
    .eq('task_id', taskId);
  if (delErr) return { error: delErr.message };

  if (assigneeAuthUid) {
    const { error: insErr } = await supabase
      .from('ypwork_task_assignees')
      .insert({ task_id: taskId, user_auth_uid: assigneeAuthUid });
    if (insErr) return { error: insErr.message };
  }

  return { error: null };
}

/** Get assignee profiles for a task */
export async function getAssignees(
  supabase: SupabaseClient,
  taskId: string
): Promise<UserProfile[]> {
  const { data: assignees } = await supabase
    .from('ypwork_task_assignees')
    .select('user_auth_uid')
    .eq('task_id', taskId);

  const uids = Array.from(
    new Set((assignees || []).map((a: any) => a.user_auth_uid))
  );
  if (uids.length === 0) return [];

  const { data: users } = await supabase
    .from('council_users')
    .select('auth_uid, full_name, role, account_type, year, department_id')
    .in('auth_uid', uids);

  return (users || []).map(normalizeUserProfile);
}

/** Update a task */
export async function update(
  supabase: SupabaseClient,
  taskId: string,
  data: Record<string, any>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ypwork_tasks')
    .update(data)
    .eq('id', taskId);
  return { error: error?.message ?? null };
}

/** Delete a task (cascade deletes assignees via FK) */
export async function remove(
  supabase: SupabaseClient,
  taskId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ypwork_tasks')
    .delete()
    .eq('id', taskId);
  return { error: error?.message ?? null };
}

/** Get next sort_order for a new task in an event */
export async function getNextSortOrder(
  supabase: SupabaseClient,
  eventId: string
): Promise<number> {
  const { count } = await supabase
    .from('ypwork_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  return count ?? 0;
}
