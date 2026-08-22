import { withAuth, apiSuccess } from '@/lib/api';
import { validationError, notFound, forbidden, internalError } from '@/lib/api/errors';
import { tasksRepo } from '@/lib/repositories';
import { getTaskOwnership } from '@/lib/auth/ownership';
import { canUpdateTask, canDeleteTask } from '@/lib/auth/permissions';
import { auditLog } from '@/lib/security';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const PATCH = withAuth(async (ctx, request, routeCtx) => {
  const { id } = await routeCtx!.params;
  if (!id) throw validationError('Missing task id');

  const ownership = await getTaskOwnership(ctx.adminClient, id);
  if (!ownership) throw notFound('ไม่พบ task');
  if (!canUpdateTask(ctx, ownership)) throw forbidden('คุณไม่มีสิทธิ์แก้ไข task นี้');

  let body: any;
  try { body = await request.json(); } catch { throw validationError('Invalid JSON body'); }

  const update: Record<string, any> = {};
  if (body.title !== undefined) { if (typeof body.title !== 'string' || !body.title.trim()) throw validationError('ชื่อ task ไม่ถูกต้อง'); update.title = body.title.trim(); }
  if (body.priority !== undefined) { if (!VALID_PRIORITIES.includes(body.priority)) throw validationError('ความสำคัญไม่ถูกต้อง'); update.priority = body.priority; }
  if (body.due_date !== undefined) { if (body.due_date !== null && (typeof body.due_date !== 'string' || !DATE_RE.test(body.due_date))) throw validationError('วันที่กำหนดส่งไม่ถูกต้อง'); update.due_date = body.due_date || null; }
  if (body.start_date !== undefined) { if (body.start_date !== null && (typeof body.start_date !== 'string' || !DATE_RE.test(body.start_date))) throw validationError('วันที่เริ่มไม่ถูกต้อง'); update.start_date = body.start_date || null; }
  if (body.start_time !== undefined) { if (body.start_time !== null && (typeof body.start_time !== 'string' || !TIME_RE.test(body.start_time))) throw validationError('เวลาเริ่มไม่ถูกต้อง'); update.start_time = body.start_time || null; }
  if (body.estimated_time !== undefined) update.estimated_time = body.estimated_time || '';
  if (body.notes !== undefined) update.notes = body.notes || '';
  if (body.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : [];
  if (update.start_date !== undefined && update.due_date !== undefined) { if (update.start_date && update.due_date && update.due_date < update.start_date) throw validationError('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม'); }
  if (Object.keys(update).length === 0) throw validationError('ไม่มี field ที่ต้องแก้ไข');

  const { error } = await tasksRepo.update(ctx.adminClient, id, update);
  if (error) throw internalError(`ไม่สามารถแก้ไข task: ${error}`);

  auditLog('task_updated', { actor: ctx.userAuthUid, status: 'success', requestId: ctx.requestId, meta: { task_id: id } });
  return apiSuccess(null, ctx.requestId, { cache: 'noStore' });
});

export const DELETE = withAuth(async (ctx, _request, routeCtx) => {
  const { id } = await routeCtx!.params;
  if (!id) throw validationError('Missing task id');

  const ownership = await getTaskOwnership(ctx.adminClient, id);
  if (!ownership) throw notFound('ไม่พบ task');
  if (!canDeleteTask(ctx, ownership)) throw forbidden('คุณไม่มีสิทธิ์ลบ task นี้');

  const { error } = await tasksRepo.remove(ctx.adminClient, id);
  if (error) throw internalError(`ไม่สามารถลบ task: ${error}`);

  auditLog('task_deleted', { actor: ctx.userAuthUid, status: 'success', requestId: ctx.requestId, meta: { task_id: id } });
  return apiSuccess(null, ctx.requestId, { cache: 'noStore' });
});
