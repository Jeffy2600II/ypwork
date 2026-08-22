import { withAuth, apiSuccess } from '@/lib/api';
import { validationError } from '@/lib/api/errors';
import { usersRepo } from '@/lib/repositories';

export const GET = withAuth(async (ctx, request) => {
  const { searchParams } = new URL(request.url);
  const deptId = searchParams.get('dept_id');
  if (!deptId) throw validationError('Missing dept_id parameter');

  const members = await usersRepo.findByDepartment(ctx.adminClient, deptId);
  return apiSuccess(members, ctx.requestId, { cache: 'staticList' });
});
