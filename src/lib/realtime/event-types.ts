// ═══════════════════════════════════════════════════════════════
// YP WORK · Realtime · Event Type Registry (Round 22)
// ═══════════════════════════════════════════════════════════════
// Formalized real-time event contracts.
// Used by: DataSyncContext (in-app event bus), real-time hooks.
//
// Two layers of real-time in YP Work:
//   1. Supabase Realtime (postgres_changes) — cross-session, DB-level
//   2. DataSyncContext (in-app event bus) — same-session, optimistic
//
// This file defines the shared event vocabulary for layer 2.
// Layer 1 (Supabase) just triggers a reload — no typed payload needed.
// ═══════════════════════════════════════════════════════════════

import type { YPEvent, Task } from '@/lib/types';

// ── Mutation Event Types ──────────────────────────────────────

export type SyncMutationType =
  | 'event-updated'
  | 'event-deleted'
  | 'task-created'
  | 'task-updated'
  | 'task-deleted';

export interface SyncMutation {
  type: SyncMutationType;
  /** Event ID affected by this mutation */
  eventId?: string;
  /** Task ID affected (for task mutations) */
  taskId?: string;
  /** Partial or full payload from the API response */
  payload?: Partial<YPEvent> & { tasks?: Task[] };
  /** Timestamp — used for dedup and ordering */
  timestamp: number;
}

// ── Supabase Realtime Table Subscriptions ──────────────────────
// Tables that trigger a full reload when changed.
// Documented here as the canonical list.

export const REALTIME_TABLES = [
  'ypwork_events',
  'ypwork_tasks',
  'ypwork_task_assignees',
  'ypwork_event_members',
  'council_users',
  'departments',
] as const;

export type RealtimeTable = (typeof REALTIME_TABLES)[number];
