'use client';

/**
 * ============================================================
 * YP WORK - Auth - Other Login (r48)
 * ============================================================
 * Login flow สำหรับครู/บุคลากรอื่นๆ:
 *   - ใช้ email + password -> sign in ตรงๆ
 * ============================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser, RegisterAccountType } from '@/lib/types';
import { validateEmail, validatePassword } from './validation';
import type { LoginStatus, PendingRequestInfo } from './types';
import { checkStatusViaServerApi } from './check-status';
import { profileToSessionUser } from './session';

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

  // ★ v3.7.7: ใช้ server-side login endpoint แทน client-side signIn
  //   แก้ปัญหา RLS บล็อก council_users query หลัง signIn ใหม่
  try {
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailClean,
        password,
      }),
    });

    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.success && loginData.user) {
      // เคลียร์สถานะ rejected ใน localStorage ถ้ามี
      if (typeof window !== 'undefined') {
        try {
          const { clearRejectedAccount, clearPendingSession } = await import('@/lib/pending-session');
          clearRejectedAccount(null, emailClean);
          clearPendingSession();
        } catch {
          // ignore
        }
      }

      // ตรวจว่าเป็นนักเรียนที่ใช้ช่องผิด — ถ้า account_type เป็น student ให้แจ้งเตือน
      if (loginData.user.account_type === 'student') {
        return {
          success: false,
          status: 'error',
          error: 'บัญชีนักเรียนต้องใช้ช่อง "นักเรียน" เท่านั้น',
        };
      }

      return { success: true, status: 'success', user: loginData.user as SessionUser };
    }

    // server login ล้มเหลว — ตรวจสอบสาเหตุ
    if (loginData.error?.includes('ไม่พบข้อมูลบัญชี') || loginData.error?.includes('อนุมัติ')) {
      const serverResult = await checkStatusViaServerApi(null, emailClean);

      if (serverResult.status === 'pending' && serverResult.pendingRequest) {
        return {
          success: false,
          status: 'pending',
          pendingRequest: serverResult.pendingRequest,
          error: 'การลงทะเบียนของคุณยังอยู่ระหว่างการพิจารณา',
        };
      }
    }

    return {
      success: false,
      status: 'error',
      error: loginData.error || 'เข้าสู่ระบบไม่สำเร็จ',
    };
  } catch (fetchErr) {
    // fallback ไปใช้วิธีเดิม (client-side) ถ้า server endpoint ไม่พร้อม
  }

  // ★ Fallback: client-side signIn (กรณี server endpoint ไม่พร้อม)
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
        error: 'การลงทะเบียนของคุณยังอยู่ระหว่างการพิจารณา',
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
          error: 'การลงทะเบียนของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
        };
      }

      return {
        success: false,
        status: 'not_found',
        error: 'ยังไม่มีบัญชีในระบบ — กรุณาลงทะเบียนก่อน',
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
        error: 'การลงทะเบียนของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
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
        error: 'ยังไม่มีบัญชีในระบบ — กรุณาลงทะเบียนก่อน',
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
      error: 'การลงทะเบียนของคุณยังอยู่ระหว่างการพิจารณา',
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
 *
 * ★ v3.4.0: wrapped ด้วย React cache() — deduplicate ภายใน request เดียว
 *   ก่อนหน้านี้: หน้า Events List เรียก getSessionUser 1 ครั้ง + มี userClient.auth.getUser()
 *   ใน requireUser() อีก 1 ครั้ง = 2 round-trips ต่อ page render
 *   ตอนนี้: cache ตาม auth_uid ที่ได้จาก cookie → 1 round-trip ต่อ page render
 *   ลด TTFB ได้ ~150-300ms ในหน้าที่มี server + API fetch ร่วมกัน
 */
