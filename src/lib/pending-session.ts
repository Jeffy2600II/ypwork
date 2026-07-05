'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Pending Session Manager (v1.9.3)
// ═══════════════════════════════════════════════════════════════
// จัดการสถานะ "pending" ของผู้ใช้ที่ส่งคำขอสมัครแล้ว แต่ยังไม่ถูกอนุมัติ
//
// ★ หลักการสำคัญ (ตาม requirement ของ user):
//   - ไม่แก้ฐานข้อมูล ไม่เพิ่มตาราง ไม่เก็บข้อมูลการปฏิเสธใน DB
//   - ใช้ localStorage เก็บ pending session + rejected accounts ฝั่ง client เท่านั้น
//   - เมื่อ admin อนุมัติ → ระบบ realtime ตรวจพบและพา user เข้าสู่ระบบได้เลย
//   - เมื่อ admin ปฏิเสธ (delete row ใน council_join_requests) → ระบบ sign out
//     และจำ student_id/email ไว้ใน localStorage เพื่อแจ้งเตือนเมื่อกลับมา
//
// ★ v1.9.3 — Auto sign-in เมื่อถูกอนุมัติ:
//   - ก่อนหน้านี้ pending-status เพียงแค่ redirect ไป /today หลัง approved
//     แต่ user ยังไม่ได้ sign-in กับ Supabase Auth จริง → middleware บล็อก
//     → ส่งกลับ /login ทำให้ user ต้อง login ใหม่ทั้งที่รออยู่ตั้งแต่แรก
//   - ตอนนี้ pending session เก็บ password (สำหรับครู/อื่นๆ) ด้วย
//     เพื่อให้ระบบ sign-in ให้อัตโนมัติได้ทันทีเมื่อ admin อนุมัติ
//   - สำหรับนักเรียน: password คือ student_id (synthesized email pattern)
//     จึงไม่ต้องเก็บ password ใน pending session
//   - password ถูก clear ทันทีหลัง sign-in สำเร็จ ไม่ค้างใน localStorage
//
// ★ ทำไมใช้ localStorage ไม่ใช่ cookie:
//   - cookie middleware อ่านได้ แต่ต้องการ httpOnly + signed ถึงจะปลอดภัย
//   - localStorage เพียงพอสำหรับ client-side state แบบนี้ (ไม่ sensitive)
//   - middleware แค่ allow /pending-status เป็น public route ได้เลย
//     ไม่ต้องรู้ว่า user เป็น pending หรือไม่
// ═══════════════════════════════════════════════════════════════

import type { RegisterAccountType } from '@/lib/types';

const PENDING_KEY = 'yp_pending_session';
const REJECTED_KEY = 'yp_rejected_accounts';

/** ข้อมูล pending session — เก็บไว้ตรวจสอบสถานะแบบ realtime */
export interface PendingSession {
  /** student_id สำหรับนักเรียน, หรือ email สำหรับครู/อื่นๆ (ใช้ตัวใดตัวหนึ่ง) */
  student_id: string | null;
  /** email สำหรับครู/อื่นๆ, หรือ synthesized email ของนักเรียน */
  email: string | null;
  /** เลขบัตรประชาชน (เฉพาะนักเรียน — ใช้ verify ตอน login) */
  national_id: string | null;
  /** ชื่อ-นามสกุลที่กรอกตอนส่งคำขอ */
  full_name: string;
  /** ประเภทบัญชี */
  account_type: RegisterAccountType;
  /** เวลาที่ส่งคำขอ (ISO string) */
  submitted_at: string;
  /**
   * v1.9.3: password สำหรับครู/อื่นๆ — ใช้เมื่อ admin อนุมัติเพื่อ sign-in อัตโนมัติ
   * สำหรับนักเรียน: เก็บเป็น null เพราะ password คือ student_id (คำนวณได้จาก student_id)
   * ค่านี้จะถูกล้างทันทีหลัง sign-in สำเร็จ
   */
  password?: string | null;
}

