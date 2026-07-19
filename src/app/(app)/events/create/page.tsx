// ═══════════════════════════════════════════════════════════════
// YP WORK · Create Event Page (v3.4.0 — instant render)
// ═══════════════════════════════════════════════════════════════
// ★ v3.4.0 CRITICAL FIX:
//   ก่อนหน้านี้: หน้านี้เป็น force-dynamic server component ที่รอดึง departments
//   ก่อน render → กดปุ่ม "+" แล้วรอ ~300-800ms ก่อนหน้าจะปรากฏ
//
//   ตอนนี้: render AppShell + CreateEventForm ทันที (departments = [])
//   CreateEventForm จะ fetch departments เองผ่าน /api/departments/members
//   → หน้าปรากฏใน <100ms, form พร้อมใช้งานทันที
//   → departments dropdown อัพเดตภายหลัง (เร็วกว่ารอ render ทั้งหน้า)
//
//   การแก้ไขนี้แก้ปัญหา "กดปุ่ม + แล้วนาน" โดยตรง
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { CreateEventForm } from '@/modules/events/create-event-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function CreateEventPage({ searchParams }: PageProps) {
  const { edit: editId } = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  // ★ v3.4.0: ถ้ามี editId ให้ดึง event ฝั่ง server (จำเป็นต้อง preload)
  // ถ้าไม่มี editId (โหมดสร้าง) — ไม่ดึงอะไรเลย ปล่อยให้ form render ทันที
  let editEvent: {
    id: string;
    type: 'group' | 'task';
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
        type: evRaw.type as 'group' | 'task',
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
      showBottomNav={false}
    >
      {/* ★ v3.4.0: departments = [] → form จะ fetch เองฝั่ง client */}
      <CreateEventForm
        departments={[]}
        editEvent={editEvent}
        userUid={user.auth_uid}
      />
    </AppShell>
  );
}
