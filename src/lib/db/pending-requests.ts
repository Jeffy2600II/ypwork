// ═══════════════════════════════════════════════════════════════
// YP WORK · Pending Requests Data Access (v1.9.1)
// ═══════════════════════════════════════════════════════════════
// ชุดฟังก์ชันสำหรับเข้าถึง/จัดการการลงทะเบียนใน council_join_requests
//
// การออกแบบนี้ดัดแปลงจาก reference repo (admin-sc-yp) ที่ใช้งานจริง:
//   - getPendingRequests(): อ่านรายการคำขอทั้งหมด (RLS อนุญาต authenticated SELECT)
//   - getPendingRequestById(): อ่านคำขอเฉพาะ
//   - getPendingRequestByStudentId(): อ่านคำขอด้วย student_id (ใช้ใน pending-status)
//   - getPendingRequestByEmail(): อ่านคำขอด้วย email
//   - approveRequest(): อนุมัติคำขอ → สร้าง auth user + council_users row + ลบคำขอ
//   - rejectRequest(): ปฏิเสธคำขอ → ลบคำขอออกจาก DB
//
// ⚠️ approveRequest และ rejectRequest ต้องใช้ adminClient (service role)
//    เนื่องจาก RLS บล็อก authenticated users จากการ DELETE
//    การ INSERT ลง council_users ก็ต้องใช้ adminClient ด้วยเหตุผลเดียวกัน
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import { synthesizeEmail } from '@/lib/auth';

type Client = SupabaseClient<any, any, any>;

/** ข้อมูลการลงทะเบียนที่ดึงมาจาก council_join_requests */
export interface PendingRequest {
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

/**
 * ดึงการลงทะเบียนทั้งหมด (เรียงตาม created_at ล่าสุดก่อน)
 *
 * ใช้ได้จาก client (RLS อนุญาต authenticated SELECT)
 * แต่โดยทั่วไปใช้จาก server เพื่อความปลอดภัย
 */
export async function getPendingRequests(
  supabase: Client
): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from('council_join_requests')
    .select(
      'id, full_name, student_id, year, email, message, account_type, national_id, department_id, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPendingRequests]', error);
    return [];
  }

  return (data as PendingRequest[]) || [];
}

