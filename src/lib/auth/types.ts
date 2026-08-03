/**
 * ============================================================
 * YP WORK - Auth - Types (r48)
 * ============================================================
 * Login status + pending request info types
 * ============================================================
 */

import type { RegisterAccountType } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════
// v1.9 — Pending login types
// ═══════════════════════════════════════════════════════════════

/** สถานะการ login — ใช้ใน v1.9 flow */
export type LoginStatus =
  | 'success'        // login สำเร็จ (approved user)
  | 'pending'        // มีคำขออยู่ใน council_join_requests แต่ยังไม่ approve
  | 'rejected'       // เคยถูกปฏิเสธ (จาก localStorage)
  | 'not_found'      // ไม่พบบัญชีหรือคำขอ → แนะนำให้สมัคร
  | 'error';         // error อื่น ๆ (เช่น national_id ไม่ตรง)

/** ข้อมูลคำขอที่ยัง pending (ใช้ในหน้า /pending-status) */
export interface PendingRequestInfo {
  full_name: string;
  student_id: string | null;
  email: string | null;
  national_id: string | null;
  account_type: RegisterAccountType;
  year: number | null;
  department_id: string | null;
  submitted_at: string | null;
}

export interface ServerStatusResult {
  status: 'pending' | 'approved' | 'rejected' | 'unknown' | 'error';
  error?: string;
  pendingRequest?: PendingRequestInfo;
}
