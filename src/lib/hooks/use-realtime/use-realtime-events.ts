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
// useRealtimeEvents — สำหรับหน้า list/calendar/today
// รับ initialEvents (SSR) แล้ว subscribe realtime updates
// ═══════════════════════════════════════════════════════════════
export function useRealtimeEvents(initialEvents: YPEvent[]): {
  events: YPEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** ★ v3.10.0 รอบที่ 27: Optimistic patch helpers — เหมือน useRealtimeEventById */
  patchEvent: (eventId: string, patch: Partial<YPEvent>) => void;
  patchTask: (taskId: string, patch: Partial<Task>) => void;
} {
  // ★ v3.9.9: อ่าน sessionStorage cache ตอน mount — ถ้ามี cache ให้ใช้แทน initialEvents
  //   ทำให้กลับเข้าหน้าเดิมเร็วขึ้น (instant render) แทนที่จะรอ fetch ใหม่
  //   cache หมดอายุใน 5 นาที (ตาม TTL ใน session-cache.ts)
  //   realtime subscription ยังคงทำงานปกติ — cache แค่ช่วย initial state
  const CACHE_KEY = 'events';
  const cachedEvents = getCached<YPEvent[]>(CACHE_KEY);
  const initialData = cachedEvents && cachedEvents.length > 0 ? cachedEvents : initialEvents;

  const [events, setEvents] = React.useState<YPEvent[]>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);
  // v3.3.0: เก็บ initialEvents ไว้ใน ref — กัน loss เมื่อ reload แรกส่งกลับ
  //   empty array ที่ไม่คาดคิด (เช่น RLS บล็อกชั่วคราว)
  const initialEventsRef = React.useRef(initialEvents);

  // Stable reload function (does not depend on state)
  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    fetchEvents()
      .then((rows) => {
        // avoid race condition — only apply if still latest
        if (myToken === reloadTokenRef.current) {
          // v3.3.0 guard: ถ้า fetch สำเร็จแต่ส่งกลับ empty array ทันทีหลัง mount
          //   และ initialEvents มีข้อมูล — เก็บข้อมูลเดิมไว้ก่อน (อาจเป็น transient error)
          //   แต่ถ้าเป็น realtime update ที่ถูกต้อง (มี change) ให้ apply ปกติ
          if (
            rows.length === 0 &&
            initialEventsRef.current.length > 0 &&
            reloadTokenRef.current === 1 // รอบแรกเท่านั้น
          ) {
            // skip — เก็บ initial data
          } else {
            setEvents(rows);
            // ★ v3.9.9: เขียน cache ทุกครั้งที่ reload สำเร็จ
            //   ครั้งต่อไปที่ user กลับเข้าหน้านี้จะได้ข้อมูลล่าสุดเป็น initial state
            setCached(CACHE_KEY, rows);
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
  }, []);

  // ★ r47 CRITICAL FIX (B4): แก้ race condition ระหว่าง optimistic patch
  //   กับ realtime reload ที่ทำให้ UI "กระพริบ" กลับเป็นของเดิม
  //
  //   ปัญหา: กดเปลี่ยน status → patchTask() อัพเดต state ทันที →
  //   realtime push มา → reload() ดึงข้อมูลใหม่ → แต่ API PATCH ยังไม่เสร็ยบร้อย
  //   → user เห็น status เดิมกลับมา แล้วค่อยกลายเป็น status ใหม่ (กระพริบ)
  //
  //   วิธีแก้: หลัง patchEvent/patchTask ให้ตั้ง "grace period" 300ms
  //   ระหว่าง grace period ถ้า reload() ถูกเรียก (จาก realtime push)
  //   ให้ delay ออกไปจนกว่า grace period จะหมด — ป้องกัน state กระพริบ
  const OPTIMISTIC_GRACE_MS = 300;
  const optimisticUntilRef = React.useRef(0);

  // wrap reload ใหม่ให้ respect grace period
  const reloadWithGrace = React.useCallback(() => {
    const now = Date.now();
    const remaining = optimisticUntilRef.current - now;
    if (remaining > 0) {
      // อยู่ใน grace period — delay reload จนกว่าจะหมด
      setTimeout(() => {
        if (Date.now() >= optimisticUntilRef.current) {
          reload();
        }
      }, remaining + 10);
      return;
    }
    reload();
  }, [reload]);

  // ★ r47: unique channel name ต่อ hook instance — กัน conflict เมื่อ
  //   Calendar + Events list + Today ทั้งคู่ใช้ useRealtimeEvents พร้อมกัน
  //   (ปัญหาเดิมคือใช้ชื่อ 'ypwork-events-realtime' ตัวเดียวกัน เวลา
  //   cleanup อันนึง removeChannel ไปทำลาย subscription ของอีกอัน)
  const channelName = useUniqueChannelName('ypwork-events-realtime');

  // v1.8.2: Initial mount — reload() once to bypass Next.js RSC cache.
  //   ปัญหาเดิม: ถ้า user ไปหน้าอื่นแล้วย้อนกลับมาภายใน 30 วินาที
  //   Next.js จะใช้ cached RSC payload (initialEvents ตัวเก่า) แล้ว
  //   subscribe realtime — ถ้าไม่มี change ใหม่เกิดขึ้น user จะเห็น
  //   ข้อมูลเก่าตลอด → ต้อง reload() ทันทีหลัง mount เพื่อดึงข้อมูล
  //   ล่าสุดจาก DB (เสีย request 1 ครั้งต่อ navigation แต่ trade-off
  //   ที่ยอมรับได้เพื่อความถูกต้องของข้อมูล)
  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    // v1.8.3: ใช้ unique channel name เพื่อกัน conflict กับ hook อื่น
    const supabase = getClient();
    if (!supabase) return; // env var ไม่ครบ — ข้าม subscription, แค่อาศัย initial data

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        // events changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_events' },
          () => {
            // ★ r47: ใช้ reloadWithGrace แทน reload เพื่อกัน optimistic state ถูกทับ
            reloadWithGrace();
          }
        )
        // tasks changes (affects progress + counts)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_tasks' },
          () => reloadWithGrace()
        )
        // assignees changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_task_assignees' },
          () => reloadWithGrace()
        )
        // v1.8.2: event_members changes — คนเข้า/ออกงาน ต้อง reload
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ypwork_event_members' },
          () => reloadWithGrace()
        )
        // v1.8.2: council_users changes — คนเปลี่ยนชื่อ/สี/ฝ่าย ต้อง reload
        //         (assignees / members display ต้องอัพเดตตาม)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_users' },
          () => reloadWithGrace()
        )
        // v1.8.2: departments changes — admin เปลี่ยนชื่อ/สี/ไอคอนฝ่าย ต้อง reload
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'departments' },
          () => reloadWithGrace()
        )
        .subscribe();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[useRealtimeEvents] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore — channel อาจถูก remove ไปแล้ว
      }
    };
  }, [reloadWithGrace, channelName]);

  // ★ v3.10.0 รอบที่ 27: Optimistic patch helpers — อัพเดต state ทันที
  //   ก่อน realtime push มาถึง ทำให้ UI เปลี่ยนทันทีไม่ต้องรีเซ็ตหน้า
  const patchEvent = React.useCallback((eventId: string, patch: Partial<YPEvent>) => {
    optimisticUntilRef.current = Date.now() + OPTIMISTIC_GRACE_MS;
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, ...patch } : e))
    );
  }, []);

  const patchTask = React.useCallback((taskId: string, patch: Partial<Task>) => {
    optimisticUntilRef.current = Date.now() + OPTIMISTIC_GRACE_MS;
    setEvents((prev) =>
      prev.map((e) => ({
        ...e,
        tasks: (e.tasks || []).map((t) =>
          t.id === taskId ? { ...t, ...patch } : t
        ),
      }))
    );
  }, []);

  return { events, loading, error, reload, patchEvent, patchTask };
}
