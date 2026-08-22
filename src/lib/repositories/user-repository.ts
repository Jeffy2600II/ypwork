// ═══════════════════════════════════════════════════════════════
// YP WORK · Repositories · User Repository (Round 24)
// ═══════════════════════════════════════════════════════════════
// Data access layer for user-related queries (council_users).
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserColor } from '@/lib/utils/user-color';
import type { UserProfile } from '@/lib/types';

export const userRepository = {
  /**
   * Find all approved, active users (for assignee dropdowns etc.).
   */
  async findApproved(client: SupabaseClient): Promise<UserProfile[]> {
    const { data, error } = await client
      .from('council_users')
      .select('auth_uid, full_name, role, account_type, year, department_id')
      .eq('approved', true)
      .eq('disabled', false);

    if (error) return [];

    return (data || []).map((u: any) => ({
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
    }));
  },

  /**
   * Get a user's profile stats (department events count + assigned tasks count).
   */
  async getProfileStats(
    client: SupabaseClient,
    userAuthUid: string,
    departmentId: string | null
  ): Promise<{ deptEvents: number; myTasks: number }> {
    const [deptEventsResult, myAssigneesResult] = await Promise.all([
      departmentId
        ? client
            .from('ypwork_events')
            .select('id', { count: 'exact', head: true })
            .eq('department_id', departmentId)
        : Promise.resolve({ count: 0, data: null, error: null }),
      client
        .from('ypwork_task_assignees')
        .select('task_id')
        .eq('user_auth_uid', userAuthUid),
    ]);

    const deptEvents = (deptEventsResult as any).count || 0;
    const myTaskIds = ((myAssigneesResult.data as any[]) || []).map((a) => a.task_id);
    let myTasks = 0;

    if (myTaskIds.length > 0) {
      const { data: myTasksRaw } = await client
        .from('ypwork_tasks')
        .select('id')
        .in('id', myTaskIds);
      myTasks = myTasksRaw?.length || 0;
    }

    return { deptEvents, myTasks };
  },
};
