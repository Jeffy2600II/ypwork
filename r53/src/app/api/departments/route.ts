// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/departments (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// ดึงรายการ departments ทั้งหมด — ใช้สำหรับ form dropdowns
// (create-event form ใช้สำหรับ client-side fetch เพื่อ render ทันที)
//
// ★ v3.8.0: ใช้ apiCacheHeaders.staticList() — 30s cache + 5min SWR
//   (departments เปลี่ยนน่ัวน — cache นานขึ้นประหยัด request)
//
// ★ v3.4.0 (history): endpoint ใหม่ — แยกจาก /api/departments/members
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';
import type { Department } from '@/lib/types';

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
      { status: guard.response.status }
    );
  }

  try {
    const { data, error } = await guard.adminClient
      .from('departments')
      .select('id, name, color, icon, description')
      .order('name', { ascending: true });

    if (error) {
      console.error('[/api/departments GET] query error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถดึงฝ่ายงาน: ${error.message}` },
        { status: 500 }
      );
    }

    const departments: Department[] = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      icon: d.icon,
      description: d.description,
    }));

    return NextResponse.json(
      { success: true, departments },
      {
        status: 200,
        headers: apiCacheHeaders.staticList(),
      }
    );
  } catch (err) {
    console.error('[/api/departments GET] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
