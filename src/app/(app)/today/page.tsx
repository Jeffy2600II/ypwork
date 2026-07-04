// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (server component — v1.6)
// ═══════════════════════════════════════════════════════════════
// ดึง events ครั้งแรก (SSR) ส่งให้ TodayClient ที่ subscribe realtime
// เพื่อความเสถียร — ไม่มี polling หน้านี้จะ "พร้อมรับ" ตลอด
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { TodayClient } from '@/modules/today/today-client';
import { getRelativeDate } from '@/lib/utils/date';
import type { YPEvent, Department, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ── Query events พร้อม department + tasks ──
  // ดึง events ตั้งแต่ 30 วันก่อน ถึง 7 วันข้างหน้า (cover overdue + upcoming)
  const startStr = getRelativeDate(-30);
  const plus7Str = getRelativeDate(7);
  const { data: eventsRaw } = await supabase
    .from('ypwork_events')
    .select(
      `
      id,
      type,
      title,
      date,
      end_date,
      time,
      location,
      description,
      department_id,
      status,
      color,
      created_by,
      created_at,
      updated_at,
      department:departments (
        id, name, color, icon, description
      ),
      tasks:ypwork_tasks (
        id, event_id, title, due_date, status, priority,
        estimated_time, notes, tags, sort_order, created_at, updated_at
      )
    `
    )
    .gte('date', startStr)
    .lte('date', plus7Str)
    .order('date', { ascending: true });

  // normalize
  const events: YPEvent[] = (eventsRaw || []).map((e: any) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date,
    end_date: e.end_date ?? null,
    time: e.time ?? '',
    location: e.location ?? '',
    description: e.description ?? '',
    department_id: e.department_id ?? null,
    status: e.status,
    color: e.color ?? '#4F46E5',
    created_by: e.created_by ?? null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    department: e.department
      ? Array.isArray(e.department)
        ? (e.department[0] as Department)
        : (e.department as Department)
      : null,
    tasks: Array.isArray(e.tasks) ? (e.tasks as any[]) : [],
  }));

  // ── Department overview (ถ้ามี) ──
  let dept: Department | null = null;
  let deptMembers: UserProfile[] = [];
  let deptStats = { total: 0, done: 0, ongoing: 0, overdue: 0 };

  if (user.department_id) {
    const { data: deptRaw } = await supabase
      .from('departments')
      .select('id, name, color, icon, description')
      .eq('id', user.department_id)
      .limit(1)
      .maybeSingle();

    if (deptRaw) {
      dept = deptRaw as Department;

      const { data: membersRaw } = await supabase
        .from('council_users')
        .select('auth_uid, full_name, color, role, account_type, year, department_id')
        .eq('department_id', user.department_id)
        .eq('approved', true)
        .eq('disabled', false)
        .limit(20);

      deptMembers = (membersRaw || []).map((m: any) => ({
        auth_uid: m.auth_uid,
        full_name: m.full_name,
        student_id: null,
        national_id: null,
        year: m.year ?? null,
        role: m.role ?? 'member',
        account_type: (m.account_type || 'student') as
          | 'student'
          | 'teacher'
          | 'other',
        approved: true,
        disabled: false,
        email: '',
        department_id: m.department_id ?? null,
        color: m.color ?? '#4F46E5',
      }));
    }
  }

  return (
    <AppShell user={user} activeNav="today" title="หน้าแรก" showFAB>
      <TodayClient
        initialEvents={events}
        user={user}
        dept={dept}
        deptMembers={deptMembers}
        deptStats={deptStats}
      />
    </AppShell>
  );
}
