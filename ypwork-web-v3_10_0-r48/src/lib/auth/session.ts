/**
 * ============================================================
 * YP WORK - Auth - Session Helpers (r48)
 * ============================================================
 * - getSessionUser (cached via React cache() -- server-side only)
 * - profileToSessionUser (council_users row -> SessionUser)
 * - profileToUserProfile (council_users row -> UserProfile)
 * ============================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import type { SessionUser, UserProfile } from '@/lib/types';
import { getUserColor } from '@/lib/utils/user-color';

export const getSessionUser = cache(
  async (supabase: SupabaseClient): Promise<SessionUser | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('council_users')
      .select('*')
      .eq('auth_uid', user.id)
      .limit(1)
      .maybeSingle();

    if (!profile || !profile.approved || profile.disabled) {
      return null;
    }

    return profileToSessionUser(profile);
  }
);

/** แปลง council_users row → SessionUser */
export function profileToSessionUser(profile: any): SessionUser {
  return {
    auth_uid: profile.auth_uid,
    full_name: profile.full_name,
    student_id: profile.student_id || null,
    national_id: profile.national_id || null,
    year: profile.year || null,
    role: profile.role || 'member',
    account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
    email: profile.email || '',
    department_id: profile.department_id || null,
    // ★ v3.7.0: ใช้ getUserColor แทน profile.color (column ไม่มีใน DB)
    color: getUserColor(profile.auth_uid),
  };
}

/** แปลง council_users row → UserProfile */
export function profileToUserProfile(profile: any): UserProfile {
  return {
    auth_uid: profile.auth_uid,
    full_name: profile.full_name,
    student_id: profile.student_id || null,
    national_id: profile.national_id || null,
    year: profile.year || null,
    role: profile.role || 'member',
    account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
    approved: profile.approved ?? false,
    disabled: profile.disabled ?? false,
    email: profile.email || '',
    department_id: profile.department_id || null,
    // ★ v3.7.0: ใช้ getUserColor แทน profile.color (column ไม่มีใน DB)
    color: getUserColor(profile.auth_uid),
  };
}
