// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PATCH/DELETE /api/tasks/[id] (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// PATCH  — แก้ไข task (title, priority, due_date, start_time, estimated_time, notes, tags)
// DELETE — ลบ task (cascade ลบ assignees ด้วย FK)
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.noStore() ทุก response
//   → กัน browser  replay mutation บน back/forward button
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;   // ★ v3.10.0 รอบที่ 9: HH:MM

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing task id' },
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

  // ── Validate input ──
  const update: Record<string, any> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: 'ชื่อ task ไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.title = body.title.trim();
  }

  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: 'ความสำคัญไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.priority = body.priority;
  }

  if (body.due_date !== undefined) {
    if (body.due_date !== null && (typeof body.due_date !== 'string' || !DATE_RE.test(body.due_date))) {
      return NextResponse.json(
        { success: false, error: 'วันที่กำหนดส่งไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.due_date = body.due_date || null;
  }

  // ★ v3.10.0 รอบที่ 29: start_date (YYYY-MM-DD, ไม่บังคับ) — วันที่เริ่มลงมือทำ
  if (body.start_date !== undefined) {
    if (body.start_date !== null && (typeof body.start_date !== 'string' || !DATE_RE.test(body.start_date))) {
      return NextResponse.json(
        { success: false, error: 'วันที่เริ่มไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.start_date = body.start_date || null;
  }

  // ★ v3.10.0 รอบที่ 9: start_time (HH:MM) — ไม่บังคับ
  if (body.start_time !== undefined) {
    if (body.start_time !== null && (typeof body.start_time !== 'string' || !TIME_RE.test(body.start_time))) {
      return NextResponse.json(
        { success: false, error: 'เวลาเริ่มไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.start_time = body.start_time || null;
  }

  if (body.estimated_time !== undefined) update.estimated_time = body.estimated_time || '';
  if (body.notes !== undefined) update.notes = body.notes || '';
  if (body.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : [];

  // ★ v3.10.0 รอบที่ 31: ตรวจสอบกำหนดส่ง >= วันที่เริ่ม (server-side)
  //   ตรวจเฉพาะเมื่อทั้งสอง field ถูกส่งมาในครั้งเดียวกัน
  if (update.start_date !== undefined && update.due_date !== undefined) {
    if (update.start_date && update.due_date && update.due_date < update.start_date) {
      return NextResponse.json(
        { success: false, error: 'วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม' },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { success: false, error: 'ไม่มี field ที่ต้องแก้ไข' },
      { status: 400 }
    );
  }

  try {
    const { error } = await guard.adminClient
      .from('ypwork_tasks')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('[/api/tasks/[id] PATCH] error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถแก้ไข task: ${error.message}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true },
      { status: 200, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/tasks/[id] PATCH] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing task id' },
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
    // Delete task — FK ON DELETE CASCADE จะลบ task_assignees อัตโนมัติ
    const { error } = await guard.adminClient
      .from('ypwork_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[/api/tasks/[id] DELETE] error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถลบ task: ${error.message}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true },
      { status: 200, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/tasks/[id] DELETE] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
