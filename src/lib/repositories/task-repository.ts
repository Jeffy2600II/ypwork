// ═══════════════════════════════════════════════════════════════
// YP WORK · Repositories · Task Repository (Round 24)
// ═══════════════════════════════════════════════════════════════
// Data access layer for tasks (sub-items of events).
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserColor } from '@/lib/utils/user-color';
import type { TaskPriority } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────

export interface TaskCreateInput {
  event_id: string;
  title: string;
  priority: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  estimated_time?: string;
  notes?: string;
  tags?: string[];
  sort_order: number;
}

export interface TaskUpdateInput {
  title?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  estimated_time?: string;
  notes?: string;
  tags?: string[];
}

export interface TaskWithAssignees {
  id: string;
  event_id: string;
  title: string;
  due_date: string | null;
  start_date: string | null;
  start_time: string | null;
  priority: TaskPriority;
  estimated_time: string;
  notes: string;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignees: any[];
}

// ── Repository ────────────────────────────────────────────────

export const taskRepository = {
  /**
   * Create a task under an event.
   */
  async create(
    client: SupabaseClient,
    input: TaskCreateInput
  ): Promise<{ data: TaskWithAssignees | null; error: string | null }> {
    const { data, error } = await client
      .from('ypwork_tasks')
      .insert({
        event_id: input.event_id,
        title: input.title,
        priority: input.priority,
        due_date: input.due_date ?? null,
        start_date: input.start_date ?? null,
        start_time: input.start_time ?? null,
        estimated_time: input.estimated_time ?? '',
        notes: input.notes ?? '',
        tags: input.tags ?? [],
        sort_order: input.sort_order,
      })
      .select(
        'id, event_id, title, due_date, start_date, start_time, priority, estimated_time, notes, tags, sort_order, created_at, updated_at'
      )
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unknown error' };
    }

    return {
      data: { ...data, assignees: [] } as TaskWithAssignees,
      error: null,
    };
  },

  /**
   * Update a task by ID.
   */
  async update(
    client: SupabaseClient,
    id: string,
    update: TaskUpdateInput
  ): Promise<string | null> {
    const { error } = await client
      .from('ypwork_tasks')
      .update(update)
      .eq('id', id);

    return error?.message ?? null;
  },

  /**
   * Delete a task by ID.
   * FK ON DELETE CASCADE removes assignees automatically.
   */
  async delete(client: SupabaseClient, id: string): Promise<string | null> {
    const { error } = await client.from('ypwork_tasks').delete().eq('id', id);

    return error?.message ?? null;
  },

  /**
   * Count tasks for an event (used for sort_order assignment).
   */
  async countByEvent(client: SupabaseClient, eventId: string): Promise<number> {
    const { count } = await client
      .from('ypwork_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    return count ?? 0;
  },

  /**
   * Set assignee for a task (replaces all existing assignees).
   */
  async setAssignee(
    client: SupabaseClient,
    taskId: string,
    assigneeId: string | null
  ): Promise<string | null> {
    // Delete existing assignees
    const { error: delErr } = await client
      .from('ypwork_task_assignees')
      .delete()
      .eq('task_id', taskId);

    if (delErr) return delErr.message;

    if (assigneeId) {
      const { error: insErr } = await client
        .from('ypwork_task_assignees')
        .insert({ task_id: taskId, user_auth_uid: assigneeId });

      if (insErr) return insErr.message;
    }

    return null;
  },

  /**
   * Fetch assignee profile for a task.
   */
  async fetchAssigneeProfile(
    client: SupabaseClient,
    authUid: string
  ): Promise<any | null> {
    const { data } = await client
      .from('council_users')
      .select('auth_uid, full_name, role, account_type, year, department_id')
      .eq('auth_uid', authUid)
      .maybeSingle();

    if (!data) return null;

    return {
      auth_uid: data.auth_uid,
      full_name: data.full_name,
      student_id: null,
      national_id: null,
      year: data.year ?? null,
      role: data.role ?? 'member',
      account_type: (data.account_type || 'student') as 'student' | 'teacher' | 'other',
      approved: true,
      disabled: false,
      email: '',
      department_id: data.department_id ?? null,
      color: getUserColor(data.auth_uid),
    };
  },
};
