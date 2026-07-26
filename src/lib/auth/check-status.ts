'use client';

/**
 * ============================================================
 * YP WORK - Auth - Server Status Check (r48)
 * ============================================================
 * เรียก server API เพื่อตรวจสอบสถานะ pending/approved/rejected
 * ใช้ service role (bypass RLS) ที่ฝั่ง server
 * ============================================================
 */

import type { RegisterAccountType } from '@/lib/types';
import type { PendingRequestInfo, ServerStatusResult } from './types';

// ═══════════════════════════════════════════════════════════════
// v1.9.2 — Helper: เรียก server API เพื่อตรวจสอบสถานะแบบ definitive
// ═══════════════════════════════════════════════════════════════
// ใช้ service role (bypass RLS) ที่ฝั่ง server เพื่อตรวจสอบ:
//   - ถ้ามี row ใน council_join_requests = pending
//   - ถ้าไม่มี row ใน council_join_requests แต่ council_users มี = approved
//   - ถ้าไม่มีทั้งคู่ = rejected
//
// Note: function นี้ใช้ได้เฉพาะฝั่ง client (browser) เพราะต้อง fetch
// ═══════════════════════════════════════════════════════════════

// ServerStatusResult is imported from ./types (r48 split)

/**
 * ★ v3.0.0: เรียก server API เพื่อตรวจสอบสถานะ
 *   - ถ้าส่ง nationalId มาด้วย → server ตรวจ match ฝั่ง server (เพิ่ม security)
 *   - ไม่มีการส่ง national_id กลับมาจาก server อีกต่อไป (PII protection)
 *   - ถ้า server ตอบ status='error' (เช่น national_id mismatch) → ส่งต่อ error
 */
export async function checkStatusViaServerApi(
  studentId: string | null,
  email: string | null,
  nationalId?: string | null
): Promise<ServerStatusResult> {
  if (!studentId && !email) return { status: 'unknown' };

  try {
    const params = new URLSearchParams();
    if (studentId) params.set('student_id', studentId);
    else if (email) params.set('email', email);
    // ★ v3.0.0: ส่ง national_id ไปด้วย (optional) — server จะ verify match
    if (nationalId) params.set('national_id', nationalId);

    const res = await fetch(`/api/auth/check-pending-status?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      console.error('[checkStatusViaServerApi] HTTP error:', res.status);
      // ★ v3.0.0: ถ้า 403 = national_id mismatch → ส่ง error ไปยัง caller
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        return {
          status: 'error',
          error: data.error || 'เลขบัตรประชาชนไม่ตรงกับคำขอที่ส่งไว้',
        };
      }
      return { status: 'unknown' };
    }

    const data = await res.json();

    if (data.status === 'error') {
      return {
        status: 'error',
        error: data.error || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
      };
    }

    if (data.status === 'pending' && data.request) {
      return {
        status: 'pending',
        pendingRequest: {
          full_name: data.request.full_name,
          student_id: data.request.student_id ?? studentId,
          email: data.request.email ?? email,
          // ★ v3.0.0: ไม่มี national_id กลับมา — ใช้ input เป็น source of truth
          national_id: nationalId ?? null,
          account_type: (data.request.account_type || 'student') as RegisterAccountType,
          year: data.request.year ?? null,
          department_id: data.request.department_id ?? null,
          submitted_at: data.request.submitted_at ?? null,
        },
      };
    }

    if (data.status === 'approved') return { status: 'approved' };
    if (data.status === 'rejected') return { status: 'rejected' };
    return { status: 'unknown' };
  } catch (err) {
    console.error('[checkStatusViaServerApi] fetch failed:', err);
    return { status: 'unknown' };
  }
}
