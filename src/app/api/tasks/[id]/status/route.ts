// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PATCH /api/tasks/[id]/status (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// อัปเดตสถานะของ task
// Body: { status: 'todo' | 'ongoing' | 'done' }
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.noStore()
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';

const VALID_STATUSES = ['todo', 'ongoing', 'done'] as const;

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

  const { status } = body || {};
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { success: false, error: 'สถานะไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  try {
    const { error } = await guard.adminClient
      .from('ypwork_tasks')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('[/api/tasks/[id]/status PATCH] error:', error.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถอัปเดตสถานะ: ${error.message}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true },
      { status: 200, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/tasks/[id]/status PATCH] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
