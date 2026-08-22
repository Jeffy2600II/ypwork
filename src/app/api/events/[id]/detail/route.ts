import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api';
import { validationError, notFound } from '@/lib/api/errors';
import { eventsRepo } from '@/lib/repositories';

export const GET = withAuth(async (ctx, _request, routeCtx) => {
  const { id } = await routeCtx!.params;
  if (!id) throw validationError('Missing event id');

  const { event } = await eventsRepo.findById(ctx.adminClient, id);
  if (!event) throw notFound('ไม่พบงาน');

  return apiSuccess(event, ctx.requestId, { cache: 'detail' });
});
