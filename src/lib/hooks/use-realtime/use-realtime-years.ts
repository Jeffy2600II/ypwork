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
// v1.8.1 · useRealtimeYears — รายการปีการศึกษาแบบ live
// ใช้ใน: register form (เลือกปีการศึกษา)
// เมื่อ admin เพิ่ม/ปิดปีใน YP Labs → หน้า register อัพเดตทันที
// (ก่อนหน้านี้ frontend hardcoded ['2568','2567','2566'])
//
// schema (จาก yplabs):
//   council_years (
//     year integer PRIMARY KEY,
//     closed boolean DEFAULT false
//   )
// ═══════════════════════════════════════════════════════════════

export interface CouncilYear {
  year: number;
  closed: boolean;
}

async function fetchYears(): Promise<CouncilYear[]> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
  const { data, error } = await supabase
    .from('council_years')
    .select('year, closed')
    .order('year', { ascending: false });
  if (error) throw error;
  // normalize — ถ้า column `closed` ไม่มี (DB ยังไม่ migrate) ให้ถือว่าเปิดอยู่
  return (data || []).map((r: any) => ({
    year: Number(r.year),
    closed: Boolean(r.closed ?? false),
  }));
}

export function useRealtimeYears(
  initialYears: CouncilYear[]
): {
  years: CouncilYear[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [years, setYears] = React.useState<CouncilYear[]>(initialYears);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  // ★ r47: unique channel name ต่อ hook instance
  const channelName = useUniqueChannelName('ypwork-years-realtime');

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchYears()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setYears(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดรายการปีการศึกษาไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_years' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeYears] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [reload, channelName]);

  return { years, loading, error, reload };
}


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
