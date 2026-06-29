// ═══════════════════════════════════════════════════════════════
// YP WORK · Create Event Page (server + client form)
// ═══════════════════════════════════════════════════════════════
// รองรับทั้งโหมดสร้างและโหมดแก้ไข (?edit=<event-id>)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { CreateEventForm } from '@/modules/events/create-event-form';
import type { Department, EventType } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function CreateEventPage({ searchParams }: PageProps) {
  const { edit: editId } = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ── ดึง departments ──
  const { data: deptsRaw } = await supabase
    .from('ypwork_departments')
    .select('id, name, color, icon, description')
    .order('name', { ascending: true });

  const departments: Department[] = (deptsRaw || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    color: d.color,
    icon: d.icon,
    description: d.description,
  }));

  // ── ถ้ามี editId → ดึง event ที่จะแก้ไข ──
  let editEvent: {
    id: string;
    type: EventType;
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    department_id: string | null;
    color: string;
  } | null = null;

  if (editId) {
    const { data: evRaw } = await supabase
      .from('ypwork_events')
      .select(
        'id, type, title, date, time, location, description, department_id, color'
      )
      .eq('id', editId)
      .limit(1)
      .maybeSingle();

    if (evRaw) {
      editEvent = {
        id: evRaw.id,
        type: evRaw.type as EventType,
        title: evRaw.title,
        date: evRaw.date,
        time: evRaw.time || '',
        location: evRaw.location || '',
        description: evRaw.description || '',
        department_id: evRaw.department_id ?? null,
        color: evRaw.color || '#4F46E5',
      };
    }
  }

  return (
    <AppShell
      user={user}
      activeNav="events"
      title={editEvent ? 'แก้ไขงาน' : 'สร้างงาน'}
      showBack
    >
      <CreateEventForm
        departments={departments}
        editEvent={editEvent}
        userUid={user.auth_uid}
      />
    </AppShell>
  );
}
