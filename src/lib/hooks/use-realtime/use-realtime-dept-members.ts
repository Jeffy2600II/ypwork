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
// v1.8.2 · useRealtimeDeptMembers — สมาชิกในฝ่ายแบบ live
// ใช้ใน: Today (dept overview — แสดง avatar group + จำนวนสมาชิก)
// เมื่อ admin เพิ่ม/ลบ/ย้ายคนเข้าฝ่าย → รายการสมาชิกอัพเดตทันที
//
// subscribe: council_users (filter by department_id) — แต่เนื่องจาก
//   Supabase Realtime filter รองรับเฉพาะ column ในตารางเดียวกัน
//   เราจึง subscribe ทุก council_users changes แล้ว reload (เหมือน hook อื่น ๆ)
// ═══════════════════════════════════════════════════════════════

async function fetchDeptMembers(departmentId: string): Promise<UserProfile[]> {
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const res = await fetch(`/api/departments/members?dept_id=${encodeURIComponent(departmentId)}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดสมาชิกฝ่ายไม่สำเร็จ');
  }
  return (data.members || []) as UserProfile[];
}

export function useRealtimeDeptMembers(
  departmentId: string | null,
  initialMembers: UserProfile[]
): {
  members: UserProfile[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [members, setMembers] = React.useState<UserProfile[]>(initialMembers);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialMembers ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ empty
  const initialMembersRef = React.useRef(initialMembers);

  const reload = React.useCallback(() => {
    if (!departmentId) {
      setMembers([]);
      return;
    }
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchDeptMembers(departmentId)
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          // v3.3.0 guard: ถ้า fetch สำเร็จแต่ส่งกลับ empty ทันทีหลัง mount
          //   และ initialMembers มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน
          if (
            rows.length === 0 &&
            initialMembersRef.current.length > 0 &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setMembers(rows);
          }
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดสมาชิกฝ่ายไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [departmentId]);

  // v1.8.2: Initial mount — reload to bypass RSC cache
  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    if (!departmentId) return;
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(`ypwork-dept-members-${departmentId}`)
        // any council_users change → reload (filter ไม่ได้เพราะอาจเป็น
        // การย้ายคนเข้า/ออกฝ่าย ที่ต้องการฝั่ง server กรองใหม่)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeDeptMembers] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [departmentId, reload]);

  return { members, loading, error, reload };
}


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
