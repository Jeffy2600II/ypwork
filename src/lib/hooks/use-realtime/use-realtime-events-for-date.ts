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
// v1.8 · useRealtimeEventsForDate — สำหรับหน้า Day View (/events/day/[date])
// เหมือน useRealtimeEvents แต่กรองเฉพาะ events ของวันที่กำหนด
// ═══════════════════════════════════════════════════════════════
export function useRealtimeEventsForDate(
  initialEvents: YPEvent[],
  dateStr: string | null
): {
  events: YPEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [events, setEvents] = React.useState<YPEvent[]>(initialEvents);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialEvents ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ empty
  const initialEventsRef = React.useRef(initialEvents);

  const reload = React.useCallback(() => {
    if (!dateStr) return;
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEvents()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          // กรองเฉพาะ event ของวันที่กำหนด (date หรือ end_date คลุมวันนี้)
          const filtered = rows.filter((e) => {
            if (e.date === dateStr) return true;
            if (e.end_date && e.date <= dateStr && e.end_date >= dateStr) return true;
            return false;
          });
          // v3.3.0 guard: ถ้า filtered empty ทันทีหลัง mount และ initialEvents
          //   มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน (อาจเป็น transient error)
          if (
            filtered.length === 0 &&
            initialEventsRef.current.length > 0 &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setEvents(filtered);
          }
          setError(null);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, [dateStr]);

  // v1.8.2: Initial mount — reload() once to bypass Next.js RSC cache.
  React.useEffect(() => {
    if (dateStr) reload();
  }, [dateStr, reload]);

  React.useEffect(() => {
    if (!dateStr) return;
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(`ypwork-events-day-${dateStr}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_events' },
          () => reload()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_tasks' },
          () => reload()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
          () => reload()
        )
        // v1.8.2: event_members changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_event_members' },
          () => reload()
        )
        // v1.8.2: council_users changes — assignee/member เปลี่ยนชื่อ/สี
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reload()
        )
        // v1.8.2: departments changes — admin เปลี่ยนฝ่ายของงาน
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeEventsForDate] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [dateStr, reload]);

  return { events, loading, error, reload };
}


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
