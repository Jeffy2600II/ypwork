// ═══════════════════════════════════════════════════════════════
// YP WORK · Auth · Resource Ownership (Round 22)
// ═══════════════════════════════════════════════════════════════
// Fetches ownership info for resource-level authorization checks.
// Queries use adminClient (service role) to bypass RLS for the
// ownership lookup — the authorization decision is then made in
// application code via permissions.ts.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResourceOwnership } from './permissions';

/** Fetch event ownership info (created_by, department_id) */
export async function getEventOwnership(
  adminClient: SupabaseClient,
  eventId: string
): Promise<ResourceOwnership | null> {
  const { data, error } = await adminClient
    .from('ypwork_events')
    .select('created_by, department_id')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    created_by: data.created_by,
    department_id: data.department_id,
  };
}

/**
 * Fetch task ownership info — includes the event's created_by
 * and the task's assignees, so permissions.ts can make the
 * Creator + Assignee + Admin decision.
 */
export async function getTaskOwnership(
  adminClient: SupabaseClient,
  taskId: string
): Promise<ResourceOwnership | null> {
  // Get task → event_id
  const { data: task, error: taskErr } = await adminClient
    .from('ypwork_tasks')
    .select('id, event_id')
    .eq('id', taskId)
    .maybeSingle();

  if (taskErr || !task) return null;

  // Get event → created_by (parallel with assignees)
  const [eventResult, assigneesResult] = await Promise.all([
    adminClient
      .from('ypwork_events')
      .select('created_by')
      .eq('id', task.event_id)
      .maybeSingle(),
    adminClient
      .from('ypwork_task_assignees')
      .select('user_auth_uid')
      .eq('task_id', taskId),
  ]);

  if (eventResult.error || !eventResult.data) return null;

  return {
    created_by: eventResult.data.created_by,
    assignees: (assigneesResult.data || []).map(
      (a: any) => a.user_auth_uid
    ),
  };
}
