import { withAuth, apiSuccess } from '@/lib/api';
import { validationError, notFound, forbidden, internalError } from '@/lib/api/errors';
import { tasksRepo } from '@/lib/repositories';
import { getTaskOwnership } from '@/lib/auth/ownership';
import { canUpdateTask } from '@/lib/auth/permissions';

export const PUT = withAuth(async (ctx, request, routeCtx) => {
  const { id: taskId } = await routeCtx!.params;
  if (!taskId) throw validationError('Missing task id');

  const ownership = await getTaskOwnership(ctx.adminClient, taskId);
  if (!ownership) throw notFound('ไม่พบ task');
  if (!canUpdateTask(ctx, ownership)) throw forbidden('คุณไม่มีสิทธิ์แก้ไข task นี้');

  let body: any;
  try { body = await request.json(); } catch { throw validationError('Invalid JSON body'); }

  const { assignee_id } = body || {};
  if (assignee_id !== null && (typeof assignee_id !== 'string' || !assignee_id.trim())) throw validationError('assignee_id ไม่ถูกต้อง');

  const { error } = await tasksRepo.setAssignee(ctx.adminClient, taskId, assignee_id);
  if (error) throw internalError(`ไม่สามารถตั้ง assignee: ${error}`);

  return apiSuccess(null, ctx.requestId, { cache: 'noStore' });
});
