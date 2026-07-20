// ═══════════════════════════════════════════════════════════════
// YP WORK · API User Guard (v3.2.0)
// ═══════════════════════════════════════════════════════════════
// ตรวจสอบว่า caller เป็น authenticated user ที่ approved แล้ว
// คืน userClient (RLS-bound) + adminClient (service role, bypass RLS) + user info
//
// ใช้สำหรับ API routes ที่ผู้ใช้ทั่วไปเรียก (สร้าง/แก้ไข/ลบ events, tasks)
// — เนื่องจาก RLS policy บน ypwork_events/ypwork_tasks อาจบล็อก direct writes
//   เราจึงใช้ adminClient (service role) สำหรับ write operations
//   แต่ยังตรวจสอบสิทธิ์ผ่าน userClient ก่อนเสมอ
//
// ถ้า caller เป็น admin → มีสิทธิ์เต็ม
// ถ้า caller เป็น member → มีสิทธิ์เขียนได้ (แต่อาจจำกัดบาง operation)
// ═══════════════════════════════════════════════════════════════

import { createAdminClient, createClient } from '@/lib/supabase/server';

export interface UserGuard {
  ok: true;
  userClient: Awaited<ReturnType<typeof createClient>>;
  adminClient: ReturnType<typeof createAdminClient>;
  userAuthUid: string;
  userFullName: string;
  userRole: 'admin' | 'member';
  userDepartmentId: string | null;
}

export interface UserGuardFail {
  ok: false;
  response: Response;
}

/**
 * ตรวจสอบว่า caller เป็น authenticated user ที่ approved แล้ว
 * คืน userClient + adminClient + user info เมื่อสำเร็จ
 *
 * Usage:
 *   const guard = await requireUser();
 *   if (!guard.ok) return NextResponse.json(..., { status: guard.response.status });
 *   const { adminClient, userAuthUid } = guard;
 *   // ใช้ adminClient สำหรับ write (bypass RLS)
 */
export async function requireUser(): Promise<UserGuard | UserGuardFail> {
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
  //    (RLS บน council_users อาจบล็อกการอ่าน row ของตัวเองในบางกรณี)
  const adminClient = createAdminClient();

  const { data: councilUser, error: councilError } = await adminClient
    .from('council_users')
    .select('id, role, full_name, approved, disabled, department_id')
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

  // 3. ตรวจว่าเป็น user ที่ approved และไม่ disabled
  if (!councilUser.approved || councilUser.disabled) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'บัญชีนี้ยังไม่ได้รับการอนุมัติหรือถูกปิดใช้งาน' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userClient,
    adminClient,
    userAuthUid: user.id,
    userFullName: councilUser.full_name,
    userRole: councilUser.role as 'admin' | 'member',
    userDepartmentId: councilUser.department_id,
  };
}
