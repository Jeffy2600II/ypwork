import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api';
import { validationError, notFound, internalError } from '@/lib/api/errors';
import { tasksRepo } from '@/lib/repositories';
import { auditLog } from '@/lib/security';
import { getUserColor } from '@/lib/utils/user-color';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const POST = withAuth(async (ctx, request, routeCtx) => {
  const { id: eventId } = await routeCtx!.params;
  if (!eventId) throw validationError('Missing event id');

  let body: any;
  try { body = await request.json(); } catch { throw validationError('Invalid JSON body'); }

  const { title, priority, due_date, start_date, start_time, estimated_time, notes, tags, assignee_id } = body || {};

  if (!title || typeof title !== 'string' || !title.trim()) throw validationError('กรุณากรอกชื่อ task');
  const finalPriority = priority || 'medium';
  if (!VALID_PRIORITIES.includes(finalPriority)) throw validationError('ความสำคัญไม่ถูกต้อง');
  if (due_date !== undefined && due_date !== null && (typeof due_date !== 'string' || !DATE_RE.test(due_date))) throw validationError('วันที่กำหนดส่งไม่ถูกต้อง');
  if (start_date !== undefined && start_date !== null && (typeof start_date !== 'string' || !DATE_RE.test(start_date))) throw validationError('วันที่เริ่มไม่ถูกต้อง');
  if (start_time !== undefined && start_time !== null && (typeof start_time !== 'string' || !TIME_RE.test(start_time))) throw validationError('เวลาเริ่มไม่ถูกต้อง');
  if (start_date && due_date && due_date < start_date) throw validationError('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม');

  // Verify event exists
  const { data: eventRow, error: eventErr } = await ctx.adminClient
    .from('ypwork_events')
    .select('id, type')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr || !eventRow) throw notFound('ไม่พบงานที่ต้องการเพิ่ม task');

  const sortOrder = await tasksRepo.getNextSortOrder(ctx.adminClient, eventId);

  const { task, error: taskErr } = await tasksRepo.create(ctx.adminClient, {
    event_id: eventId,
    title: title.trim(),
    priority: finalPriority,
    due_date: due_date || null,
    start_date: start_date || null,
    start_time: start_time || null,
    estimated_time: estimated_time || '',
    notes: notes || '',
    tags: Array.isArray(tags) ? tags : [],
    sort_order: sortOrder,
  });

  if (taskErr || !task) throw internalError(`ไม่สามารถเพิ่ม task: ${taskErr}`);

  // Insert assignee if provided
  if (assignee_id) {
    const { error: assigneeErr } = await ctx.adminClient
      .from('ypwork_task_assignees')
      .insert({ task_id: task.id, user_auth_uid: assignee_id });

    if (!assigneeErr) {
      const { data: uRaw } = await ctx.adminClient
        .from('council_users')
        .select('auth_uid, full_name, role, account_type, year, department_id')
        .eq('auth_uid', assignee_id)
        .maybeSingle();
      if (uRaw) {
        task.assignees = [{
          auth_uid: uRaw.auth_uid,
          full_name: uRaw.full_name,
          student_id: null, national_id: null,
          year: uRaw.year ?? null,
          role: uRaw.role ?? 'member',
          account_type: (uRaw.account_type || 'student') as 'student' | 'teacher' | 'other',
          approved: true, disabled: false, email: '',
          department_id: uRaw.department_id ?? null,
          color: getUserColor(uRaw.auth_uid),
        }];
      }
    }
  }

  if (!task.assignees) task.assignees = [];

  auditLog('task_created', { actor: ctx.userAuthUid, status: 'success', requestId: ctx.requestId, meta: { event_id: eventId, task_id: task.id } });
  return apiSuccess({ task }, ctx.requestId, { status: 201, cache: 'noStore' });
});
