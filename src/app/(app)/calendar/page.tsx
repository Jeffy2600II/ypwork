// ═══════════════════════════════════════════════════════════════
// YP WORK · Calendar Page (server component wrapper)
// ═══════════════════════════════════════════════════════════════
// ดึง events ทั้งหมด (พร้อม department) ส่งให้ client component
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { CalendarView } from '@/modules/calendar/calendar-view';
import type { YPEvent, Department } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ดึง events ทั้งหมด — calendar ต้องการทุกเดือนที่มี event
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
      )
    `
    )
    .order('date', { ascending: true });

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
    tasks: [],
  }));

  return (
    <AppShell user={user} activeNav="calendar" title="ปฏิทิน" showFAB>
      <CalendarView initialEvents={events} />
    </AppShell>
  );
}
