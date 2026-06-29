// ═══════════════════════════════════════════════════════════════
// YP WORK · Profile Page (server + client island)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { ProfileView } from '@/modules/profile/profile-view';
import type { Department } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ── ดึง department ของ user ──
  let department: Department | null = null;
  if (user.department_id) {
    const { data: deptRaw } = await supabase
      .from('departments')
      .select('id, name, color, icon, description')
      .eq('id', user.department_id)
      .limit(1)
      .maybeSingle();

    if (deptRaw) {
      department = {
        id: deptRaw.id,
        name: deptRaw.name,
        color: deptRaw.color,
        icon: deptRaw.icon,
        description: deptRaw.description,
      };
    }
  }

  // ── คำนวณ stats ──
  // 1) งานในฝ่าย (events where department_id = user.department_id)
  let deptEvents = 0;
  if (user.department_id) {
    const { count } = await supabase
      .from('ypwork_events')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', user.department_id);
    deptEvents = count || 0;
  }

  // 2) Tasks ที่รับผิดชอบ (assignee = user.auth_uid) — ดึงผ่าน task_assignees
  //    พร้อม status เพื่อคำนวณ done / pending
  const { data: myAssignees } = await supabase
    .from('ypwork_task_assignees')
    .select('task_id')
    .eq('user_auth_uid', user.auth_uid);

  const myTaskIds = (myAssignees || []).map((a: any) => a.task_id);
  let myTasks = 0;
  let myDone = 0;
  let myPending = 0;

  if (myTaskIds.length > 0) {
    const { data: myTasksRaw } = await supabase
      .from('ypwork_tasks')
      .select('id, status')
      .in('id', myTaskIds);

    myTasks = myTasksRaw?.length || 0;
    myDone = myTasksRaw?.filter((t: any) => t.status === 'done').length || 0;
    myPending = myTasks - myDone;
  }

  const completionRate = myTasks > 0 ? Math.round((myDone / myTasks) * 100) : 0;

  return (
    <AppShell user={user} activeNav="profile" title="โปรไฟล์">
      <ProfileView
        user={user}
        department={department}
        stats={{
          deptEvents,
          myTasks,
          myDone,
          myPending,
          completionRate,
        }}
      />
    </AppShell>
  );
}
