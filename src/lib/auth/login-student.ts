'use client';

/**
 * ============================================================
 * YP WORK - Auth - Student Login (r48)
 * ============================================================
 * Login flow สำหรับนักเรียน:
 *   1. synthesize email = student_<code>@yplabs.internal
 *   2. signIn ด้วย email + password = student_code
 *   3. หลัง signIn -> query council_users ด้วย auth_uid
 *   4. ตรวจ approved + disabled + national_id ตรงกับที่กรอก
 * ============================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser, RegisterAccountType } from '@/lib/types';
import { synthesizeEmail, validateNationalId, validateStudentCode } from './validation';
import type { LoginStatus, PendingRequestInfo } from './types';
import { checkStatusViaServerApi } from './check-status';
import { profileToSessionUser } from './session';

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
  // ★ v3.0.0: ไม่ log password (cleanStudent เป็นรหัสผ่าน) ลง debug
  debug.push(`signIn: email=${synEmail}, password=***REDACTED***`);

  // ★ v3.7.7: ใช้ server-side login endpoint แทน client-side signIn + query
  //   ปัญหา: หลัง logout แล้ว login ใหม่ RLS policy บน council_users บล็อก
  //   → auth.uid() อาจยังเป็น null ทันหลัง signIn → query คืนค่าว่าง → "ไม่พบบัญชี"
  //
  //   วิธีแก้: เรียก /api/auth/login (server-side) ที่ใช้ adminClient (service role)
  //   → bypass RLS → query council_users ได้แน่นอน
  try {
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: synEmail,
        password: cleanStudent,
        national_id: cleanNational,
      }),
    });

    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.success && loginData.user) {
      debug.push(`✅ server login สำเร็จ uid=${loginData.user.auth_uid?.slice(-6)}`);

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

      return { success: true, status: 'success', user: loginData.user as SessionUser, debug };
    }

    // server login ล้มเหลว — ตรวจสอบสาเหตุ
    debug.push(`❌ server login ล้มเหลว: ${loginData.error || 'unknown'}`);

    // ถ้า error บอก "ไม่พบข้อมูลบัญชี" → อาจเป็น pending → เรียก check-pending-status
    if (loginData.error?.includes('ไม่พบข้อมูลบัญชี') || loginData.error?.includes('อนุมัติ')) {
      debug.push('v3.7.7: เรียก server API /api/auth/check-pending-status...');
      const serverResult = await checkStatusViaServerApi(cleanStudent, synEmail, cleanNational);

      if (serverResult.status === 'pending' && serverResult.pendingRequest) {
        return {
          success: false,
          status: 'pending',
          pendingRequest: serverResult.pendingRequest,
          error: 'การลงทะเบียนของคุณยังอยู่ระหว่างการพิจารณา',
          debug,
        };
      }

      if (serverResult.status === 'error') {
        return {
          success: false,
          status: 'error',
          error: serverResult.error || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
          debug,
        };
      }
    }

    // ส่งกลับ error จาก server
    return {
      success: false,
      status: 'error',
      error: loginData.error || 'เข้าสู่ระบบไม่สำเร็จ',
      debug,
    };
  } catch (fetchErr: any) {
    debug.push(`❌ server login fetch error: ${fetchErr?.message}`);
    // fallback ไปใช้วิธีเดิม (client-side) ถ้า server endpoint ไม่พร้อม
    debug.push('⚠️ fallback ไปใช้ client-side login...');
  }

  // ★ Fallback: client-side signIn (กรณี server endpoint ไม่พร้อม)
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
    //
    // ★ v3.0.0: ส่ง national_id ไปด้วย → server ตรวจ match ฝั่ง server
    //   (เดิมใช้ client-side check ที่ต้องได้ national_id กลับมาจาก API → PII leak risk)
    debug.push('v3.0.0: เรียก server API /api/auth/check-pending-status (with national_id verify)...');

    const serverResult = await checkStatusViaServerApi(cleanStudent, synEmail, cleanNational);
    debug.push(`server API ตอบ: status=${serverResult.status}`);

    // ★ v3.0.0: ถ้า server ตอบ error (เช่น national_id mismatch) → ส่งต่อ error
    if (serverResult.status === 'error') {
      debug.push(`❌ server ตอบ error: ${serverResult.error}`);
      return {
        success: false,
        status: 'error',
        error: serverResult.error || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
        debug,
      };
    }

    if (serverResult.status === 'pending' && serverResult.pendingRequest) {
      debug.push(`✅ พบคำขอใน council_join_requests: ${serverResult.pendingRequest.full_name}`);

      // ★ v3.0.0: ไม่ต้องเช็ค national_id ฝั่ง client อีก — server ตรวจไปแล้ว
      // ถ้า server ผ่านมาถึงตรงนี้ = national_id ตรง (หรือไม่มีใน DB)

      return {
        success: false,
        status: 'pending',
        pendingRequest: serverResult.pendingRequest,
        error: 'การลงทะเบียนของคุณยังอยู่ระหว่างการพิจารณา',
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
          error: 'การลงทะเบียนของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
          debug,
        };
      }

      return {
        success: false,
        status: 'not_found',
        error: 'ยังไม่มีบัญชีในระบบ — กรุณาลงทะเบียนก่อน',
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
        error: 'การลงทะเบียนของคุณยังอยู่ระหว่างการพิจารณา',
        debug,
      };
    }

    // Fallback: ไม่พบคำขอ (อาจเพราะ RLS บล็อก หรือไม่มีจริง)
    if (wasRejected) {
      debug.push('❌ พบในรายการ rejected (localStorage) → คืน status=rejected');
      return {
        success: false,
        status: 'rejected',
        error: 'การลงทะเบียนของคุณถูกปฏิเสธ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล',
        debug,
      };
    }

    debug.push('❌ ไม่พบคำขอ → คืน status=not_found');
    return {
      success: false,
      status: 'not_found',
      error: 'ยังไม่มีบัญชีในระบบ — กรุณาลงทะเบียนก่อน',
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
  // ★ v3.0.0: ไม่ log ค่า national_id จริง ๆ ลง debug (PII protection)
  debug.push('ตรวจ national_id match (ค่าจริงถูกซ่อนเพื่อความปลอดภัย)');
  if (profile.national_id !== undefined && profile.national_id !== null && profile.national_id !== '') {
    if (String(profile.national_id).trim() !== cleanNational.trim()) {
      debug.push('❌ national_id ไม่ตรงกับข้อมูลในระบบ');
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
