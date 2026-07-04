// ═══════════════════════════════════════════════════════════════
// YP WORK · Register Page (server component — v1.8.1)
// ═══════════════════════════════════════════════════════════════
// v1.8.1 changes:
//   - ดึงรายการปีการศึกษาจากตาราง `council_years` ของ YP Labs
//     (ก่อนหน้านี้ register form hardcoded ['2568','2567','2566'])
//   - ต้องรัน ypwork-v1.8.1-national-id-and-years-from-db.sql บน Supabase
//     เพื่อเปิด RLS SELECT บน council_years ให้ anon อ่านได้
//
// v1.8 changes:
//   - แก้บั๊กส่งคำขอ (frontend เลิก swallow error)
//   - ต้องรัน ypwork-v1.8-realtime-and-rls-fix.sql บน Supabase
//     เพื่อเปิด RLS INSERT policy บน council_join_requests
//
// v1.7 changes (baseline):
//   - ดึงรายการฝ่ายจากตาราง `departments` (rename จาก ypwork_departments)
//   - ส่ง list ฝ่ายเข้า RegisterForm เพื่อให้ผู้ใช้เลือกได้
//   - รองรับการ insert คำขอเข้า `council_join_requests` พร้อม department_id
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from './register-form';
import type { Department } from '@/lib/types';
import type { CouncilYear } from '@/lib/hooks/use-realtime';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const supabase = await createClient();

  // ดึง departments (ไม่ต้อง login — ใช้ anonymous read ผ่าน RLS ของ departments)
  const { data: deptsRaw } = await supabase
    .from('departments')
    .select('id, name, color, icon, description')
    .order('name', { ascending: true });

  const departments: Department[] = (deptsRaw || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    color: d.color,
    icon: d.icon,
    description: d.description,
  }));

  // v1.8.1: ดึงรายการปีการศึกษาจาก `council_years`
  // ใช้ anonymous read ผ่าน RLS policy `council_years_select_anyone`
  // (เพิ่มใน ypwork-v1.8.1-...sql)
  //
  // ถ้า DB ยังไม่ migrate → ใช้ fallback ปีปัจจุบัน (Buddhist year)
  // เพื่อให้ form ยัง render ได้แทนที่จะแตก
  const { data: yearsRaw, error: yearsErr } = await supabase
    .from('council_years')
    .select('year, closed')
    .order('year', { ascending: false });

  let years: CouncilYear[];
  if (yearsErr || !yearsRaw || yearsRaw.length === 0) {
    // Fallback: ปีปัจจุบัน (Buddhist year) แบบเปิดอยู่
    // กรณีนี้ควรจะไม่เกิดถ้ารัน SQL v1.8.1 แล้ว — แต่ไว้เป็น safety net
    const fallbackYear = new Date().getFullYear() + 543;
    years = [{ year: fallbackYear, closed: false }];
  } else {
    years = yearsRaw.map((r: any) => ({
      year: Number(r.year),
      closed: Boolean(r.closed ?? false),
    }));
  }

  return <RegisterForm departments={departments} years={years} />;
}
