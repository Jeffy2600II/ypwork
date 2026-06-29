// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Detail Page (server component + client island)
// ═══════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { EventDetailClient } from '@/modules/events/event-detail-client';
import type { YPEvent, Department, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ── ดึง event พร้อม department + tasks ──
  const { data: eventRaw } = await supabase
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
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (!eventRaw) {
    notFound();
  }

  // ── ดึง task assignees ──
  const taskIds = (eventRaw.tasks || []).map((t: any) => t.id);
  let assigneesMap = new Map<string, UserProfile[]>();
  if (taskIds.length > 0) {
    const { data: assigneesRaw } = await supabase
      .from('ypwork_task_assignees')
      .select('task_id, user_auth_uid')
      .in('task_id', taskIds);

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
      const tid = a.task_id;
      if (!assigneesMap.has(tid)) assigneesMap.set(tid, []);
      const userProfile = usersMap.get(a.user_auth_uid);
      if (userProfile) assigneesMap.get(tid)!.push(userProfile);
    }
  }

  // ── Normalize event ──
  const e: any = eventRaw;
  const event: YPEvent = {
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
  };

  const accent = event.color || '#4F46E5';
  // Truncate title for top bar
  const truncatedTitle =
    event.title.length > 20
      ? event.title.slice(0, 18) + '…'
      : event.title;

  return (
    <AppShell
      user={user}
      title={truncatedTitle}
      accent={accent}
      showBack
      showBottomNav={false}
    >
      <EventDetailClient event={event} department={event.department || null} />
    </AppShell>
  );
}
