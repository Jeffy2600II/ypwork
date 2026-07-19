// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (server component — v3.4.0)
// ═══════════════════════════════════════════════════════════════
// ดึง events ครั้งแรก (SSR) ส่งให้ TodayClient ที่ subscribe realtime
//
// ★ v3.4.0 changes:
//   - ใช้ fetchEventsWithRelations() — 2 RTT แทน 3 RTT
//   - ดึง dept + members แบบ parallel กับ events
//   - getSessionUser cached → ลด round-trip ภายใน request
//   - ลด TTFB รวม ~40% เมื่อเทียบกับ v3.3.0
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { TodayClient } from '@/modules/today/today-client';
import { getRelativeDate } from '@/lib/utils/date';
import { fetchEventsWithRelations } from '@/lib/db/event-loader';
import { getUserColor } from '@/lib/utils/user-color';
import type { Department, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 5;

export default async function TodayPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  const startStr = getRelativeDate(-30);
  const plus7Str = getRelativeDate(7);

  // ── RTT 1 (parallel): events-with-relations + dept + members ──
  // fetchEventsWithRelations จะทำ RTT 2 ภายในตัวมันเอง (events+users → assignees)
  // แต่ dept/members fetch จะไป parallel กับ RTT 1 ของ events
  const [events, deptRaw, membersRaw] = await Promise.all([
    fetchEventsWithRelations(supabase, { from: startStr, to: plus7Str }),
    user.department_id
      ? supabase
          .from('departments')
          .select('id, name, color, icon, description')
          .eq('id', user.department_id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user.department_id
      ? supabase
          .from('council_users')
          .select(
            'auth_uid, full_name, role, account_type, year, department_id'
          )
          .eq('department_id', user.department_id)
          .eq('approved', true)
          .eq('disabled', false)
          .limit(20)
      : Promise.resolve({ data: null, error: null }),
  ]);

  // ── Department overview (ถ้ามี) ──
  let dept: Department | null = null;
  let deptMembers: UserProfile[] = [];
  const deptStats = { total: 0, done: 0, ongoing: 0, overdue: 0 };

  if (deptRaw.data && user.department_id) {
    const d: any = deptRaw.data;
    dept = {
      id: d.id,
      name: d.name,
      color: d.color,
      icon: d.icon,
      description: d.description,
    };

    deptMembers = (membersRaw.data || []).map((m: any) => ({
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
