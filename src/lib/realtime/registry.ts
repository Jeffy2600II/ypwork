// ═══════════════════════════════════════════════════════════════
// YP WORK · Realtime · Event Registry (Round 24)
// ═══════════════════════════════════════════════════════════════
// Centralized real-time event type definitions and channel naming.
//
// This is the single source of truth for:
//   - Real-time event types (what events can be broadcast)
//   - Channel naming conventions (which tables to subscribe to)
//   - Event metadata (which tables each event type affects)
//
// The existing real-time hooks (lib/hooks/use-realtime/) are NOT
// changed — they continue to work as-is.
//
// This registry provides a standard reference for:
//   - New real-time features that need to subscribe to events
//   - The data-sync context to reference canonical event types
//   - Documentation of what the real-time system handles
// ═══════════════════════════════════════════════════════════════

// ── Real-time Event Types ──────────────────────────────────────
// Canonical event types for the YP Work real-time system.
// These correspond to domain operations that trigger UI updates.

export const RealtimeEventType = {
  // Event lifecycle
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_DELETED: 'EVENT_DELETED',

  // Task lifecycle
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',

  // Group (department) changes
  GROUP_UPDATED: 'GROUP_UPDATED',

  // User changes
  USER_UPDATED: 'USER_UPDATED',
  USER_ASSIGNED: 'USER_ASSIGNED',
} as const;

export type RealtimeEvent = (typeof RealtimeEventType)[keyof typeof RealtimeEventType];

// ── Channel / Table Registry ───────────────────────────────────
// Maps domain resources to the Supabase tables that real-time
// subscriptions need to watch.

export const REALTIME_TABLES = {
  EVENTS: 'ypwork_events',
  TASKS: 'ypwork_tasks',
  TASK_ASSIGNEES: 'ypwork_task_assignees',
  EVENT_MEMBERS: 'ypwork_event_members',
  COUNCIL_USERS: 'council_users',
  DEPARTMENTS: 'departments',
} as const;

// ── Channel Naming ─────────────────────────────────────────────
// Standard channel name prefixes to avoid conflicts.

export const CHANNEL_PREFIXES = {
  EVENTS: 'ypwork-events-realtime',
  EVENT_DETAIL: 'ypwork-event-detail-realtime',
  EVENTS_FOR_DATE: 'ypwork-events-for-date-realtime',
  DEPARTMENTS: 'ypwork-departments-realtime',
  DEPT_MEMBERS: 'ypwork-dept-members-realtime',
  PROFILE_STATS: 'ypwork-profile-stats-realtime',
  ACTIVITY_LOG: 'ypwork-activity-log-realtime',
  YEARS: 'ypwork-years-realtime',
  SESSION_USER: 'ypwork-session-user-realtime',
  PENDING_REQUEST: 'ypwork-pending-request-realtime',
  PENDING_REQUESTS: 'ypwork-pending-requests-realtime',
} as const;

// ── Event Schema ──────────────────────────────────────────────
// Standard shape for real-time events. Used for documentation
// and for future event-driven extensions.

export interface RealtimeEventSchema {
  /** Event type */
  type: RealtimeEvent;
  /** Resource ID (event ID, task ID, etc.) */
  resourceId: string;
  /** Table that changed */
  table: string;
  /** Change operation: INSERT | UPDATE | DELETE */
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Actor who triggered the change (auth_uid) */
  actor?: string;
  /** Timestamp */
  timestamp: string;
}

// ── Connection Status ──────────────────────────────────────────
// Standard connection states for real-time subscriptions.

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

/**
 * Map Supabase realtime subscription status to our standard.
 */
export function mapConnectionStatus(
  status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | string
): ConnectionStatus {
  switch (status) {
    case 'SUBSCRIBED':
      return 'connected';
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
      return 'error';
    case 'CLOSED':
      return 'disconnected';
    default:
      return 'reconnecting';
  }
}
