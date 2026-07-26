'use client';

/**
 * ============================================================
 * YP WORK - Realtime Hooks - Barrel Export (r48)
 * ============================================================
 * "Public Airlock" of the Realtime module - every hook this
 * module exports to the outside world must go through here.
 *
 * NASA-style module boundary principle:
 *   - Files inside this folder (client.ts, normalize.ts, etc.)
 *     are "internal implementation" - never import them directly
 *     from outside.
 *   - To use a hook: import { useRealtimeEvents } from '@/lib/hooks/use-realtime'
 *   - To use the client: import { getClient } from '@/lib/hooks/use-realtime'
 *
 * File structure (each file has single responsibility):
 *   client.ts                       - Supabase client singleton + useUniqueChannelName
 *   normalize.ts                    - normalizeEvent, normalizeTask, EVENT_FIELDS
 *   fetch.ts                        - fetchEvents, fetchEventById (HTTP fetch helpers)
 *   use-realtime-events.ts          - useRealtimeEvents (list/calendar/today)
 *   use-realtime-event-by-id.ts     - useRealtimeEventById (detail page)
 *   use-realtime-events-for-date.ts - useRealtimeEventsForDate (day view)
 *   use-realtime-departments.ts     - fetchDepartments + useRealtimeDepartments
 *   use-realtime-profile-stats.ts   - fetchProfileStats + useRealtimeProfileStats + ProfileStats type
 *   use-realtime-activity-log.ts    - fetchActivityLog + useRealtimeActivityLog + ActivityLogEntry type
 *   use-realtime-years.ts           - fetchYears + useRealtimeYears + CouncilYear type
 *   use-realtime-dept-members.ts    - fetchDeptMembers + useRealtimeDeptMembers
 *   use-realtime-session-user.ts    - fetchSessionUserLive + useRealtimeSessionUser
 *   use-realtime-pending-request.ts - checkPendingStatusViaServer + fetchAllPendingRequests
 *                                     + useRealtimePendingRequest + useRealtimePendingRequests + types
 *
 * Backward compatibility:
 *   import { useRealtimeEvents, useRealtimeEventById, ... } from '@/lib/hooks/use-realtime'
 *   still works - this index.ts re-exports everything.
 * ============================================================
 */

// Internal infrastructure (exported for external use)
export { getClient, getClientError, useUniqueChannelName } from './client';
export { normalizeEvent, normalizeTask, EVENT_FIELDS } from './normalize';
export { fetchEvents, fetchEventById } from './fetch';

// Hooks
export { useRealtimeEvents } from './use-realtime-events';
export { useRealtimeEventById } from './use-realtime-event-by-id';
export { useRealtimeEventsForDate } from './use-realtime-events-for-date';
export { useRealtimeDepartments } from './use-realtime-departments';
export { useRealtimeProfileStats } from './use-realtime-profile-stats';
export type { ProfileStats } from './use-realtime-profile-stats';
export { useRealtimeActivityLog } from './use-realtime-activity-log';
export type { ActivityLogEntry } from './use-realtime-activity-log';
export { useRealtimeYears } from './use-realtime-years';
export type { CouncilYear } from './use-realtime-years';
export { useRealtimeDeptMembers } from './use-realtime-dept-members';
export { useRealtimeSessionUser } from './use-realtime-session-user';
export { useRealtimePendingRequest, useRealtimePendingRequests } from './use-realtime-pending-request';
export type {
  PendingStatus,
  UseRealtimePendingRequestParams,
  UseRealtimePendingRequestResult,
  UseRealtimePendingRequestsResult,
  PendingRequestAdminItem,
} from './use-realtime-pending-request';
