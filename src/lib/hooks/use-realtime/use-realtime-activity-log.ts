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
// v1.8 · useRealtimeActivityLog — สำหรับ activity feed (ในอนาคต)
// subscribe ypwork_activity_log + council_users (เพื่อ resolve actor name)
// ═══════════════════════════════════════════════════════════════
export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  created_at: string;
  actor_name?: string | null;
  actor_color?: string | null;
}

async function fetchActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');
  const { data, error } = await supabase
    .from('ypwork_activity_log')
    .select(
      'id, actor_id, action, entity_type, entity_id, entity_title, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data || []) as ActivityLogEntry[];

  // resolve actor names (best-effort — ถ้า fail ก็ยังแสดงได้)
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])
  );
  if (actorIds.length === 0) return rows;

  // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
  const { data: users } = await supabase
    .from('council_users')
    .select('auth_uid, full_name')
    .in('auth_uid', actorIds);

  const userMap = new Map<string, { name: string; color: string }>();
  for (const u of users || []) {
    userMap.set(u.auth_uid, {
      name: u.full_name,
      color: getUserColor(u.auth_uid), // ★ v3.7.0: generated color
    });
  }

  return rows.map((r) => ({
    ...r,
    actor_name: r.actor_id ? userMap.get(r.actor_id)?.name || null : null,
    actor_color: r.actor_id ? userMap.get(r.actor_id)?.color || null : null,
  }));
}

export function useRealtimeActivityLog(limit = 50): {
  entries: ActivityLogEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [entries, setEntries] = React.useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  // ★ r47: unique channel name ต่อ hook instance
  const channelName = useUniqueChannelName('ypwork-activity-log-realtime');

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchActivityLog(limit)
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setEntries(rows);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลด activity log ไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [limit]);

  React.useEffect(() => {
    reload();
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_activity_log' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeActivityLog] subscribe failed:', e);
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

  return { entries, loading, error, reload };
}


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
