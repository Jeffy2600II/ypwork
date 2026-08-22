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

export type PendingStatus = 'pending' | 'approved' | 'rejected' | 'unknown';

export interface UseRealtimePendingRequestParams {
  /** student_id (นักเรียน) หรือ null ถ้าเป็นครู/อื่นๆ */
  studentId: string | null;
  /** email (ครู/อื่นๆ) หรือ synthesized email (นักเรียน) */
  email: string | null;
  /** ประเภทบัญชี — ใช้ตัดสินใจว่าจะลอง signIn ด้วยอะไร */
  accountType: 'student' | 'teacher' | 'other';
  /** national_id (เฉพาะนักเรียน — ใช้ signIn เมื่อคำขอถูกอนุมัติ) */
  nationalId?: string | null;
}

export interface UseRealtimePendingRequestResult {
  /** สถานะปัจจุบันของคำขอ */
  status: PendingStatus;
  /** ข้อมูลคำขอ (ถ้ายัง pending) */
  request: {
    full_name: string;
    student_id: string | null;
    email: string | null;
    submitted_at: string | null;
  } | null;
  loading: boolean;
  error: string | null;
}

/**
 * v1.9.2: เรียก server API เพื่อตรวจสอบสถานะแบบ definitive
 * ใช้ service role (bypass RLS) — ไม่ต้อง login ก็ตรวจได้
 *
 * Returns:
 *   - { status: 'pending', request: {...} } — ยังรออนุมัติ
 *   - { status: 'approved', user: {...} } — อนุมัติแล้ว
 *   - { status: 'rejected' } — ถูกปฏิเสธ/ไม่พบ
 *   - { status: 'unknown' } — API error หรือ input ไม่ครบ
 */
