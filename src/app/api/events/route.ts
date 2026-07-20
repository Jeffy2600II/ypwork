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
// ═══════════════════════════════════════════════════════════════

import { createId } from '@/lib/utils/id';

const VALID_TYPES = ['group', 'task'] as const;
const VALID_COLORS = /^#[0-9A-Fa-f]{6}$/;

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

  // ── Validate ──
  if (!VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { success: false, error: 'ประเภทงานไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) {
    return NextResponse.json(
      { success: false, error: 'ชื่องานไม่ถูกต้อง (ต้องมี 1-200 ตัวอักษร)' },
      { status: 400 }
    );
  }

  if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) {
    return NextResponse.json(
      { success: false, error: 'วันที่ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const time = typeof body.time === 'string' ? body.time.slice(0, 8) : '';
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, 500) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : '';
  const color = typeof body.color === 'string' && VALID_COLORS.test(body.color) ? body.color : '#4F46E5';
  const department_id = typeof body.department_id === 'string' && body.department_id ? body.department_id : null;

  // ── Generate ID ฝั่ง server (security: ป้องกัน user กำหนด ID เอง) ──
  const id = createId('ev');

  try {
    const { error } = await guard.adminClient.from('ypwork_events').insert({
      id,
      type: body.type,
      title: body.title.trim(),
      date: body.date,
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
        { success: false, error: `ไม่สามารถสร้างงาน: ${error.message}` },
        { status: 500 }
      );
    }

    // ★ v3.4.0: audit log
    auditLog('event_created', {
      actor: guard.userAuthUid,
      status: 'success',
      meta: { event_id: id, type: body.type, title: body.title.trim().slice(0, 100) },
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
