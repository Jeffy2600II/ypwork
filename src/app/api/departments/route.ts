import { withAuth, apiSuccess } from '@/lib/api';
import { departmentsRepo } from '@/lib/repositories';

export const GET = withAuth(async (ctx) => {
  const departments = await departmentsRepo.findAll(ctx.adminClient);
  return apiSuccess(departments, ctx.requestId, { cache: 'staticList' });
});