/** ดึงการลงทะเบียนเฉพาะด้วย id */
export async function getPendingRequestById(
  supabase: Client,
  requestId: string
): Promise<PendingRequest | null> {
  const { data, error } = await supabase
    .from('council_join_requests')
    .select(
      'id, full_name, student_id, year, email, message, account_type, national_id, department_id, created_at'
    )
    .eq('id', requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PendingRequest;
}

/** ดึงการลงทะเบียนด้วย student_id (นักเรียน) */
export async function getPendingRequestByStudentId(
  supabase: Client,
  studentId: string
): Promise<PendingRequest | null> {
  const { data, error } = await supabase
    .from('council_join_requests')
    .select(
      'id, full_name, student_id, year, email, message, account_type, national_id, department_id, created_at'
    )
    .eq('student_id', studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PendingRequest;
}

/** ดึงการลงทะเบียนด้วย email (ครู/อื่นๆ) */
export async function getPendingRequestByEmail(
  supabase: Client,
  email: string
): Promise<PendingRequest | null> {
  const { data, error } = await supabase
    .from('council_join_requests')
    .select(
      'id, full_name, student_id, year, email, message, account_type, national_id, department_id, created_at'
    )
    .eq('email', email)
    .maybeSingle();

  if (error || !data) return null;
  return data as PendingRequest;
}

/**
 * นับจำนวนการลงทะเบียนที่ยัง pending
 * ใช้สำหรับแสดง badge ในหน้า admin (เช่น "3 คำขอรออนุมัติ")
 */
export async function countPendingRequests(
  supabase: Client
): Promise<number> {
  const { count, error } = await supabase
    .from('council_join_requests')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('[countPendingRequests]', error);
    return 0;
  }

  return count || 0;
}

// ═══════════════════════════════════════════════════════════════
// Admin operations — ต้องใช้ adminClient (service role)
// ═══════════════════════════════════════════════════════════════

export interface ApproveRequestResult {
  success: boolean;
  error?: string;
}

/**
 * อนุมัติการลงทะเบียน — ใช้ service-role adminClient (bypass RLS)
 *
 * Steps:
 * 1. ดึงคำขอจาก council_join_requests
 * 2. สร้าง Supabase Auth user (adminClient.auth.admin.createUser)
 *    - ถ้า email ซ้ำ → ใช้ auth account ที่มีอยู่ (ถ้าไม่มี council_users row)
 * 3. INSERT council_users row
 * 4. DELETE คำขอจาก council_join_requests
 *
 * @param adminClient  - Service-role Supabase client
 * @param requestId    - UUID ของคำขอที่จะอนุมัติ
 */
export async function approveRequest(
  adminClient: Client,
  requestId: string
): Promise<ApproveRequestResult> {
  // 1. ดึงคำขอ
  const { data: request, error: fetchError } = await adminClient
    .from('council_join_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'ไม่พบคำขอนี้' };
  }

  const req = request as PendingRequest & { password?: string | null };

  // 2. กำหนด email + password สำหรับสร้าง auth user
  //    นักเรียน: email = synthesizeEmail(student_id), password = student_id
  //    ครู/อื่นๆ: email = req.email, password = req.password (หรือ default)
  let email: string;
  let password: string;

  if (req.account_type === 'student' && req.student_id) {
    email = synthesizeEmail(req.student_id);
    password = req.student_id;
  } else {
    email = req.email || `${req.full_name.replace(/\s+/g, '.').toLowerCase()}@yplabs.internal`;
    password = req.password || '123456';
    if (password.length < 6) {
      password = password.padEnd(6, '0');
    }
  }

  // 3. สร้าง Supabase Auth user
  const {
    data: authUser,
    error: authError,
  } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let finalAuthUid: string;

  if (authError || !authUser.user) {
    const errMsg = authError?.message || '';

    // ถ้า email ซ้ำ → ใช้ auth account ที่มีอยู่ (ถ้ายังไม่มี council_users row)
    if (errMsg.includes('already been registered') || errMsg.includes('already registered')) {
      const { data: existingUsers, error: listError } =
        await adminClient.auth.admin.listUsers();

      if (listError) {
        return { success: false, error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}` };
      }

      const existingUser = (existingUsers.users || []).find((u) => u.email === email);
      if (!existingUser) {
        return { success: false, error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}` };
      }

      // ตรวจว่า auth account นี้มี council_users row แล้วหรือยัง
      const { data: existingCouncilUser } = await adminClient
        .from('council_users')
        .select('id, full_name')
        .eq('auth_uid', existingUser.id)
        .maybeSingle();

      if (existingCouncilUser) {
        return {
          success: false,
          error: `บัญชีนี้ถูกสร้างไปแล้วสำหรับ "${existingCouncilUser.full_name}" — ไม่สามารถอนุมัติคำขอซ้ำได้`,
        };
      }

      // ใช้ auth account ที่มีอยู่ — อัปเดต password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true }
      );

      if (updateError) {
        return {
          success: false,
          error: `ไม่สามารถอัปเดตบัญชี Auth ที่มีอยู่ได้: ${updateError.message}`,
        };
      }

      finalAuthUid = existingUser.id;
    } else {
      return { success: false, error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}` };
    }
  } else {
    finalAuthUid = authUser.user.id;
  }

  // 4. INSERT council_users row
  //    สำหรับนักเรียน: ไม่ insert email จริง (ใช้ synthesize email ในการ login)
  //    สำหรับครู/อื่นๆ: insert email จริง
  const insertPayload: Record<string, any> = {
    auth_uid: finalAuthUid,
    full_name: req.full_name,
    student_id: req.student_id || '',
    email: req.account_type === 'student' ? '' : (req.email || email),
    year: req.year,
    role: 'member',
    approved: true,
    disabled: false,
    account_type: req.account_type,
    department_id: req.department_id || null,
    national_id: req.national_id || '',
  };

  const { error: insertError } = await adminClient
    .from('council_users')
    .insert(insertPayload);

  if (insertError) {
    console.error('[approveRequest] council_users insert error:', insertError);
    // ถ้าเราสร้าง auth user ใหม่ → ลบทิ้งเพื่อกัน orphaned account
    if (authUser.user) {
      try {
        await adminClient.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupErr) {
        console.error('[approveRequest] cleanup auth user failed:', cleanupErr);
      }
    }
    return {
      success: false,
      error: `ไม่สามารถสร้างบัญชีผู้ใช้ได้: ${insertError.message}`,
    };
  }

  // 5. DELETE คำขอจาก council_join_requests
  const { error: deleteError } = await adminClient
    .from('council_join_requests')
    .delete()
    .eq('id', requestId);

  if (deleteError) {
    console.error('[approveRequest] delete request error:', deleteError);
    // non-fatal — user ถูกสร้างแล้ว แค่ log error
  }

  return { success: true };
}

/**
 * ปฏิเสธการลงทะเบียน — ใช้ service-role adminClient (bypass RLS)
 *
 * แค่ DELETE row จาก council_join_requests
 * (ฝั่ง client จะ detect ผ่าน realtime แล้วแสดงข้อความ "ถูกปฏิเสธ")
 *
 * @param adminClient  - Service-role Supabase client
 * @param requestId    - UUID ของคำขอที่จะปฏิเสธ
 */
export async function rejectRequest(
  adminClient: Client,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await adminClient
    .from('council_join_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('[rejectRequest]', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
