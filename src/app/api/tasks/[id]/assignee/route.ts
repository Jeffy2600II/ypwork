// ═══════════════════════════════════════════════════════════════
// YP WORK · API · PUT /api/tasks/[id]/assignee (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// ตั้งผู้รับผิดชอบ task — ลบ assignee เดิมทั้งหมด แล้วเพิ่มคนใหม่
// (task มีได้ 1 assignee — เพื่อความเรียบง่าย)
//
// Body: { assignee_id: string | null }
//   - string: ตั้ง assignee ใหม่
//   - null: ลบ assignee ออกทั้งหมด
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.noStore()
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id: taskId } = await params;
  if (!taskId || typeof taskId !== 'string') {
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

  const { assignee_id } = body || {};
  if (assignee_id !== null && (typeof assignee_id !== 'string' || !assignee_id.trim())) {
    return NextResponse.json(
      { success: false, error: 'assignee_id ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  try {
    // ── Delete all existing assignees ──
    const { error: delErr } = await guard.adminClient
      .from('ypwork_task_assignees')
      .delete()
      .eq('task_id', taskId);

    if (delErr) {
      console.error('[/api/tasks/[id]/assignee PUT] delete error:', delErr.message);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถลบ assignee เดิม: ${delErr.message}` },
        { status: 500, headers: apiCacheHeaders.noStore() }
      );
    }

    // ── Insert new assignee if provided ──
    if (assignee_id) {
      const { error: insErr } = await guard.adminClient
        .from('ypwork_task_assignees')
        .insert({
          task_id: taskId,
          user_auth_uid: assignee_id,
        });

      if (insErr) {
        console.error('[/api/tasks/[id]/assignee PUT] insert error:', insErr.message);
        return NextResponse.json(
          { success: false, error: `ไม่สามารถตั้ง assignee: ${insErr.message}` },
          { status: 500, headers: apiCacheHeaders.noStore() }
        );
      }
    }

    // ★ v3.8.0: no-store — mutation response
    return NextResponse.json(
      { success: true },
      { status: 200, headers: apiCacheHeaders.noStore() }
    );
  } catch (err) {
    console.error('[/api/tasks/[id]/assignee PUT] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
