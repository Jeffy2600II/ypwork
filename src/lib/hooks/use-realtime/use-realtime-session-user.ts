'use client';

import * as React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { YPEvent, Task, UserProfile, Department, SessionUser } from '@/lib/types';
import { getUserColor } from '@/lib/utils/user-color';
import { getCached, setCached } from '@/lib/utils/session-cache';
import { getClient, getClientError, useUniqueChannelName } from './client';
import { normalizeEvent, normalizeTask, EVENT_FIELDS } from './normalize';
import { fetchEvents, fetchEventById } from './fetch';

// ═══════════════════════════════════════════════════════════════
// v1.8.2 · useRealtimeSessionUser — ข้อมูล user ตัวเองแบบ live
// ใช้ใน: Today (hero name), Profile, AppShell (header avatar)
// เมื่อ admin เปลี่ยนชื่อ/สี/ฝ่าย/role ของ user → UI อัพเดตทันที
//
// subscribe: council_users กรองด้วย auth_uid ของตัวเอง
// ═══════════════════════════════════════════════════════════════

async function fetchSessionUserLive(authUid: string): Promise<Partial<SessionUser> | null> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
  // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
  const { data, error } = await supabase
    .from('council_users')
    .select('auth_uid, full_name, role, account_type, year, department_id')
    .eq('auth_uid', authUid)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    auth_uid: data.auth_uid,
    full_name: data.full_name,
    year: data.year ?? null,
    role: data.role ?? 'member',
    account_type: (data.account_type || 'student') as 'student' | 'teacher' | 'other',
    department_id: data.department_id ?? null,
    color: getUserColor(data.auth_uid), // ★ v3.7.0: generated color
  };
}

export function useRealtimeSessionUser(
  initialUser: SessionUser
): {
  user: SessionUser;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [user, setUser] = React.useState<SessionUser>(initialUser);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  // v1.8.3: unique channel name ต่อ hook instance — กัน conflict เวลา
  //   AppShell + TodayClient/ProfileView เรียก hook นี้พร้อมกัน (ปัญหาเดิม
  //   คือ 2 hooks ใช้ชื่อ channel เดียวกัน เวลา cleanup อันนึง removeChannel
  //   ไปทำลาย subscription ของอีกอัน)
  const channelName = useUniqueChannelName(
    'ypwork-session-user',
    initialUser.auth_uid
  );

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchSessionUserLive(initialUser.auth_uid)
      .then((live) => {
        if (myToken === reloadTokenRef.current && live) {
          // merge — เก็บ email จาก initial (ไม่ได้ select ตอน fetch live
          // เพราะ email อาจไม่ได้อยู่ใน council_users)
          setUser((prev) => ({ ...prev, ...live, email: prev.email }));
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [initialUser.auth_uid]);

  // v1.8.2: Initial mount — reload to bypass RSC cache
  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'council_users',
            filter: `auth_uid=eq.${initialUser.auth_uid}`,
          },
          () => reload()
        )
        // ถ้าฝ่ายของ user เปลี่ยนชื่อ/สี/ไอคอน → ต้อง reload ด้วย
        // (เพราะ color ใน SessionUser อาจมาจากฝ่าย)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeSessionUser] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [initialUser.auth_uid, channelName, reload]);

  return { user, loading, error, reload };
}

// ═══════════════════════════════════════════════════════════════
// v1.9.2 · useRealtimePendingRequest — สำหรับหน้า /pending-status (FIXED)
// ═══════════════════════════════════════════════════════════════
// subscribe การลงทะเบียนใน council_join_requests แบบ realtime
//   - ใช้ student_id (นักเรียน) หรือ email (ครู/อื่นๆ) เป็น filter
//   - เมื่อ row ถูก delete (admin อนุมัติหรือปฏิเสธ) →
//     ตรวจสอบว่า "approved" (council_users มี row) หรือ "rejected"
//   - คืน status: 'pending' | 'approved' | 'rejected' | 'unknown'
//
// ★ v1.9.2 CRITICAL FIX:
//   ก่อนหน้านี้ ระบบใช้ Supabase client (anon key) เพื่อ SELECT
//   council_join_requests แต่ RLS บล็อก anon users → คืน null
//   → ระบบตีความเป็น 'rejected' ทั้งที่จริงยัง 'pending' อยู่
//
//   ตอนนี้ใช้ server-side API (/api/auth/check-pending-status)
//   ที่ใช้ service role (bypass RLS) เพื่อตรวจสอบสถานะที่แน่นอน
//   - ถ้า row มีอยู่ใน council_join_requests = pending เสมอ
//   - ถ้าไม่มี row แต่ council_users มี row = approved
//   - ถ้าไม่มี row ทั้งคู่ = rejected (definitively)
//
// Realtime channel ยังใช้สำหรับ trigger reload (เมื่อมีการเปลี่ยนแปลง)
// แต่การตรวจสอบสถานะทำผ่าน server API เท่านั้น
// ═══════════════════════════════════════════════════════════════
