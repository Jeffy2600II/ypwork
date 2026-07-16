// ═══════════════════════════════════════════════════════════════
// YP WORK · API · GET /api/profile/stats (v3.8.0)
// ═══════════════════════════════════════════════════════════════
// ดึงสถิติของ user สำหรับหน้า profile
// ใช้ adminClient (service role) เพื่อ bypass RLS
//
// ★ v3.8.0: เพิ่ม apiCacheHeaders.list() (5s cache + 10s SWR)
//   ลด request ซ้ำเมื่อ user เข้า profile หลายครั้งติดๆ
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { apiCacheHeaders } from '@/lib/api/cache';

export async function GET(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
      { status: guard.response.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const userAuthUid = searchParams.get('user_auth_uid');
  const departmentId = searchParams.get('department_id');

  if (!userAuthUid) {
    return NextResponse.json(
      { success: false, error: 'Missing user_auth_uid parameter' },
      { status: 400 }
    );
  }

  try {
    // ── Parallel batch: dept event count + my assignments ──
    const [deptEventsResult, myAssigneesResult] = await Promise.all([
      departmentId
        ? guard.adminClient
            .from('ypwork_events')
            .select('id', { count: 'exact', head: true })
            .eq('department_id', departmentId)
        : Promise.resolve({ count: 0, data: null, error: null }),
      guard.adminClient
        .from('ypwork_task_assignees')
        .select('task_id')
        .eq('user_auth_uid', userAuthUid),
    ]);

    const deptEvents = (deptEventsResult as any).count || 0;

    const myTaskIds = ((myAssigneesResult.data as any[]) || []).map((a) => a.task_id);
    let myTasks = 0;
    let myDone = 0;
    let myPending = 0;

    if (myTaskIds.length > 0) {
      const { data: myTasksRaw } = await guard.adminClient
        .from('ypwork_tasks')
        .select('id, status')
        .in('id', myTaskIds);

      myTasks = myTasksRaw?.length || 0;
      myDone = myTasksRaw?.filter((t: any) => t.status === 'done').length || 0;
      myPending = myTasks - myDone;
    }

    const completionRate = myTasks > 0 ? Math.round((myDone / myTasks) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        deptEvents,
        myTasks,
        myDone,
        myPending,
        completionRate,
      },
    }, { status: 200, headers: apiCacheHeaders.list() });
  } catch (err) {
    console.error('[/api/profile/stats GET] exception:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500, headers: apiCacheHeaders.noStore() }
    );
  }
}
