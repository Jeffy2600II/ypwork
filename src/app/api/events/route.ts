// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/events (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// ดึง events ทั้งหมดพร้อม department + tasks + assignees
// ใช้ adminClient (service role) เพื่อ bypass RLS
//
// ★ v3.8.0 changes:
//   - ใช้ apiCacheHeaders.list() แทน inline Cache-Control string
//     → consistent policy across all GET list endpoints
//   - POST ใส่ apiCacheHeaders.noStore() → กัน browser  replay mutation
//
// ★ v3.4.0 (history):
//   - ใช้ fetchEventsWithRelations() — ลด RTT จาก 3 → 2
//   - เพิ่ม Cache-Control: private, max-age=5, stale-while-revalidate=10
//
// Query params:
//   ?from=YYYY-MM-DD  — กรอง events ตั้งแต่วันที่นี้ (optional)
//   ?to=YYYY-MM-DD    — กรอง events ถึงวันที่นี้ (optional)
//   ?date=YYYY-MM-DD  — กรอง events ของวันที่เฉพาะเจาะจง (optional)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { auditLog } from '@/lib/security';
import { fetchEventsWithRelations } from '@/lib/db/event-loader';
import { apiCacheHeaders } from '@/lib/api/cache';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
      { status: guard.response.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  try {
    // ★ v3.4.0: ใช้ centralized loader — 2 RTT (ลดจาก 3)
    const events = await fetchEventsWithRelations(guard.adminClient, {
      from: from && DATE_RE.test(from) ? from : null,
      to: to && DATE_RE.test(to) ? to : null,
      date: date && DATE_RE.test(date) ? date : null,
    });

    // ★ v3.8.0: ใช้ apiCacheHeaders.list() จาก lib/api/cache.ts
    //   → consistent policy across all GET list endpoints
    return NextResponse.json(
      { success: true, events },
      {
        status: 200,
        headers: apiCacheHeaders.list(),
      }
    );
  } catch (err) {
    console.error('[/api/events GET] exception:', err);
    auditLog('api_error', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      status: 'failure',
      meta: { path: '/api/events', error: String(err).slice(0, 200) },
    });
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/events — สร้าง event ใหม่
// ═══════════════════════════════════════════════════════════════
// ★ v3.4.0: เพิ่ม audit log หลังสร้างสำเร็จ
// ★ r51: ใช้ validateEventPayload() จาก event-validation.ts (single source of truth)
//        + รองรับ null date สำหรับ group type
// ═══════════════════════════════════════════════════════════════

import { createId } from '@/lib/utils/id';
import {
  validateEventPayload,
  validateEventDate,
  validateDateRange,
  DATE_REGEX,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_LOCATION_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  type EventPayloadForValidation,
} from '@/modules/events/event-validation';
import { resolveEventColor } from '@/modules/events/event-colors';

export async function POST(request: NextRequest) {
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

  // ── Validate payload ทั้งหมดผ่าน single source of truth ──
  // ★ r51: ใช้ validateEventPayload แทน inline validation กระจัดกระจาย
  const payload: EventPayloadForValidation = {
    type: body.type,
    title: body.title,
    date: body.date,
    start_date: body.start_date,
    time: body.time,
    location: body.location,
    description: body.description,
    color: body.color,
    department_id: body.department_id,
  };
  const validation = validateEventPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  // ── Normalize fields หลัง validate ผ่าน ──
  const type = body.type as 'group' | 'task';
  const title = (body.title as string).trim().slice(0, EVENT_TITLE_MAX_LENGTH);

  // ★ r51: date normalization — group type อาจเป็น null หรือ empty string
  //   ถ้าส่งมาเป็น empty string → normalize เป็น null
  //   ถ้า type='group' และ date เป็นค่าว่าง → เก็บ null
  //   ถ้า type='task' → date เป็น string YYYY-MM-DD (guaranteed โดย validator)
  let date: string | null = null;
  if (typeof body.date === 'string' && DATE_REGEX.test(body.date)) {
    date = body.date;
  }

  // start_date normalization — optional, YYYY-MM-DD
  let start_date: string | null = null;
  if (typeof body.start_date === 'string' && DATE_REGEX.test(body.start_date)) {
    start_date = body.start_date;
  }

  // ── ตรวจสอบ date range อีกครั้ง (defensive) ──
  const rangeCheck = validateDateRange(start_date, date);
  if (!rangeCheck.ok) {
    return NextResponse.json(
      { success: false, error: rangeCheck.error },
      { status: 400 }
    );
  }

  const time =
    typeof body.time === 'string' && body.time
      ? body.time.slice(0, 8)
      : '';
  const location =
    typeof body.location === 'string'
      ? body.location.trim().slice(0, EVENT_LOCATION_MAX_LENGTH)
      : '';
  const description =
    typeof body.description === 'string'
      ? body.description.trim().slice(0, EVENT_DESCRIPTION_MAX_LENGTH)
      : '';
  const color = resolveEventColor(body.color);
  const department_id =
    typeof body.department_id === 'string' && body.department_id
      ? body.department_id
      : null;

  // ── Generate ID ฝั่ง server (security: ป้องกัน user กำหนด ID เอง) ──
  const id = createId('ev');

  try {
    const { error } = await guard.adminClient.from('ypwork_events').insert({
      id,
      type,
      title,
      date, // ★ r51: อาจเป็น null สำหรับ group type
      start_date,
      time,
      location,
      description,
      department_id,
      status: 'todo',
      color,
      created_by: guard.userAuthUid,
    });

    if (error) {
      console.error('[/api/events POST] insert error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถสร้างรายการ: ${error.message}` },
        { status: 500 }
      );
    }

    // ★ v3.4.0: audit log
    auditLog('event_created', {
      actor: guard.userAuthUid,
      status: 'success',
      meta: { event_id: id, type, title: title.slice(0, 100) },
    });

    // ★ v3.8.0: no-store — กัน browser replay POST บน back button
    return NextResponse.json(
      { success: true, id },
      { status: 201, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/events POST] exception:', err);
    auditLog('event_created', {
      actor: guard.userAuthUid,
      status: 'failure',
      meta: { error: String(err).slice(0, 200) },
    });
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
