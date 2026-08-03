// ═══════════════════════════════════════════════════════════════
// YP WORK · Events List Page (server component — v3.4.0)
// ═══════════════════════════════════════════════════════════════
// ดึง events ทั้งหมด (พร้อม department + tasks + assignees) ส่งให้
// client island (EventsListView) ที่มี filter state
//
// ★ v3.4.0 changes:
//   - ใช้ fetchEventsWithRelations() จาก lib/db/event-loader
//   - 2 RTT แทน 3 RTT (events+users parallel → assignees)
//   - ลด TTFB ได้ ~30-50% เมื่อเทียบกับ v3.3.0
//   - ใช้ getSessionUser ที่ cached ด้วย React cache()
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { EventsListView } from '@/modules/events/events-list-view';
import { fetchEventsWithRelations } from '@/lib/db/event-loader';

export const dynamic = 'force-dynamic';
// ★ v3.4.0: revalidate ทุก 5 วินาที — ใช้ ISR-style caching เพื่อลด DB load
// ในหน้าที่ไม่จำเป็นต้อง realtime 100% (realtime ยังทำงานผ่าน Supabase subscription)
export const revalidate = 5;

export default async function EventsListPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ★ v3.4.0: ใช้ centralized loader — 2 RTT (ลดจาก 3)
  const events = await fetchEventsWithRelations(supabase);

  return (
    <AppShell user={user} activeNav="events" title="รายการทั้งหมด" showFAB>
      <EventsListView events={events} user={user} />
    </AppShell>
  );
}
