// ═══════════════════════════════════════════════════════════════
// YP WORK · Events List Page (server component)
// ═══════════════════════════════════════════════════════════════
// ดึง events ทั้งหมด (พร้อม department + tasks + assignees) ส่งให้
// client island (EventsListView) ที่มี filter state
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { EventsListView } from '@/modules/events/events-list-view';
import type { YPEvent, Department, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EventsListPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ── ดึง events พร้อม department + tasks ──
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
      department:ypwork_departments (
        id, name, color, icon, description
      ),
      tasks:ypwork_tasks (
        id, event_id, title, due_date, status, priority,
        estimated_time, notes, tags, sort_order, created_at, updated_at
      )
    `
    )
    .order('date', { ascending: true });

  // ── ดึง task assignees สำหรับ filter "ที่ฉันมีส่วนร่วม" ──
  // เพื่อให้ client กรองได้ ต้องดึง assignees มาฝังในแต่ละ task
  const taskIds = (eventsRaw || []).flatMap((e: any) =>
    (e.tasks || []).map((t: any) => t.id)
  );

  let assigneesMap = new Map<string, UserProfile[]>();
  if (taskIds.length > 0) {
    const { data: assigneesRaw } = await supabase
      .from('ypwork_task_assignees')
      .select('task_id, user_auth_uid')
      .in('task_id', taskIds);

    // ดึง user profiles ของ assignees ทั้งหมด
    const uids = Array.from(
      new Set((assigneesRaw || []).map((a: any) => a.user_auth_uid))
    );
    let usersMap = new Map<string, UserProfile>();
    if (uids.length > 0) {
      const { data: usersRaw } = await supabase
        .from('council_users')
        .select('auth_uid, full_name, color, role, account_type, year, department_id')
        .in('auth_uid', uids);
      for (const u of usersRaw || []) {
        usersMap.set(u.auth_uid, {
          auth_uid: u.auth_uid,
          full_name: u.full_name,
          student_id: null,
          national_id: null,
          year: u.year ?? null,
          role: u.role ?? 'member',
          account_type: (u.account_type || 'student') as
            | 'student'
            | 'teacher'
            | 'other',
          approved: true,
          disabled: false,
          email: '',
          department_id: u.department_id ?? null,
          color: u.color ?? '#4F46E5',
        });
      }
    }

    for (const a of assigneesRaw || []) {
      const taskId = a.task_id;
      if (!assigneesMap.has(taskId)) assigneesMap.set(taskId, []);
      const userProfile = usersMap.get(a.user_auth_uid);
      if (userProfile) {
        assigneesMap.get(taskId)!.push(userProfile);
      }
    }
  }

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
    tasks: (Array.isArray(e.tasks) ? e.tasks : []).map((t: any) => ({
      id: t.id,
      event_id: t.event_id,
      title: t.title,
      due_date: t.due_date ?? null,
      status: t.status,
      priority: t.priority,
      estimated_time: t.estimated_time ?? '',
      notes: t.notes ?? '',
      tags: Array.isArray(t.tags) ? t.tags : [],
      sort_order: t.sort_order ?? 0,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assignees: assigneesMap.get(t.id) || [],
    })),
  }));

  return (
    <AppShell user={user} activeNav="events" title="งานทั้งหมด" showFAB>
      <EventsListView events={events} user={user} />
    </AppShell>
  );
}
