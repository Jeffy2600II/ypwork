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
// v1.8 · useRealtimeProfileStats — live stats ของ user ในหน้าโปรไฟล์
// subscribe: ypwork_tasks, ypwork_task_assignees, ypwork_events,
//            council_users (เพื่อ detect การเปลี่ยนฝ่าย/สี/role ของตัวเอง)
// ═══════════════════════════════════════════════════════════════
export interface ProfileStats {
  deptEvents: number;
  myTasks: number;
  myDone: number;
  myPending: number;
  completionRate: number;
}

async function fetchProfileStats(
  userAuthUid: string,
  departmentId: string | null
): Promise<ProfileStats> {
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const params = new URLSearchParams({ user_auth_uid: userAuthUid });
  if (departmentId) params.set('department_id', departmentId);
  const res = await fetch(`/api/profile/stats?${params.toString()}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดสถิติไม่สำเร็จ');
  }
  return data.stats as ProfileStats;
}

export function useRealtimeProfileStats(
  userAuthUid: string,
  departmentId: string | null,
  initialStats: ProfileStats
): {
  stats: ProfileStats;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [stats, setStats] = React.useState<ProfileStats>(initialStats);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchProfileStats(userAuthUid, departmentId)
      .then((s) => {
        if (myToken === reloadTokenRef.current) {
          setStats(s);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดสถิติไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [userAuthUid, departmentId]);

  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(`ypwork-profile-${userAuthUid}`)
        // task changes → myTasks/myDone/myPending/completionRate เปลี่ยน
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_tasks' },
          () => reload()
        )
        // assignee changes → myTasks เปลี่ยน
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
          () => reload()
        )
        // events change → deptEvents เปลี่ยน
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_events' },
          () => reload()
        )
        // council_users change → ฝ่าย/สี/role ของตัวเองอาจเปลี่ยน
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'council_users',
            filter: `auth_uid=eq.${userAuthUid}`,
          },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeProfileStats] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [userAuthUid, reload]);

  return { stats, loading, error, reload };
}


// ═══════════════════════════════════════════════════════════════
// v1.8 · useRealtimeActivityLog — สำหรับ activity feed (ในอนาคต)
// subscribe ypwork_activity_log + council_users (เพื่อ resolve actor name)
