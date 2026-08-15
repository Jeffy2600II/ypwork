// ═══════════════════════════════════════════════════════════════
// YP WORK · Profile Page (server + client island)
// v3.1.0: parallel fetch — dept + dept event count + my assignments พร้อมกัน
// Round 10: Removed status-based stats (myDone, myPending, completionRate)
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

  // ── v3.1.0: Parallel batch — dept + dept event count + my assignments ──
  const [deptResult, deptEventsResult, myAssigneesResult] = await Promise.all([
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
          .from('ypwork_events')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', user.department_id)
      : Promise.resolve({ count: 0, data: null, error: null }),
    supabase
      .from('ypwork_task_assignees')
      .select('task_id')
      .eq('user_auth_uid', user.auth_uid),
  ]);

  let department: Department | null = null;
  if (deptResult.data) {
    const deptRaw = deptResult.data as any;
    department = {
      id: deptRaw.id,
      name: deptRaw.name,
      color: deptRaw.color,
      icon: deptRaw.icon,
      description: deptRaw.description,
    };
  }

  const deptEvents = deptEventsResult.count || 0;
  const myTasks = ((myAssigneesResult.data as any[]) || []).length;

  return (
    <AppShell user={user} activeNav="profile" title="โปรไฟล์">
      <ProfileView
        user={user}
        department={department}
        stats={{
          deptEvents,
          myTasks,
        }}
      />
    </AppShell>
  );
}
