// ═══════════════════════════════════════════════════════════════
// YP WORK · Auth Utilities (v1.9.2 — pending login flow FIXED)
// ═══════════════════════════════════════════════════════════════
// Auth flow (เหมือน YP Labs ที่ใช้งานได้จริง):
// - นักเรียน: กรอก national_id (13 หลัก) + student_code (5 หลัก)
//   1. synthesize email = student_<code>@yplabs.internal
//   2. signIn ด้วย email + password = student_code (ก่อน query DB)
//      เหตุผล: council_users มี RLS — authenticated เท่านั้นที่อ่านได้
//   3. หลัง signIn → query council_users ด้วย auth_uid
//   4. ตรวจ approved + disabled + national_id ตรงกับที่กรอก
// - ครู/อื่นๆ: ใช้ email + password → sign in ตรงๆ
//
// v1.9.2 — Pending login flow (CRITICAL FIX):
//   ★ Bug ก่อนหน้านี้: ถ้า signIn ล้มเหลว ระบบเช็ค isRejected (localStorage)
//     ก่อน → ถ้า true คืน 'rejected' ทันทีโดยไม่เช็ค council_join_requests
//     แม้ว่า row จะยังอยู่ในตาราง (แปลว่ายัง pending อยู่)
//
//   ★ Bug อีกตัว: ระบบใช้ client (anon key) SELECT council_join_requests
//     แต่ RLS บล็อก anon users → คืน null → ตีความเป็น 'not_found'
//     ทั้งที่จริง row มีอยู่
//
//   ★ Fix v1.9.2:
//     1. ใช้ server API (/api/auth/check-pending-status) ที่ใช้ service role
//        (bypass RLS) เพื่อตรวจสอบสถานะที่แน่นอน
//     2. Logic ใหม่ (ถูกต้องตาม requirement ของ user):
//        - ถ้ามี row ใน council_join_requests = pending เสมอ (ยังไม่ถูกอนุมัติ/ปฏิเสธ)
//        - ถ้าไม่มี row ใน council_join_requests:
//          - ถ้าอยู่ใน council_users (approved) = approved
//          - ถ้าไม่อยู่ = rejected (หรือไม่เคยสมัคร)
//     3. isRejected (localStorage) ใช้เป็น hint เท่านั้น ไม่ใช่ source of truth
//        ถ้า server API บอกว่า pending → คืน pending แม้ว่า localStorage จะบอก rejected
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser, UserProfile, RegisterAccountType } from '@/lib/types';

/** สังเคราะห์ email จากรหัสนักเรียน (เหมือน YP Labs) */
export function synthesizeEmail(studentId: string): string {
  return `student_${studentId}@yplabs.internal`;
}

/** Validate national ID (13 หลัก) */
export function validateNationalId(nationalId: string): boolean {
  return /^\d{13}$/.test(nationalId.replace(/\D/g, ''));
}

/** Validate student code (5 หลัก) */
export function validateStudentCode(studentCode: string): boolean {
  return /^\d{5}$/.test(studentCode.replace(/\D/g, ''));
}

/** Validate email format */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validate password (≥6 ตัว) */
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

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

interface ServerStatusResult {
  status: 'pending' | 'approved' | 'rejected' | 'unknown';
  pendingRequest?: PendingRequestInfo;
}

