// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Detail Page (server component — v3.4.0)
// ═══════════════════════════════════════════════════════════════
// ★ v3.4.0 changes:
//   - ใช้ fetchEventById() จาก lib/db/event-loader
//   - 2 RTT แทน 4 RTT (event+users+depts parallel → assignees)
//   - ลด TTFB ได้ ~50% เมื่อเทียบกับ v3.3.0
//   - ใช้ getSessionUser ที่ cached
// ═══════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { EventDetailClient } from '@/modules/events/event-detail-client';
import { fetchEventById } from '@/lib/db/event-loader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ★ v3.4.0: 2 RTT แทน 4 RTT
  const { event, users, departments } = await fetchEventById(supabase, id);

  if (!event) {
    notFound();
  }

  const accent = event.color || '#4F46E5';

  return (
    <AppShell
      user={user}
      title={event.title}
      accent={accent}
      showBack
      showBottomNav={false}
    >
      <EventDetailClient
        event={event}
        department={event.department || null}
        users={users}
        departments={departments}
      />
    </AppShell>
  );
}
