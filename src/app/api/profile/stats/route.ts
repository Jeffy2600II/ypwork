import { withAuth, apiSuccess } from '@/lib/api';
import { validationError } from '@/lib/api/errors';

export const GET = withAuth(async (ctx, request) => {
  const { searchParams } = new URL(request.url);
  const userAuthUid = searchParams.get('user_auth_uid');
  const departmentId = searchParams.get('department_id');
  if (!userAuthUid) throw validationError('Missing user_auth_uid parameter');

  const [deptEventsResult, myAssigneesResult] = await Promise.all([
    departmentId
      ? ctx.adminClient.from('ypwork_events').select('id', { count: 'exact', head: true }).eq('department_id', departmentId)
      : Promise.resolve({ count: 0, data: null, error: null }),
    ctx.adminClient.from('ypwork_task_assignees').select('task_id').eq('user_auth_uid', userAuthUid),
  ]);

  const deptEvents = (deptEventsResult as any).count || 0;
  const myTaskIds = ((myAssigneesResult.data as any[]) || []).map((a) => a.task_id);
  let myTasks = 0;
  if (myTaskIds.length > 0) {
    const { data: myTasksRaw } = await ctx.adminClient.from('ypwork_tasks').select('id').in('id', myTaskIds);
    myTasks = myTasksRaw?.length || 0;
  }

  return apiSuccess({ deptEvents, myTasks }, ctx.requestId, { cache: 'list' });
});
