'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SessionUser } from '@/lib/types';

/**
 * Hook สำหรับดึง session user ปัจจุบัน (client-side)
 * ใช้ใน Client Components ที่ต้องการข้อมูล user
 */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('council_users')
      .select('*')
      .eq('auth_uid', authUser.id)
      .limit(1)
      .maybeSingle();

    if (profile && profile.approved && !profile.disabled) {
      setUser({
        auth_uid: profile.auth_uid,
        full_name: profile.full_name,
        student_id: profile.student_id || null,
        national_id: profile.national_id || null,
        year: profile.year || null,
        role: profile.role || 'member',
        account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
        email: profile.email || '',
        department_id: profile.department_id || null,
        color: profile.color || '#4F46E5',
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchUser();
      if (cancelled) return;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fetchUser]);

  return { user, loading, refetch: fetchUser };
}
