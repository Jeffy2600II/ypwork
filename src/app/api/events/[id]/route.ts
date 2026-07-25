// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PATCH/DELETE /api/events/[id] (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// PATCH  — แก้ไขรายการ (ใช้ adminClient bypass RLS)
// DELETE — ลบรายการ (cascade ลบ tasks + assignees ด้วย FK)
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.noStore() ทุก response
//   → กัน browser  replay mutation บน back/forward button
//
// ★ r51: รองรับ null date สำหรับ group type
//   - ถ้า PATCH ส่ง date: null หรือ date: '' → set null (group type)
//   - ถ้า PATCH ส่ง date: 'YYYY-MM-DD' → set ค่านั้น
//   - ถ้า PATCH ส่ง date: undefined → ไม่แก้ไข date
//   - ใช้ validation จาก event-validation.ts (single source of truth)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';
import {
  validateEventType,
  validateEventTitle,
  validateEventDate,
  validateStartDate,
  validateDateRange,
  validateTime,
  validateLocation,
  validateDescription,
  validateColor,
  validateDepartmentId,
  DATE_REGEX,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_LOCATION_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
} from '@/modules/events/event-validation';
import { resolveEventColor } from '@/modules/events/event-colors';
import type { EventType } from '@/lib/types';

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
  // ★ r51: ใช้ validators จาก event-validation.ts เพื่อ consistency
  const update: Record<string, any> = {};

  // type
  if (body.type !== undefined) {
    const r = validateEventType(body.type);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.type = body.type as EventType;
  }

  // title
  if (body.title !== undefined) {
    const r = validateEventTitle(body.title);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.title = (body.title as string).trim().slice(0, EVENT_TITLE_MAX_LENGTH);
  }

  // ★ r51: date — รองรับ null/empty string สำหรับ group type
  //   ถ้า body.date === null หรือ '' → set null (เหมาะกับ group)
  //   ถ้า body.date เป็น string ที่ผ่าน regex → set ค่านั้น
  //   ถ้า body.date === undefined → ไม่แก้ไข
  if (body.date !== undefined) {
    // กรณีที่ผู้ใช้ล้างค่า date (ส่ง null หรือ '')
    if (body.date === null || body.date === '') {
      update.date = null;
    } else if (typeof body.date === 'string' && DATE_REGEX.test(body.date)) {
      update.date = body.date;
    } else {
      return NextResponse.json(
        { success: false, error: 'วันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD หรือ null)' },
        { status: 400 }
      );
    }
  }

  // ★ v3.10.0 รอบที่ 29: start_date (YYYY-MM-DD, ไม่บังคับ)
  //   ถ้าส่ง null หรือ string ว่าง → ล้างค่า (set null)
  //   ถ้าส่งค่าที่ผ่าน regex → เก็บ
  //   ถ้าไม่ส่ง field นี้มาเลย → ไม่แก้ไข
  if (body.start_date !== undefined) {
    if (body.start_date === null || body.start_date === '') {
      update.start_date = null;
    } else {
      const r = validateStartDate(body.start_date);
      if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
      update.start_date = body.start_date;
    }
  }

  // ★ r51: ตรวจสอบ date range — defensive (กรณี PATCH ส่งทั้งสอง field)
  //   ถ้า PATCH ส่งเพียง field เดียว → ไม่สามารถตรวจ range ได้ (defensive skip)
  //   ถ้า PATCH ส่งทั้งสอง → ตรวจ
  if (update.start_date !== undefined && update.date !== undefined) {
    const r = validateDateRange(update.start_date as string | null, update.date as string | null);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
  }

  // time
  if (body.time !== undefined) {
    const r = validateTime(body.time);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.time = body.time || '';
  }

  // location
  if (body.location !== undefined) {
    const r = validateLocation(body.location);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.location = (body.location || '').trim().slice(0, EVENT_LOCATION_MAX_LENGTH);
  }

  // description
  if (body.description !== undefined) {
    const r = validateDescription(body.description);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.description = (body.description || '').trim().slice(0, EVENT_DESCRIPTION_MAX_LENGTH);
  }

  // department_id
  if (body.department_id !== undefined) {
    const r = validateDepartmentId(body.department_id);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.department_id = body.department_id || null;
  }

  // color
  if (body.color !== undefined) {
    const r = validateColor(body.color);
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    update.color = resolveEventColor(body.color);
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
