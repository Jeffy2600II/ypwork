// ═══════════════════════════════════════════════════════════════
// YP WORK · API Auth Guard (v1.9.1)
// ═══════════════════════════════════════════════════════════════
// ตรวจสอบว่า caller เป็น admin ที่ authenticated แล้ว
// คืน adminClient (service role, bypass RLS) เมื่อสำเร็จ
// หรือคืน error Response เมื่อล้มเหลว
//
// ทุก admin API route ต้องเรียก requireAdmin() ก่อน:
//   1. ตรวจ Supabase Auth session จาก cookies
//   2. ตรวจ council_users.role === 'admin' (ผ่าน adminClient เพราะ RLS)
//   3. ได้รับ adminClient สำหรับเขียนข้อมูลต่อไป
//
// Pattern นี้มาจาก reference repo (admin-sc-yp) ที่ใช้งานจริง
// ใช้สำหรับ approve/reject pending requests และ admin operations อื่น ๆ
// ═══════════════════════════════════════════════════════════════

import { createAdminClient, createClient } from '@/lib/supabase/server';

export interface AdminGuard {
  ok: true;
  adminClient: ReturnType<typeof createAdminClient>;
  userAuthUid: string;
  userFullName: string;
}

export interface AdminGuardFail {
  ok: false;
  response: Response;
}

/**
 * ตรวจสอบว่า caller เป็น authenticated admin
 * คืน adminClient (service role) เมื่อสำเร็จ หรือ error Response เมื่อล้มเหลว
 *
 * Usage:
 *   const guard = await requireAdmin();
 *   if (!guard.ok) return guard.response;
 *   const { adminClient } = guard;
 *   // ใช้ adminClient สำหรับ operations ที่ต้องการ bypass RLS
 */
export async function requireAdmin(): Promise<AdminGuard | AdminGuardFail> {
  // 1. ตรวจ Supabase Auth session จาก cookies
  const userClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      ),
    };
  }

  // 2. ค้นหา council_users row ของ caller ผ่าน adminClient
  //    (RLS บล็อก authenticated users จากการอ่าน row ของคนอื่น)
  const adminClient = createAdminClient();

  const { data: councilUser, error: councilError } = await adminClient
    .from('council_users')
    .select('id, role, full_name, approved, disabled')
    .eq('auth_uid', user.id)
    .maybeSingle();

  if (councilError || !councilUser) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'ไม่พบบัญชีในระบบ' },
        { status: 403 }
      ),
    };
  }

  // 3. ตรวจว่าเป็น admin ที่ approved และไม่ disabled
  if (councilUser.role !== 'admin') {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง — เฉพาะผู้ดูแลระบบเท่านั้น' },
        { status: 403 }
      ),
    };
  }

  if (!councilUser.approved || councilUser.disabled) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'บัญชีนี้ถูกปิดใช้งานหรือยังไม่ได้รับการอนุมัติ' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    adminClient,
    userAuthUid: user.id,
    userFullName: councilUser.full_name,
  };
}
