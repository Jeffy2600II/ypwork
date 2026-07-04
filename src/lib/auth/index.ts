// ═══════════════════════════════════════════════════════════════
// YP WORK · Auth Utilities (v1.9 — pending login flow)
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
// v1.9 — Pending login flow (ใหม่):
//   - เมื่อ signInWithPassword ล้มเหลว (ยังไม่มี auth account):
//     1. ตรวจ localStorage ว่า student_id/email นี้เคยถูกปฏิเสธหรือไม่
//        - ถ้าเคย → คืน status: 'rejected'
//     2. ตรวจ council_join_requests ดูมีคำขออยู่หรือไม่
//        - ถ้ามี → คืน status: 'pending' พร้อมข้อมูลคำขอ
//        - ถ้าไม่มี → คืน status: 'not_found' (เพื่อให้ redirect ไป /register)
//   - ผู้ใช้ที่ approved อยู่แล้ว → flow เดิม ไม่เปลี่ยนแปลง
//   - ไม่แก้ฐานข้อมูล — ใช้ localStorage เก็บสถานะ rejected เท่านั้น
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
 * v1.9: ถ้า signIn ล้มเหลว (ยังไม่มี auth account):
 *   - ตรวจ council_join_requests ดูมีคำขออยู่หรือไม่
 *   - ถ้ามี → คืน status='pending' (login เข้าหน้าสถานะได้ แต่ใช้งานเว็บไม่ได้)
 *   - ถ้าไม่มี → คืน status='not_found' (บอกให้ไปสมัคร)
 *   - ถ้าเคยถูกปฏิเสธ (ตรวจจาก localStorage) → คืน status='rejected'
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

    // v1.9: ถ้า signIn ล้มเหลว อาจเป็นเพราะยังไม่มี auth account
    //       (ผู้ใช้ส่งคำขอแล้ว แต่ admin ยังไม่อนุมัติ)
    //       ให้ตรวจ council_join_requests ก่อนตัดสินใจว่า "ไม่มีบัญชี"
    debug.push('v1.9: ตรวจ council_join_requests สำหรับ student_id นี้...');

    // ตรวจ localStorage ก่อนว่าเคยถูกปฏิเสธหรือไม่
    // (dynamic import เพื่อให้ไฟล์นี้ยังใช้ใน server-side ได้)
    let wasRejected = false;
    if (typeof window !== 'undefined') {
      try {
        const { isRejected: checkRejected } = await import('@/lib/pending-session');
        wasRejected = checkRejected(cleanStudent, synEmail);
      } catch {
        // ignore — localStorage อาจไม่พร้อมใช้งาน
      }
    }

    if (wasRejected) {
      debug.push('❌ พบในรายการ rejected (localStorage) → คืน status=rejected');
      return {
        success: false,
        status: 'rejected',
        error: 'คำขอสมัครของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
        debug,
      };
    }

    // ตรวจ council_join_requests ดูมีคำขออยู่หรือไม่
    // (RLS: SELECT authenticated/own — แต่เราใช้ anon client ที่ยังไม่ login
    //  ดังนั้นต้องอาศัย policy "own" ที่อนุญาตให้ผู้ส่งคำขอเห็นของตัวเอง
    //  ในทางปฏิบัติ anon key อาจไม่เห็น — เราจึงตรวจด้วย student_id ที่ซ้ำได้
    //  ถ้า RLS บล็อก → ถือว่า "not found" และบอกให้ไปสมัคร)
    const { data: pendingRow, error: pendingErr } = await supabase
      .from('council_join_requests')
      .select('full_name, student_id, email, national_id, account_type, year, department_id, created_at')
      .eq('student_id', cleanStudent)
      .limit(1)
      .maybeSingle();

    if (pendingErr) {
      debug.push(`❌ query council_join_requests error: ${pendingErr.message}`);
      // ถ้า query ไม่ได้ (RLS บล็อก) ก็บอกว่าไม่พบบัญชี
      return {
        success: false,
        status: 'not_found',
        error: 'ยังไม่มีบัญชีในระบบ — หากเพิ่งส่งคำขอ กรุณารอผู้ดูแลอนุมัติ หรือส่งคำขอใหม่',
        debug,
      };
    }

    if (pendingRow) {
      debug.push(`✅ พบคำขอใน council_join_requests: ${pendingRow.full_name}`);

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

      // คืน status=pending พร้อมข้อมูลคำขอ
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

    // ไม่พบทั้งใน council_users (ผ่าน signIn), ไม่พบใน council_join_requests
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
  return { success: true, status: 'success', user: sessionUser, debug };
}

/**
 * Login สำหรับครู/อื่นๆ: email + password
 *
 * v1.9: ถ้า signIn ล้มเหลว อาจเป็นเพราะยังไม่มี auth account
 *       → ตรวจ council_join_requests ดูมีคำขออยู่หรือไม่
 *       → ถ้ามี → คืน status='pending'
 *       → ถ้าไม่มี → คืน status='not_found'
 *       → ถ้าเคยถูกปฏิเสธ → คืน status='rejected'
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
    // v1.9: ตรวจ localStorage ก่อนว่าเคยถูกปฏิเสธหรือไม่
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

    // ตรวจ council_join_requests ดูมีคำขออยู่หรือไม่ (ใช้ email ตรงๆ)
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