async function checkStatusViaServerApi(
  studentId: string | null,
  email: string | null
): Promise<ServerStatusResult> {
  if (!studentId && !email) return { status: 'unknown' };

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
      console.error('[checkStatusViaServerApi] HTTP error:', res.status);
      return { status: 'unknown' };
    }

    const data = await res.json();

    if (data.status === 'pending' && data.request) {
      return {
        status: 'pending',
        pendingRequest: {
          full_name: data.request.full_name,
          student_id: data.request.student_id ?? studentId,
          email: data.request.email ?? email,
          national_id: data.request.national_id ?? null,
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

/**
 * Login สำหรับนักเรียน: national_id + student_code
 *
 * Flow (เหมือน YP Labs — ใช้งานได้จริง):
 * 1. synthesize email = student_<code>@yplabs.internal
 * 2. signIn ด้วย email + password = student_code
 *    (ก่อน query DB เพราะ council_users มี RLS ต้อง authenticated)
 * 3. หลัง signIn → query council_users ด้วย auth_uid
 * 4. ตรวจ approved + disabled
 * 5. ตรวจ national_id ตรงกับที่กรอก (ถ้ามีใน DB)
 *
 * v1.9.2: ถ้า signIn ล้มเหลว (ยังไม่มี auth account):
 *   - เรียก server API (/api/auth/check-pending-status) ซึ่งใช้ service role
 *     bypass RLS → ได้ผลที่แน่นอน
 *   - ถ้า server API บอก 'pending' → คืน pending (แม้ localStorage จะบอก rejected)
 *   - ถ้า server API บอก 'rejected' → คืน rejected
 *   - ถ้า server API บอก 'approved' → บอก user ลอง login ใหม่ (auth account พร้อมแล้ว)
 *   - ถ้า server API ไม่ทำงาน → fallback ไปใช้วิธีเดิม (RLS-blocked)
 *
 * debug info จะถูกส่งกลับในกรณีล้มเหลว เพื่อให้เห็นว่าเกิดอะไรขึ้น
 */
export async function loginStudent(
  supabase: SupabaseClient,
  nationalId: string,
  studentCode: string
): Promise<{ success: boolean; status?: LoginStatus; user?: SessionUser; pendingRequest?: PendingRequestInfo; error?: string; debug?: string[] }> {
  const debug: string[] = [];
  const cleanNational = nationalId.replace(/\D/g, '');
  const cleanStudent = studentCode.replace(/\D/g, '');

  if (!validateNationalId(cleanNational)) {
    debug.push('validate: nationalId ไม่ครบ 13 หลัก');
    return { success: false, error: 'เลขบัตรประชาชนต้องมี 13 หลัก', debug };
  }
  if (!validateStudentCode(cleanStudent)) {
    debug.push('validate: studentCode ไม่ครบ 5 หลัก');
    return { success: false, error: 'รหัสนักเรียนต้องมี 5 หลัก', debug };
  }

  // 1. Sign in ก่อน — synthesize email + student_code เป็น password
  const synEmail = synthesizeEmail(cleanStudent);
  debug.push(`signIn: email=${synEmail}, password=${cleanStudent}`);
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: synEmail,
    password: cleanStudent,
  });

  if (signInErr || !signInData?.user) {
    debug.push(`❌ signIn ล้มเหลว: ${signInErr?.message ?? 'no user returned'}`);
    debug.push(`   code: ${signInErr?.code ?? 'n/a'}`);
    debug.push(`   status: ${signInErr?.status ?? 'n/a'}`);

    // v1.9.2: เรียก server API เพื่อตรวจสอบสถานะที่แน่นอน
    //   - ใช้ service role bypass RLS → ไม่ติดปัญหาanon SELECT blocked
    //   - ถ้า row มีอยู่ใน council_join_requests = pending เสมอ
    debug.push('v1.9.2: เรียก server API /api/auth/check-pending-status...');

    const serverResult = await checkStatusViaServerApi(cleanStudent, synEmail);
    debug.push(`server API ตอบ: status=${serverResult.status}`);

    if (serverResult.status === 'pending' && serverResult.pendingRequest) {
      debug.push(`✅ พบคำขอใน council_join_requests: ${serverResult.pendingRequest.full_name}`);

      // ตรวจ national_id ตรงกับที่กรอก (ถ้ามีใน DB)
      if (
        serverResult.pendingRequest.national_id &&
        String(serverResult.pendingRequest.national_id).trim() !== ''
      ) {
        if (String(serverResult.pendingRequest.national_id).trim() !== cleanNational.trim()) {
          debug.push('❌ national_id ในคำขอไม่ตรงกับที่กรอก');
          return {
            success: false,
            status: 'error',
            error: 'เลขบัตรประชาชนไม่ตรงกับคำขอที่ส่งไว้',
            debug,
          };
        }
      }

      return {
        success: false,
        status: 'pending',
        pendingRequest: serverResult.pendingRequest,
        error: 'คำขอสมัครของคุณยังอยู่ระหว่างการพิจารณา',
        debug,
      };
    }

    if (serverResult.status === 'approved') {
      // server API บอก approved แต่ signIn ล้มเหลว — อาจเป็น auth account issue
      // แนะนำให้ user ลอง login ใหม่อีกครั้ง
      debug.push('⚠️ server API บอก approved แต่ signIn ล้มเหลว — แนะนำให้ลองใหม่');
      return {
        success: false,
        status: 'error',
        error: 'บัญชีได้รับการอนุมัติแล้ว แต่ยังเข้าสู่ระบบไม่ได้ — กรุณาลองอีกครั้ง',
        debug,
      };
    }

    if (serverResult.status === 'rejected') {
      debug.push('❌ server API ยืนยัน: ไม่พบคำขอและไม่พบบัญชี → rejected/not_found');

      // ใช้ localStorage เป็น hint เพื่อแยก 'rejected' vs 'not_found'
      // ถ้าเคยถูกปฏิเสธ → คืน 'rejected'
      // ถ้าไม่เคย → คืน 'not_found' (เพื่อแนะนำให้สมัคร)
      let wasRejected = false;
      if (typeof window !== 'undefined') {
        try {
          const { isRejected: checkRejected } = await import('@/lib/pending-session');
          wasRejected = checkRejected(cleanStudent, synEmail);
        } catch {
          // ignore
        }
      }

      if (wasRejected) {
        debug.push('localStorage ระบุ: เคยถูกปฏิเสธ → status=rejected');
        return {
          success: false,
          status: 'rejected',
          error: 'คำขอสมัครของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
          debug,
        };
      }

      return {
        success: false,
        status: 'not_found',
        error: 'ยังไม่มีบัญชีในระบบ — กรุณาส่งคำขอสมัครก่อน',
        debug,
      };
    }

    // server API ไม่ทำงาน (unknown) → fallback ไปใช้วิธีเดิม
    debug.push('⚠️ server API ไม่ทำงาน — fallback ไปใช้วิธีเดิม (RLS-blocked)');

    // ตรวจ localStorage ก่อนว่าเคยถูกปฏิเสธหรือไม่
    let wasRejected = false;
    if (typeof window !== 'undefined') {
      try {
        const { isRejected: checkRejected } = await import('@/lib/pending-session');
        wasRejected = checkRejected(cleanStudent, synEmail);
      } catch {
        // ignore — localStorage อาจไม่พร้อมใช้งาน
      }
    }

    // ตรวจ council_join_requests ด้วย client (อาจ RLS บล็อก)
    const { data: pendingRow, error: pendingErr } = await supabase
      .from('council_join_requests')
      .select('full_name, student_id, email, national_id, account_type, year, department_id, created_at')
      .eq('student_id', cleanStudent)
      .limit(1)
      .maybeSingle();

    if (pendingErr) {
      debug.push(`❌ query council_join_requests error: ${pendingErr.message}`);
    }

    if (pendingRow) {
      debug.push(`✅ พบคำขอ (fallback): ${pendingRow.full_name}`);

      // ตรวจ national_id ตรงกับที่กรอก (ถ้ามีใน DB)
      if (
        pendingRow.national_id !== undefined &&
        pendingRow.national_id !== null &&
        String(pendingRow.national_id).trim() !== ''
      ) {
        if (String(pendingRow.national_id).trim() !== cleanNational.trim()) {
          debug.push('❌ national_id ในคำขอไม่ตรงกับที่กรอก');
          return {
            success: false,
            status: 'error',
            error: 'เลขบัตรประชาชนไม่ตรงกับคำขอที่ส่งไว้',
            debug,
          };
        }
      }

      const pendingInfo: PendingRequestInfo = {
        full_name: pendingRow.full_name,
        student_id: pendingRow.student_id ?? cleanStudent,
        email: pendingRow.email ?? synEmail,
        national_id: pendingRow.national_id ?? cleanNational,
        account_type: (pendingRow.account_type || 'student') as RegisterAccountType,
        year: pendingRow.year ?? null,
        department_id: pendingRow.department_id ?? null,
        submitted_at: pendingRow.created_at ?? null,
      };

      return {
        success: false,
        status: 'pending',
        pendingRequest: pendingInfo,
        error: 'คำขอสมัครของคุณยังอยู่ระหว่างการพิจารณา',
        debug,
      };
    }

    // Fallback: ไม่พบคำขอ (อาจเพราะ RLS บล็อก หรือไม่มีจริง)
    if (wasRejected) {
      debug.push('❌ พบในรายการ rejected (localStorage) → คืน status=rejected');
      return {
        success: false,
        status: 'rejected',
        error: 'คำขอสมัครของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
        debug,
      };
    }

    debug.push('❌ ไม่พบคำขอ → คืน status=not_found');
    return {
      success: false,
      status: 'not_found',
      error: 'ยังไม่มีบัญชีในระบบ — กรุณาส่งคำขอสมัครก่อน',
      debug,
    };
  }

  debug.push(`✅ signIn สำเร็จ uid=${signInData.user.id.slice(-6)}`);

  // 2. หลัง signIn สำเร็จ → query council_users ด้วย auth_uid
  debug.push('query council_users...');
  const { data: profile, error: profileErr } = await supabase
    .from('council_users')
    .select('*')
    .eq('auth_uid', signInData.user.id)
    .limit(1)
    .maybeSingle();

  if (profileErr) {
    debug.push(`❌ query error: ${profileErr.message}`);
    debug.push(`   code: ${profileErr.code ?? 'n/a'}`);
    debug.push(`   hint: ${profileErr.hint ?? 'n/a'}`);
    await supabase.auth.signOut();
    return { success: false, error: `เกิดข้อผิดพลาด: ${profileErr.message}`, debug };
  }
  if (!profile) {
    debug.push('❌ ไม่พบ row ใน council_users (RLS อาจบล็อก หรือ auth_uid ไม่ตรง)');
    await supabase.auth.signOut();
    return { success: false, error: 'ไม่พบข้อมูลบัญชีในระบบ', debug };
  }

  debug.push(`✅ พบ profile: ${profile.full_name}, role=${profile.role}, account_type=${profile.account_type}`);

  if (!profile.approved) {
    debug.push('❌ approved=false — บัญชียังไม่ได้รับการอนุมัติ');
    await supabase.auth.signOut();
    return { success: false, error: 'บัญชียังไม่ได้รับการอนุมัติ', debug };
  }
  if (profile.disabled) {
    debug.push('❌ disabled=true — บัญชีถูกปิดใช้งาน');
    await supabase.auth.signOut();
    return { success: false, error: 'บัญชีถูกปิดใช้งาน', debug };
  }

  // 3. ตรวจ national_id ตรงกับที่กรอก (ถ้ามีใน DB)
  debug.push(`ตรวจ national_id: DB="${profile.national_id}" vs input="${cleanNational}"`);
  if (profile.national_id !== undefined && profile.national_id !== null && profile.national_id !== '') {
    if (String(profile.national_id).trim() !== cleanNational.trim()) {
      debug.push('❌ national_id ไม่ตรง');
      await supabase.auth.signOut();
      return { success: false, error: 'เลขบัตรประชาชนไม่ตรงกับข้อมูลในระบบ', debug };
    }
    debug.push('✅ national_id ตรง');
  } else {
    debug.push('⚠️ DB ไม่มี national_id — ข้ามการตรวจ (ใช้ student_code ที่ signIn ผ่านแล้ว)');
  }

  // 4. สร้าง SessionUser
  const sessionUser = profileToSessionUser(profile);
  debug.push('✅ login สำเร็จ — สร้าง session');

  // เคลียร์สถานะ rejected ใน localStorage ถ้ามี (เพราะ login สำเร็จแล้ว)
  if (typeof window !== 'undefined') {
    try {
      const { clearRejectedAccount, clearPendingSession } = await import('@/lib/pending-session');
      clearRejectedAccount(cleanStudent, synEmail);
      clearPendingSession();
    } catch {
      // ignore
    }
  }

  return { success: true, status: 'success', user: sessionUser, debug };
}

/**
 * Login สำหรับครู/อื่นๆ: email + password
 *
 * v1.9.2: ถ้า signIn ล้มเหลว → เรียก server API เพื่อตรวจสอบสถานะที่แน่นอน
 *   - ใช้ service role (bypass RLS) → ไม่ติดปัญหา anon SELECT blocked
 *   - ถ้า server API บอก 'pending' → คืน pending
 *   - ถ้า server API บอก 'rejected' → คืน rejected/not_found (ใช้ localStorage เป็น hint)
 *   - ถ้า server API ไม่ทำงาน → fallback ไปใช้วิธีเดิม
 */
export async function loginOther(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ success: boolean; status?: LoginStatus; user?: SessionUser; pendingRequest?: PendingRequestInfo; error?: string }> {
  const emailClean = email.trim();

  if (!validateEmail(emailClean)) {
    return { success: false, status: 'error', error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (!validatePassword(password)) {
    return { success: false, status: 'error', error: 'รหัสผ่านต้องไม่น้อยกว่า 6 ตัว' };
  }

  // 1. Sign in ด้วย Supabase Auth
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: emailClean,
    password,
  });

  if (signInErr || !signInData?.user) {
    // v1.9.2: เรียก server API เพื่อตรวจสอบสถานะที่แน่นอน
    const serverResult = await checkStatusViaServerApi(null, emailClean);

    if (serverResult.status === 'pending' && serverResult.pendingRequest) {
      return {
        success: false,
        status: 'pending',
        pendingRequest: serverResult.pendingRequest,
        error: 'คำขอสมัครของคุณยังอยู่ระหว่างการพิจารณา',
      };
    }

    if (serverResult.status === 'approved') {
      return {
        success: false,
        status: 'error',
        error: 'บัญชีได้รับการอนุมัติแล้ว แต่ยังเข้าสู่ระบบไม่ได้ — กรุณาลองอีกครั้ง',
      };
    }

    if (serverResult.status === 'rejected') {
      // ใช้ localStorage เป็น hint
      let wasRejected = false;
      if (typeof window !== 'undefined') {
        try {
          const { isRejected: checkRejected } = await import('@/lib/pending-session');
          wasRejected = checkRejected(null, emailClean);
        } catch {
          // ignore
        }
      }

      if (wasRejected) {
        return {
          success: false,
          status: 'rejected',
          error: 'คำขอสมัครของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
        };
      }

      return {
        success: false,
        status: 'not_found',
        error: 'ยังไม่มีบัญชีในระบบ — กรุณาส่งคำขอสมัครก่อน',
      };
    }

    // server API ไม่ทำงาน (unknown) → fallback ไปใช้วิธีเดิม
    let wasRejected = false;
    if (typeof window !== 'undefined') {
      try {
        const { isRejected: checkRejected } = await import('@/lib/pending-session');
        wasRejected = checkRejected(null, emailClean);
      } catch {
        // ignore
      }
    }

    if (wasRejected) {
      return {
        success: false,
        status: 'rejected',
        error: 'คำขอสมัครของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
      };
    }

    // ตรวจ council_join_requests ด้วย client (อาจ RLS บล็อก)
    const { data: pendingRow, error: pendingErr } = await supabase
      .from('council_join_requests')
      .select('full_name, student_id, email, national_id, account_type, year, department_id, created_at')
      .eq('email', emailClean)
      .limit(1)
      .maybeSingle();

    if (pendingErr || !pendingRow) {
      // ไม่พบคำขอ → บอกให้ไปสมัคร
      return {
        success: false,
        status: 'not_found',
        error: 'ยังไม่มีบัญชีในระบบ — กรุณาส่งคำขอสมัครก่อน',
      };
    }

    // พบคำขอ → คืน status=pending
    const pendingInfo: PendingRequestInfo = {
      full_name: pendingRow.full_name,
      student_id: pendingRow.student_id ?? null,
      email: pendingRow.email ?? emailClean,
      national_id: pendingRow.national_id ?? null,
      account_type: (pendingRow.account_type || 'other') as RegisterAccountType,
      year: pendingRow.year ?? null,
      department_id: pendingRow.department_id ?? null,
      submitted_at: pendingRow.created_at ?? null,
    };

    return {
      success: false,
      status: 'pending',
      pendingRequest: pendingInfo,
      error: 'คำขอสมัครของคุณยังอยู่ระหว่างการพิจารณา',
    };
  }

  // 2. ดึง profile จาก council_users
  const { data: profile, error: profileErr } = await supabase
    .from('council_users')
    .select('*')
    .eq('auth_uid', signInData.user.id)
    .limit(1)
    .maybeSingle();

  if (profileErr || !profile) {
    await supabase.auth.signOut();
    return { success: false, status: 'error', error: 'บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ' };
  }
  if (!profile.approved) {
    await supabase.auth.signOut();
    return { success: false, status: 'error', error: 'บัญชียังไม่ได้รับการอนุมัติ' };
  }
  if (profile.disabled) {
    await supabase.auth.signOut();
    return { success: false, status: 'error', error: 'บัญชีถูกปิดใช้งาน' };
  }
  if ((profile.account_type || '').toLowerCase().startsWith('stud')) {
    await supabase.auth.signOut();
    return { success: false, status: 'error', error: 'บัญชีนักเรียนต้องใช้ช่อง "นักเรียน" เท่านั้น' };
  }

  // 3. สร้าง SessionUser
  const sessionUser = profileToSessionUser(profile);

  // v1.9.2: เคลียร์สถานะ rejected/pending ใน localStorage (login สำเร็จแล้ว)
  if (typeof window !== 'undefined') {
    try {
      const { clearRejectedAccount, clearPendingSession } = await import('@/lib/pending-session');
      clearRejectedAccount(null, emailClean);
      clearPendingSession();
    } catch {
      // ignore
    }
  }

  return { success: true, status: 'success', user: sessionUser };
}

/**
 * ดึง SessionUser ปัจจุบันจาก Supabase session
 * ใช้ใน Server Components / middleware
 */
export async function getSessionUser(
  supabase: SupabaseClient
): Promise<SessionUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('council_users')
    .select('*')
    .eq('auth_uid', user.id)
    .limit(1)
    .maybeSingle();

  if (!profile || !profile.approved || profile.disabled) {
    return null;
  }

  return profileToSessionUser(profile);
}

/** แปลง council_users row → SessionUser */
function profileToSessionUser(profile: any): SessionUser {
  return {
    auth_uid: profile.auth_uid,
    full_name: profile.full_name,
    student_id: profile.student_id || null,
    national_id: profile.national_id || null,
    year: profile.year || null,
    role: profile.role || 'member',
    account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
    email: profile.email || '',
    department_id: profile.department_id || null,
    color: profile.color || '#4F46E5',
  };
}

/** แปลง council_users row → UserProfile */
export function profileToUserProfile(profile: any): UserProfile {
  return {
    auth_uid: profile.auth_uid,
    full_name: profile.full_name,
    student_id: profile.student_id || null,
    national_id: profile.national_id || null,
    year: profile.year || null,
    role: profile.role || 'member',
    account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
    approved: profile.approved ?? false,
    disabled: profile.disabled ?? false,
    email: profile.email || '',
    department_id: profile.department_id || null,
    color: profile.color || '#4F46E5',
  };
}
