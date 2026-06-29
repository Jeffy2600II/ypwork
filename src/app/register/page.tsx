// ═══════════════════════════════════════════════════════════════
// YP WORK · Register Page (server component — v1.7)
// ═══════════════════════════════════════════════════════════════
// v1.7 changes:
//   - ดึงรายการฝ่ายจากตาราง `departments` (rename จาก ypwork_departments)
//   - ส่ง list ฝ่ายเข้า RegisterForm เพื่อให้ผู้ใช้เลือกได้
//   - รองรับการ insert คำขอเข้า `council_join_requests` พร้อม department_id
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from './register-form';
import type { Department } from '@/lib/types';

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

  return <RegisterForm departments={departments} />;
}
