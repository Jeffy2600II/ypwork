// ═══════════════════════════════════════════════════════════════
// YP WORK · Repository · Users (Round 22)
// ═══════════════════════════════════════════════════════════════
// Data access layer for user-related queries.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';
import { normalizeUserProfile, USER_FIELDS } from './normalize';

/** Fetch all approved, non-disabled users */
export async function findApproved(
  supabase: SupabaseClient
): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('council_users')
    .select(USER_FIELDS)
    .eq('approved', true)
    .eq('disabled', false)
    .order('full_name', { ascending: true });

  if (error || !data) return [];
  return data.map(normalizeUserProfile);
}

/** Fetch members of a specific department */
export async function findByDepartment(
  supabase: SupabaseClient,
  deptId: string
): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('council_users')
    .select(USER_FIELDS)
    .eq('department_id', deptId)
    .eq('approved', true)
    .eq('disabled', false)
    .limit(20);

  if (error || !data) return [];
  return data.map(normalizeUserProfile);
}

/** Fetch a single user by auth_uid */
export async function findByAuthUid(
  supabase: SupabaseClient,
  authUid: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('council_users')
    .select(USER_FIELDS)
    .eq('auth_uid', authUid)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeUserProfile(data);
}
