// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/events/[id]/detail (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// ดึง event เฉพาะตัวพร้อม department + tasks + assignees
// ใช้ adminClient (service role) เพื่อ bypass RLS
//
// ★ v3.8.0 changes:
//   - เพิ่ม apiCacheHeaders.detail() → 2s browser cache + 5s SWR
//     ลด refetch spam เมื่อ user กด back จาก task edit กลับมา detail
//     ไม่กระทบ realtime เพราะ cache สั้นมาก (2s)
//   - Error responses ใส่ apiCacheHeaders.noStore()
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { getUserColor } from '@/lib/utils/user-color';
import { apiCacheHeaders } from '@/lib/api/cache';
import type { YPEvent, Department, UserProfile } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing event id' },
      { status: 400 }
    );
  }

  const guard = await requireUser();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
      { status: guard.response.status }
    );
  }

  try {
    const { data: eventRaw, error } = await guard.adminClient
      .from('ypwork_events')
      .select(`
        id, type, title, date, start_date, end_date, time, location, description,
        department_id, status, color, created_by, created_at, updated_at,
        department:departments ( id, name, color, icon, description ),
        tasks:ypwork_tasks (
          id, event_id, title, due_date, start_date, start_time, status, priority,
          estimated_time, notes, tags, sort_order, created_at, updated_at
        )
      `)
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[/api/events/[id]/detail GET] query error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถดึงข้อมูลงาน: ${error.message}` },
        { status: 500 }
      );
    }

    if (!eventRaw) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    // ── Fetch assignees ──
    const taskIds = (eventRaw.tasks || []).map((t: any) => t.id);
    let assigneesMap = new Map<string, UserProfile[]>();
    if (taskIds.length > 0) {
      const { data: assigneesRaw } = await guard.adminClient
        .from('ypwork_task_assignees')
        .select('task_id, user_auth_uid')
        .in('task_id', taskIds);

      const uids = Array.from(
        new Set((assigneesRaw || []).map((a: any) => a.user_auth_uid))
      );
      let usersMap = new Map<string, UserProfile>();
      if (uids.length > 0) {
        // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
        const { data: usersRaw } = await guard.adminClient
          .from('council_users')
          .select('auth_uid, full_name, role, account_type, year, department_id')
          .in('auth_uid', uids);
        for (const u of usersRaw || []) {
          usersMap.set(u.auth_uid, {
            auth_uid: u.auth_uid,
            full_name: u.full_name,
            student_id: null,
            national_id: null,
            year: u.year ?? null,
            role: u.role ?? 'member',
            account_type: (u.account_type || 'student') as 'student' | 'teacher' | 'other',
            approved: true,
            disabled: false,
            email: '',
            department_id: u.department_id ?? null,
            color: getUserColor(u.auth_uid), // ★ v3.7.0: generated color
          });
        }
      }

      for (const a of assigneesRaw || []) {
        const tid = a.task_id;
        if (!assigneesMap.has(tid)) assigneesMap.set(tid, []);
        const u = usersMap.get(a.user_auth_uid);
        if (u) assigneesMap.get(tid)!.push(u);
      }
    }

    const e: any = eventRaw;
    const event: YPEvent = {
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
      tasks: (Array.isArray(e.tasks) ? e.tasks : []).map((t: any) => ({
        id: t.id,
        event_id: t.event_id,
        title: t.title,
        due_date: t.due_date ?? null,
        start_time: t.start_time ?? null,   // ★ v3.10.0 รอบที่ 9
        start_date: t.start_date ?? null,   // ★ v3.10.0 รอบที่ 29
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

    // ★ v3.8.0: 2s cache + 5s SWR — ลด refetch เมื่อ user กด back
    //   ไม่กระทบ realtime เพราะ cache สั้นมาก
    return NextResponse.json(
      { success: true, event },
      { status: 200, headers: apiCacheHeaders.detail() }
    );
  } catch (err) {
    console.error('[/api/events/[id]/detail GET] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
