// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PATCH/DELETE /api/events/[id] (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// PATCH  — แก้ไขรายการ (ใช้ adminClient bypass RLS)
// DELETE — ลบรายการ (cascade ลบ tasks + assignees ด้วย FK)
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.noStore() ทุก response
//   → กัน browser  replay mutation บน back/forward button
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';

const VALID_TYPES = ['group', 'task'] as const;
const VALID_COLORS = /^#[0-9A-Fa-f]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // ── Validate input (all fields optional for PATCH) ──
  const update: Record<string, any> = {};

  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'ประเภทงานไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.type = body.type;
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: 'ชื่อรายการไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.title = body.title.trim();
  }

  if (body.date !== undefined) {
    if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) {
      return NextResponse.json(
        { success: false, error: 'วันที่ไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.date = body.date;
  }

  // ★ v3.10.0 รอบที่ 29: start_date (YYYY-MM-DD, ไม่บังคับ)
  //   ถ้าส่ง null หรือ string ว่าง → ล้างค่า (set null)
  //   ถ้าส่งค่าที่ผ่าน regex → เก็บ
  //   ถ้าไม่ส่ง field นี้มาเลย → ไม่แก้ไข
  if (body.start_date !== undefined) {
    if (body.start_date === null || body.start_date === '') {
      update.start_date = null;
    } else if (typeof body.start_date === 'string' && DATE_RE.test(body.start_date)) {
      update.start_date = body.start_date;
    } else {
      return NextResponse.json(
        { success: false, error: 'วันที่เริ่มไม่ถูกต้อง' },
        { status: 400 }
      );
    }
  }

  if (body.time !== undefined) update.time = body.time || '';
  if (body.location !== undefined) update.location = (body.location || '').trim();
  if (body.description !== undefined) update.description = (body.description || '').trim();
  if (body.department_id !== undefined) update.department_id = body.department_id || null;

  // ★ v3.10.0 รอบที่ 31: ตรวจสอบวันกำหนดส่ง >= วันที่เริ่ม (server-side)
  //   กรณี PATCH ซับซ้อนเพราะ field ใด field หนึ่งอาจไม่ได้ส่งมา
  //   → ใช้ค่าที่จะ update ถ้ามี, ถ้าไม่มีก็ไม่ตรวจ (defensive)
  if (update.start_date !== undefined && update.date !== undefined) {
    if (update.start_date && update.date < update.start_date) {
      return NextResponse.json(
        { success: false, error: 'วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม' },
        { status: 400 }
      );
    }
  }

  if (body.color !== undefined) {
    if (!VALID_COLORS.test(body.color)) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบสีไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    update.color = body.color;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { success: false, error: 'ไม่มี field ที่ต้องแก้ไข' },
      { status: 400 }
    );
  }

  try {
    const { error } = await guard.adminClient
      .from('ypwork_events')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('[/api/events/[id] PATCH] error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถแก้ไขรายการ: ${error.message}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true },
      { status: 200, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/events/[id] PATCH] exception:', err);
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
    // Delete event — FK ON DELETE CASCADE จะลบ tasks + task_assignees อัตโนมัติ
    const { error } = await guard.adminClient
      .from('ypwork_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[/api/events/[id] DELETE] error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถลบรายการ: ${error.message}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true },
      { status: 200, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/events/[id] DELETE] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
