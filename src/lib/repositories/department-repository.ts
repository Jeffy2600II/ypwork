// ═══════════════════════════════════════════════════════════════
// YP WORK · Repositories · Department Repository (Round 24)
// ═══════════════════════════════════════════════════════════════
// Data access layer for departments.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserColor } from '@/lib/utils/user-color';
import type { Department, UserProfile } from '@/lib/types';

export const departmentRepository = {
  /**
   * Find all departments, ordered by name.
   */
  async findAll(client: SupabaseClient): Promise<Department[]> {
    const { data, error } = await client
      .from('departments')
      .select('id, name, color, icon, description')
      .order('name', { ascending: true });

    if (error) return [];

    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      icon: d.icon,
      description: d.description,
    }));
  },

  /**
   * Find members of a department (approved + not disabled).
   */
  async findMembers(client: SupabaseClient, deptId: string): Promise<UserProfile[]> {
    const { data, error } = await client
      .from('council_users')
      .select('auth_uid, full_name, role, account_type, year, department_id')
      .eq('department_id', deptId)
      .eq('approved', true)
      .eq('disabled', false)
      .limit(20);

    if (error) return [];

    return (data || []).map((m: any) => ({
      auth_uid: m.auth_uid,
      full_name: m.full_name,
      student_id: null,
      national_id: null,
      year: m.year ?? null,
      role: m.role ?? 'member',
      account_type: (m.account_type || 'student') as 'student' | 'teacher' | 'other',
      approved: true,
      disabled: false,
      email: '',
      department_id: m.department_id ?? null,
      color: getUserColor(m.auth_uid),
    }));
  },
};
