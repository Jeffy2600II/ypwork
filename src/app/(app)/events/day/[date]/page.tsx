// ═══════════════════════════════════════════════════════════════
// YP WORK · Day View Page (server component — v1.8 realtime)
// ═══════════════════════════════════════════════════════════════
// ดึง events ในวันที่กำหนด ส่งให้ DayViewClient (client island)
// เพื่อ subscribe realtime updates — เมื่อมี event ใหม่/ถูกลบ/แก้ไข
// list อัพเดตทันทีโดยไม่ต้อง refresh
// ═══════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { DayViewClient } from '@/modules/events/day-view-client';
import { formatDate } from '@/lib/utils/date';
import type { YPEvent, Department } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ date: string }>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayViewPage({ params }: PageProps) {
  const { date: dateStr } = await params;

  // validate date format
  if (!DATE_RE.test(dateStr)) {
    notFound();
  }

  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  const { data: eventsRaw } = await supabase
    .from('ypwork_events')
    .select(
      `
      id,
      type,
      title,
      date,
      start_date,
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
        id, event_id, title, due_date, start_date, start_time, status, priority,
        estimated_time, notes, tags, sort_order, created_at, updated_at
      )
    `
    )
    .eq('date', dateStr)
    .order('time', { ascending: true });

  const events: YPEvent[] = (eventsRaw || []).map((e: any) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date,
    start_date: e.start_date ?? null,   // ★ v3.10.0 รอบที่ 29
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

  return (
    <AppShell
      user={user}
      title={formatDate(dateStr, { long: true })}
      showBack
      showBottomNav={false}
    >
      <DayViewClient
        dateStr={dateStr}
        formattedTitle={formatDate(dateStr, { long: true })}
        initialEvents={events}
      />
    </AppShell>
  );
}
