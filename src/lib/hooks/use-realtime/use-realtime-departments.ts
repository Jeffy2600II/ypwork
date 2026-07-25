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
// v1.8 · useRealtimeDepartments — สำหรับแสดงรายการฝ่ายแบบ live
// ใช้ใน: register form (เลือกฝ่าย), profile (แสดงฝ่าย), today (stat ฝ่าย)
// เมื่อ admin เปลี่ยนชื่อ/สี/ไอคอนฝ่าย → ทุกหน้าอัพเดตทันที
// ═══════════════════════════════════════════════════════════════
async function fetchDepartments(): Promise<Department[]> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, color, icon, description, created_at, updated_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Department[];
}

export function useRealtimeDepartments(
  initialDepartments: Department[]
): {
  departments: Department[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [departments, setDepartments] = React.useState<Department[]>(initialDepartments);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  // ★ r47: unique channel name ต่อ hook instance — กัน conflict เมื่อ
  //   register form + profile + today ทั้งคู่ใช้ useRealtimeDepartments พร้อมกัน
  const channelName = useUniqueChannelName('ypwork-departments-realtime');

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchDepartments()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setDepartments(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลฝ่ายไม่สำเร็จ');
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
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeDepartments] subscribe failed:', e);
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

  return { departments, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8 · useRealtimeProfileStats — live stats ของ user ในหน้าโปรไฟล์
// subscribe: ypwork_tasks, ypwork_task_assignees, ypwork_events,
//            council_users (เพื่อ detect การเปลี่ยนฝ่าย/สี/role ของตัวเอง)
