// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/events/[id]/tasks (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// สร้าง task ย่อยใหม่ในรายการ (ใช้ adminClient bypass RLS)
//
// Body: {
//   title: string,
//   priority?: 'low' | 'medium' | 'high' (default 'medium'),
//   due_date?: string | null (YYYY-MM-DD),
//   start_time?: string | null (HH:MM, ★ v3.10.0 รอบที่ 9),
//   estimated_time?: string,
//   notes?: string,
//   tags?: string[],
//   assignee_id?: string | null (user auth_uid),
// }
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.noStore() — กัน browser replay POST
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { getUserColor } from '@/lib/utils/user-color';
import { apiCacheHeaders } from '@/lib/api/cache';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;   // ★ v3.10.0 รอบที่ 9: HH:MM

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: eventId } = await params;
  if (!eventId || typeof eventId !== 'string') {
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { title, priority, due_date, start_date, start_time, estimated_time, notes, tags, assignee_id } = body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json(
      { success: false, error: 'กรุณากรอกชื่อ task' },
      { status: 400 }
    );
  }

  const finalPriority = priority || 'medium';
  if (!VALID_PRIORITIES.includes(finalPriority)) {
    return NextResponse.json(
      { success: false, error: 'ความสำคัญไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  if (due_date !== undefined && due_date !== null && (typeof due_date !== 'string' || !DATE_RE.test(due_date))) {
    return NextResponse.json(
      { success: false, error: 'วันที่กำหนดส่งไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  // ★ v3.10.0 รอบที่ 29: start_date (YYYY-MM-DD, ไม่บังคับ) — วันที่เริ่มลงมือทำ
  if (start_date !== undefined && start_date !== null && (typeof start_date !== 'string' || !DATE_RE.test(start_date))) {
    return NextResponse.json(
      { success: false, error: 'วันที่เริ่มไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  // ★ v3.10.0 รอบที่ 9: validate start_time (HH:MM)
  if (start_time !== undefined && start_time !== null && (typeof start_time !== 'string' || !TIME_RE.test(start_time))) {
    return NextResponse.json(
      { success: false, error: 'เวลาเริ่มไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  // ── Verify event exists ──
  const { data: eventRow, error: eventErr } = await guard.adminClient
    .from('ypwork_events')
    .select('id, type')
    .eq('id', eventId)
    .maybeSingle();

  if (eventErr || !eventRow) {
    return NextResponse.json(
      { success: false, error: 'ไม่พบงานที่ต้องการเพิ่ม task' },
      { status: 404 }
    );
  }

  try {
    // ── Get current task count for sort_order ──
    const { count } = await guard.adminClient
      .from('ypwork_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // ── Insert task ──
    const { data: taskData, error: taskErr } = await guard.adminClient
      .from('ypwork_tasks')
      .insert({
        event_id: eventId,
        title: title.trim(),
        status: 'todo',
        priority: finalPriority,
        due_date: due_date || null,
        start_date: start_date || null,   // ★ v3.10.0 รอบที่ 29
        start_time: start_time || null,   // ★ v3.10.0 รอบที่ 9
        estimated_time: estimated_time || '',
        notes: notes || '',
        tags: Array.isArray(tags) ? tags : [],
        sort_order: count || 0,
      })
      .select('id, event_id, title, due_date, start_date, start_time, status, priority, estimated_time, notes, tags, sort_order, created_at, updated_at')
      .limit(1)
      .maybeSingle();

    if (taskErr || !taskData) {
      console.error('[/api/events/[id]/tasks POST] insert error:', taskErr?.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถเพิ่ม task: ${taskErr?.message || 'unknown'}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ── Insert assignee if provided ──
    if (assignee_id) {
      const { error: assigneeErr } = await guard.adminClient
        .from('ypwork_task_assignees')
        .insert({
          task_id: taskData.id,
          user_auth_uid: assignee_id,
        });

      if (assigneeErr) {
        console.error('[/api/events/[id]/tasks POST] assignee insert error:', assigneeErr.message);
        // ไม่ fail ทั้ง request — task ถูกสร้างแล้ว, assignee ล้มเหลวแค่บางส่วน
      } else {
        // Fetch assignee profile เพื่อส่งกลับ
        // ★ v3.7.0: ลบ 'color' ออกจาก select — column นี้ไม่มีใน DB schema
        const { data: uRaw } = await guard.adminClient
          .from('council_users')
          .select('auth_uid, full_name, role, account_type, year, department_id')
          .eq('auth_uid', assignee_id)
          .maybeSingle();

        if (uRaw) {
          (taskData as any).assignees = [{
            auth_uid: uRaw.auth_uid,
            full_name: uRaw.full_name,
            student_id: null,
            national_id: null,
            year: uRaw.year ?? null,
            role: uRaw.role ?? 'member',
            account_type: (uRaw.account_type || 'student') as 'student' | 'teacher' | 'other',
            approved: true,
            disabled: false,
            email: '',
            department_id: uRaw.department_id ?? null,
            color: getUserColor(uRaw.auth_uid), // ★ v3.7.0: generated color
          }];
        }
      }
    }

    if (!(taskData as any).assignees) {
      (taskData as any).assignees = [];
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true, task: taskData },
      { status: 201, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/events/[id]/tasks POST] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