/** บัญชีที่เคยถูกปฏิเสธ — เก็บไว้แสดงข้อความ "ถูกปฏิเสธ" เมื่อกลับมา login */
export interface RejectedAccount {
  student_id?: string | null;
  email?: string | null;
  rejected_at: string;
}

// ── Pending session ──

/** อ่าน pending session จาก localStorage (client-side เท่านั้น) */
export function getPendingSession(): PendingSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // basic validation
    if (!parsed.full_name || !parsed.account_type || !parsed.submitted_at) {
      return null;
    }
    return parsed as PendingSession;
  } catch {
    return null;
  }
}

/** บันทึก pending session */
export function setPendingSession(session: PendingSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(session));
    // ส่ง event ให้ component อื่น ๆ รู้ว่า pending session เปลี่ยน
    window.dispatchEvent(new CustomEvent('yp-pending-session-change'));
  } catch {
    // ignore — localStorage อาจ disabled (private mode)
  }
}

/** ล้าง pending session (เมื่ออนุมัติแล้ว หรือ sign out) */
export function clearPendingSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PENDING_KEY);
    window.dispatchEvent(new CustomEvent('yp-pending-session-change'));
  } catch {
    // ignore
  }
}

/**
 * v1.9.3: ล้างเฉพาะ password ออกจาก pending session — เรียกหลัง sign-in สำเร็จ
 * เพื่อไม่ให้ password ค้างใน localStorage หลังใช้งานเสร็จ
 * (ส่วนอื่น ๆ ของ pending session ยังคงอยู่ จนกว่าจะเคลียร์ทั้งหมด)
 */
export function clearPendingSessionPassword(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    if (parsed.password === undefined || parsed.password === null) return;
    parsed.password = null;
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent('yp-pending-session-change'));
  } catch {
    // ignore
  }
}

// ── Rejected accounts ──

/** อ่านรายการบัญชีที่ถูกปฏิเสธ */
export function getRejectedAccounts(): RejectedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REJECTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RejectedAccount[];
  } catch {
    return [];
  }
}

/** เพิ่มบัญชีเข้ารายการปฏิเสธ (dedupe by student_id หรือ email) */
export function addRejectedAccount(account: RejectedAccount): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getRejectedAccounts();
    // กรองออกถ้ามีอยู่แล้ว (อ้างอิงด้วย student_id หรือ email)
    const filtered = list.filter((a) => {
      if (account.student_id && a.student_id === account.student_id) return false;
      if (account.email && a.email === account.email) return false;
      return true;
    });
    filtered.push({
      ...account,
      rejected_at: account.rejected_at || new Date().toISOString(),
    });
    window.localStorage.setItem(REJECTED_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('yp-rejected-accounts-change'));
  } catch {
    // ignore
  }
}

/** ตรวจสอบว่าบัญชีนี้เคยถูกปฏิเสธหรือไม่ */
export function isRejected(
  studentId?: string | null,
  email?: string | null
): boolean {
  if (!studentId && !email) return false;
  const list = getRejectedAccounts();
  return list.some((a) => {
    if (studentId && a.student_id === studentId) return true;
    if (email && a.email === email) return true;
    return false;
  });
}

/** ล้างรายการปฏิเสธ (สำหรับกรณี "ส่งคำขอใหม่อีกครั้ง") */
export function clearRejectedAccount(
  studentId?: string | null,
  email?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getRejectedAccounts();
    const filtered = list.filter((a) => {
      if (studentId && a.student_id === studentId) return false;
      if (email && a.email === email) return false;
      return true;
    });
    window.localStorage.setItem(REJECTED_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('yp-rejected-accounts-change'));
  } catch {
    // ignore
  }
}

// ── Subscribe helper (สำหรับ component ที่ต้องการ re-render เมื่อ session เปลี่ยน) ──

/**
 * Subscribe การเปลี่ยนแปลงของ pending session และ rejected accounts
 * คืน function สำหรับ unsubscribe
 */
export function subscribePendingSessionChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('yp-pending-session-change', handler);
  window.addEventListener('yp-rejected-accounts-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('yp-pending-session-change', handler);
    window.removeEventListener('yp-rejected-accounts-change', handler);
    window.removeEventListener('storage', handler);
  };
}
