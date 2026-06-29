// ═══════════════════════════════════════════════════════════════
// YP WORK · Auth Utilities
// ═══════════════════════════════════════════════════════════════
// Auth flow (เหมือน YP Labs ที่ใช้งานได้จริง):
// - นักเรียน: กรอก national_id (13 หลัก) + student_code (5 หลัก)
//   1. synthesize email = student_<code>@yplabs.internal
//   2. signIn ด้วย email + password = student_code (ก่อน query DB)
//      เหตุผล: council_users มี RLS — authenticated เท่านั้นที่อ่านได้
//   3. หลัง signIn → query council_users ด้วย auth_uid
//   4. ตรวจ approved + disabled + national_id ตรงกับที่กรอก
// - ครู/อื่นๆ: ใช้ email + password → sign in ตรงๆ
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser, UserProfile } from '@/lib/types';

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
 * debug info จะถูกส่งกลับในกรณีล้มเหลว เพื่อให้เห็นว่าเกิดอะไรขึ้น
 */
export async function loginStudent(
  supabase: SupabaseClient,
  nationalId: string,
  studentCode: string
): Promise<{ success: boolean; user?: SessionUser; error?: string; debug?: string[] }> {
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
    return {
      success: false,
      error: 'รหัสนักเรียนไม่ถูกต้อง หรือยังไม่มีบัญชีในระบบ',
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
  return { success: true, user: sessionUser, debug };
}

/**
 * Login สำหรับครู/อื่นๆ: email + password
 */
export async function loginOther(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  const emailClean = email.trim();

  if (!validateEmail(emailClean)) {
    return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (!validatePassword(password)) {
    return { success: false, error: 'รหัสผ่านต้องไม่น้อยกว่า 6 ตัว' };
  }

  // 1. Sign in ด้วย Supabase Auth
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: emailClean,
    password,
  });

  if (signInErr || !signInData?.user) {
    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
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
    return { success: false, error: 'บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ' };
  }
  if (!profile.approved) {
    await supabase.auth.signOut();
    return { success: false, error: 'บัญชียังไม่ได้รับการอนุมัติ' };
  }
  if (profile.disabled) {
    await supabase.auth.signOut();
    return { success: false, error: 'บัญชีถูกปิดใช้งาน' };
  }
  if ((profile.account_type || '').toLowerCase().startsWith('stud')) {
    await supabase.auth.signOut();
    return { success: false, error: 'บัญชีนักเรียนต้องใช้ช่อง "นักเรียน" เท่านั้น' };
  }

  // 3. สร้าง SessionUser
  const sessionUser = profileToSessionUser(profile);
  return { success: true, user: sessionUser };
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
