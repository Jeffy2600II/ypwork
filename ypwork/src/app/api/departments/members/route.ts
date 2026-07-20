// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/departments/members?dept_id=xxx (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// ดึงสมาชิกในฝ่ายที่กำหนด
// ใช้ adminClient (service role) เพื่อ bypass RLS บน council_users
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.staticList() — members เปลี่ยนน้อย
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { getUserColor } from '@/lib/utils/user-color';
import { apiCacheHeaders } from '@/lib/api/cache';
import type { UserProfile } from '@/lib/types';

export async function GET(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
      { status: guard.response.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const deptId = searchParams.get('dept_id');

  if (!deptId) {
    return NextResponse.json(
      { success: false, error: 'Missing dept_id parameter' },
      { status: 400 }
    );
  }

  try {
    // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
    //   ใช้ getUserColor() สร้างสีจาก auth_uid แทน (deterministic)
    const { data: membersRaw, error } = await guard.adminClient
      .from('council_users')
      .select('auth_uid, full_name, role, account_type, year, department_id')
      .eq('department_id', deptId)
      .eq('approved', true)
      .eq('disabled', false)
      .limit(20);

    if (error) {
      console.error('[/api/departments/members GET] query error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถดึงสมาชิกฝ่าย: ${error.message}` },
        { status: 500 }
      );
    }

    const members: UserProfile[] = (membersRaw || []).map((m: any) => ({
      auth_uid: m.auth_uid,
      full_name: m.full_name,
      student_id: null,
      national_id: null,
      year: m.year ?? null,
      role: m.role ?? 'member',
      account_type: (m.account_type || 'student') as 'student' | 'teacher' | 'other',
      approved: true,
      disabled: false,
      email: '',
      department_id: m.department_id ?? null,
      color: getUserColor(m.auth_uid), // ★ v3.7.0: generated color
    }));

    return NextResponse.json(
      { success: true, members },
      { status: 200, headers: apiCacheHeaders.staticList() }
    );
  } catch (err) {
    console.error('[/api/departments/members GET] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