async function checkPendingStatusViaServer(
  studentId: string | null,
  email: string | null
): Promise<{
  status: PendingStatus;
  request: { full_name: string; student_id: string | null; email: string | null; submitted_at: string | null } | null;
}> {
  if (!studentId && !email) {
    return { status: 'unknown', request: null };
  }

  try {
    const params = new URLSearchParams();
    if (studentId) params.set('student_id', studentId);
    else if (email) params.set('email', email);

    const res = await fetch(`/api/auth/check-pending-status?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      console.error('[checkPendingStatusViaServer] HTTP error:', res.status);
      return { status: 'unknown', request: null };
    }

    const data = await res.json();

    if (data.status === 'pending' && data.request) {
      return {
        status: 'pending',
        request: {
          full_name: data.request.full_name,
          student_id: data.request.student_id ?? null,
          email: data.request.email ?? null,
          submitted_at: data.request.submitted_at ?? null,
        },
      };
    }

    if (data.status === 'approved') {
      return { status: 'approved', request: null };
    }

    if (data.status === 'rejected') {
      return { status: 'rejected', request: null };
    }

    // error อื่น ๆ — ถือว่า unknown (ไม่ตีความเป็น rejected)
    return { status: 'unknown', request: null };
  } catch (err) {
    console.error('[checkPendingStatusViaServer] fetch failed:', err);
    return { status: 'unknown', request: null };
  }
}

export function useRealtimePendingRequest(
  params: UseRealtimePendingRequestParams
): UseRealtimePendingRequestResult {
  const { studentId, email, accountType, nationalId } = params;
  const [status, setStatus] = React.useState<PendingStatus>('pending');
  const [request, setRequest] = React.useState<UseRealtimePendingRequestResult['request']>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const channelName = useUniqueChannelName('ypwork-pending-request', studentId || email || 'anon');

  // v1.9.2: reload ใช้ server API แทนการ query DB ตรง ๆ
  //   - server API ใช้ service role (bypass RLS) → ได้ผลที่แน่นอน
  //   - ถ้า row มีอยู่ → pending (เสมอ)
  //   - ถ้า row ไม่มี → approved หรือ rejected (ตามที่ council_users บอก)
  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkPendingStatusViaServer(studentId, email);
      setStatus(result.status);
      setRequest(result.request);
    } catch (e: any) {
      setError(e?.message || 'โหลดสถานะไม่สำเร็จ');
      // ถ้า fetch ไม่ได้ ไม่ตีความเป็น rejected — ถือว่า unknown
      setStatus('unknown');
    } finally {
      setLoading(false);
    }
  }, [studentId, email]);

  // Initial load
  React.useEffect(() => {
    reload();
  }, [reload]);

  // Realtime subscription — ฟัง council_join_requests changes
  // เมื่อมีการเปลี่ยนแปลง (insert/update/delete) → reload เพื่อตรวจสอบสถานะใหม่
  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return; // env var ไม่ครบ — ข้าม subscription

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_join_requests' },
          () => {
            // reload ผ่าน server API เพื่อตรวจสอบสถานะใหม่
            reload();
          }
        )
        // ถ้า council_users มี row ใหม่ (admin อนุมัติ) → reload เพื่อตรวจ
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'council_users' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      console.error('[useRealtimePendingRequest] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [channelName, reload]);

  return { status, request, loading, error };
}

// ═══════════════════════════════════════════════════════════════
// v1.9.1 · useRealtimePendingRequests — สำหรับหน้า admin
// ═══════════════════════════════════════════════════════════════
// subscribe รายการการลงทะเบียนทั้งหมดใน council_join_requests แบบ realtime
//   - ใช้สำหรับ admin view (เมื่อมีคำขอใหม่/ถูกอนุมัติ/ถูกปฏิเสธ → list อัพเดตทันที)
//   - ฝั่ง client ใช้ getPendingRequests() จาก lib/db/pending-requests
//   - RLS อนุญาต authenticated SELECT
//
// ใช้งาน:
//   const { requests, loading, error, reload } = useRealtimePendingRequests();
// ═══════════════════════════════════════════════════════════════

export interface UseRealtimePendingRequestsResult {
  requests: PendingRequestAdminItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export interface PendingRequestAdminItem {
  id: string;
  full_name: string;
  student_id: string;
  year: number | null;
  email: string;
  message: string | null;
  account_type: 'student' | 'teacher' | 'other';
  national_id: string | null;
  department_id: string | null;
  created_at: string;
}

async function fetchAllPendingRequests(): Promise<PendingRequestAdminItem[]> {
  const supabase = getClient();
  if (!supabase) throw new Error(getClientError() || 'Supabase client ไม่พร้อมใช้งาน');

  const { data, error } = await supabase
    .from('council_join_requests')
    .select(
      'id, full_name, student_id, year, email, message, account_type, national_id, department_id, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as PendingRequestAdminItem[]) || [];
}

export function useRealtimePendingRequests(): UseRealtimePendingRequestsResult {
  const [requests, setRequests] = React.useState<PendingRequestAdminItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const reloadTokenRef = React.useRef(0);

  const channelName = useUniqueChannelName('ypwork-pending-requests-admin', 'all');

  const reload = React.useCallback(() => {
    reloadTokenRef.current += 1;
    const myToken = reloadTokenRef.current;
    setLoading(true);
    setError(null);
    fetchAllPendingRequests()
      .then((rows) => {
        if (myToken === reloadTokenRef.current) {
          setRequests(rows);
        }
      })
      .catch((e: any) => {
        if (myToken === reloadTokenRef.current) {
          setError(e?.message || 'โหลดรายการคำขอไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (myToken === reloadTokenRef.current) setLoading(false);
      });
  }, []);

  // Initial load
  React.useEffect(() => {
    reload();
  }, [reload]);

  // Realtime subscription — ฟัง council_join_requests changes + council_users INSERT
  // (เมื่อ admin อนุมัติคำขอ → row ใน council_join_requests จะถูก delete → reload)
  // (เมื่อมีคำขอใหม่ → row INSERT → reload)
  React.useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;

    let channel: any;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'council_join_requests' },
          () => reload()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'council_users' },
          () => reload()
        )
        .subscribe();
    } catch (e) {
      console.error('[useRealtimePendingRequests] subscribe failed:', e);
      return;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [channelName, reload]);

  return { requests, loading, error, reload };
}

