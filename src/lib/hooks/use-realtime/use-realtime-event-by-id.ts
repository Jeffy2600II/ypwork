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
// useRealtimeEventById — สำหรับหน้า detail
// subscribe เฉพาะ event ตัวเอง + tasks ของ event นั้น
// ═══════════════════════════════════════════════════════════════
export function useRealtimeEventById(
  initialEvent: YPEvent | null,
  eventId: string | null
): {
  event: YPEvent | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** local patch helpers — สำหรับ optimistic updates ก่อน realtime มาถึง */
  patchEvent: (patch: Partial<YPEvent>) => void;
  patchTask: (taskId: string, patch: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  addTask: (task: Task) => void;
} {
  // ★ v3.9.9: อ่าน sessionStorage cache ตอน mount — ถ้ามี cache ให้ใช้แทน initialEvent
  //   cache key ขึ้นกับ eventId ของแต่ละงาน
  //   ทำให้กลับเข้าหน้า detail เดิมเร็วขึ้น (instant render)
  const CACHE_KEY = eventId ? `event:${eventId}` : null;
  const cachedEvent = CACHE_KEY ? getCached<YPEvent>(CACHE_KEY) : null;
  const initialData = cachedEvent ?? initialEvent;

  const [event, setEvent] = React.useState<YPEvent | null>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialEvent ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ
  //   null ที่ไม่คาดคิด (เช่น RLS บล็อกชั่วคราว)
  const initialEventRef = React.useRef(initialEvent);

  const reload = React.useCallback(() => {
    if (!eventId) return;
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEventById(eventId)
      .then((row) => {
        if (myToken === reloadTokenRef.current) {
          // v3.3.0 guard: ถ้า fetch สำเร็จแต่ส่งกลับ null ทันทีหลัง mount
          //   และ initialEvent มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน (อาจเป็น transient error)
          //   แต่ถ้าเป็น realtime update ที่ถูกต้อง (event ถูกลบ) ให้ apply ปกติ
          if (
            row === null &&
            initialEventRef.current !== null &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setEvent(row);
            // ★ v3.9.9: เขียน cache ทุกครั้งที่ reload สำเร็จ (ถ้า row ไม่ null)
            if (row && CACHE_KEY) {
              setCached(CACHE_KEY, row);
            }
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
  }, [eventId, CACHE_KEY]);

  // ★ r47 (B4): grace period สำหรับ optimistic patch — เหมือน useRealtimeEvents
  const OPTIMISTIC_GRACE_MS = 300;
  const optimisticUntilRef = React.useRef(0);

  const reloadWithGrace = React.useCallback(() => {
    const now = Date.now();
    const remaining = optimisticUntilRef.current - now;
    if (remaining > 0) {
      setTimeout(() => {
        if (Date.now() >= optimisticUntilRef.current) {
          reload();
        }
      }, remaining + 10);
      return;
    }
    reload();
  }, [reload]);

  // v1.8.2: Initial mount — reload() once to bypass Next.js RSC cache.
  //   ถ้า user กลับเข้าหน้า detail ภายใน 30 วินาที Next.js จะใช้ cached
  //   payload → initialEvent ตัวเก่า → ต้อง reload เพื่อให้แน่ใจว่าข้อมูลสด
  React.useEffect(() => {
    if (eventId) reload();
  }, [eventId, reload]);

  React.useEffect(() => {
    if (!eventId) return;
    const supabase = getClient();
    if (!supabase) return; // v1.8.3: env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(`ypwork-event-${eventId}`)
        // changes on THIS event row
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ypwork_events',
            filter: `id=eq.${eventId}`,
          },
          () => reloadWithGrace()
        )
        // changes on tasks of THIS event (filter by event_id)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ypwork_tasks',
            filter: `event_id=eq.${eventId}`,
          },
          () => reloadWithGrace()
        )
        // assignee changes — reload (no per-row filter possible easily)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
          () => reloadWithGrace()
        )
        // v1.8.2: event_members changes — คนเข้า/ออกงานนี้
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_event_members' },
          () => reloadWithGrace()
        )
        // v1.8.2: council_users changes — assignee/member เปลี่ยนชื่อ/สี/ฝ่าย
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reloadWithGrace()
        )
        // v1.8.2: departments changes — admin เปลี่ยนฝ่ายของงานนี้
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reloadWithGrace()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeEventById] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [eventId, reloadWithGrace]);

  // local patch helpers — สำหรับ optimistic update
  // ★ r47 (B4): ตั้ง grace period หลัง patch เพื่อกัน realtime ทับ optimistic state
  const patchEvent = React.useCallback((patch: Partial<YPEvent>) => {
    optimisticUntilRef.current = Date.now() + OPTIMISTIC_GRACE_MS;
    setEvent((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);
  const patchTask = React.useCallback((taskId: string, patch: Partial<Task>) => {
    optimisticUntilRef.current = Date.now() + OPTIMISTIC_GRACE_MS;
    setEvent((prev) =>
      prev
        ? {
            ...prev,
            tasks: (prev.tasks || []).map((t) =>
              t.id === taskId ? { ...t, ...patch } : t
            ),
          }
        : prev
    );
  }, []);
  const removeTask = React.useCallback((taskId: string) => {
    optimisticUntilRef.current = Date.now() + OPTIMISTIC_GRACE_MS;
    setEvent((prev) =>
      prev
        ? { ...prev, tasks: (prev.tasks || []).filter((t) => t.id !== taskId) }
        : prev
    );
  }, []);
  const addTask = React.useCallback((task: Task) => {
    optimisticUntilRef.current = Date.now() + OPTIMISTIC_GRACE_MS;
    setEvent((prev) =>
      prev ? { ...prev, tasks: [...(prev.tasks || []), task] } : prev
    );
  }, []);

  return { event, loading, error, reload, patchEvent, patchTask, removeTask, addTask };
}
