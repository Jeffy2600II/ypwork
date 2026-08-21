'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Centralized Data Sync Context (Round 21)
// ═══════════════════════════════════════════════════════════════
// In-app mutation broadcast layer that complements Supabase Realtime.
//
// PROBLEM
// ───────
// Each page (Today, Events list, Calendar, Detail) has its own
// useRealtimeEvents or useRealtimeEventById hook instance with
// independent local state. When a user edits data on the detail
// page, only that page's state updates (optimistic patch). Other
// pages don't know about the change until Supabase Realtime fires
// + a full HTTP reload completes — causing stale UI and requiring
// manual refresh.
//
// SOLUTION
// ────────
// A lightweight React Context that acts as an in-app event bus:
//
//   Mutation succeeds → notifyMutation(type, payload)
//                     → all subscribed hooks receive the event
//                     → they update local state immediately
//
// This runs alongside Supabase Realtime:
//   - Local mutations  → DataSyncContext (immediate, same session)
//   - Remote mutations → Supabase Realtime (eventual, cross-session)
//
// DESIGN PRINCIPLES
// ─────────────────
// - No global state store — hooks still own their state
// - No state duplication — context only carries mutation events
// - Fire-and-forget — notifications don't block the caller
// - Graceful degradation — works even if no subscribers
// - Round 22 ready — can be extended to a full event-driven layer
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
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

// ── Context Shape ─────────────────────────────────────────────

interface DataSyncContextValue {
  /** Broadcast a mutation event to all subscribers */
  notifyMutation: (mutation: Omit<SyncMutation, 'timestamp'>) => void;
  /** Subscribe to mutation events. Returns unsubscribe function */
  subscribe: (callback: (mutation: SyncMutation) => void) => () => void;
}

const DataSyncContext = React.createContext<DataSyncContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  // Stable ref array of subscribers — avoids re-renders on notify
  const subscribersRef = React.useRef<
    Set<(mutation: SyncMutation) => void>
  >(new Set());

  // Dedup buffer — prevents the same mutation from being processed twice
  // (e.g., when Supabase Realtime fires shortly after a local mutation)
  const recentMutationsRef = React.useRef<Map<string, number>>(new Map());
  const DEDUP_TTL_MS = 2000; // 2s window for dedup

  const notifyMutation = React.useCallback(
    (mutation: Omit<SyncMutation, 'timestamp'>) => {
      const fullMutation: SyncMutation = {
        ...mutation,
        timestamp: Date.now(),
      };

      // Build dedup key — type + entityId
      const dedupKey = `${mutation.type}:${mutation.eventId ?? ''}:${mutation.taskId ?? ''}`;
      const now = Date.now();

      // Clean expired entries
      for (const [key, ts] of recentMutationsRef.current.entries()) {
        if (now - ts > DEDUP_TTL_MS) {
          recentMutationsRef.current.delete(key);
        }
      }

      // Check for duplicate
      if (recentMutationsRef.current.has(dedupKey)) {
        return; // Already notified — skip
      }
      recentMutationsRef.current.set(dedupKey, now);

      // Notify all subscribers (fire-and-forget)
      for (const callback of subscribersRef.current) {
        try {
          callback(fullMutation);
        } catch {
          // Swallow errors — one subscriber failing shouldn't break others
        }
      }
    },
    [],
  );

  const subscribe = React.useCallback(
    (callback: (mutation: SyncMutation) => void) => {
      subscribersRef.current.add(callback);
      return () => {
        subscribersRef.current.delete(callback);
      };
    },
    [],
  );

  const value = React.useMemo(
    () => ({ notifyMutation, subscribe }),
    [notifyMutation, subscribe],
  );

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
}

// ── Consumer Hook ─────────────────────────────────────────────

export function useDataSync(): DataSyncContextValue {
  const ctx = React.useContext(DataSyncContext);
  if (!ctx) {
    // Graceful degradation — return no-op if no provider
    return {
      notifyMutation: () => {},
      subscribe: () => () => {},
    };
  }
  return ctx;
}

/**
 * Convenience hook: subscribe to sync mutations and return
 * the latest mutation. Useful for hooks that need to react
 * to mutations from other pages.
 */
export function useSyncMutations(
  callback: (mutation: SyncMutation) => void,
): void {
  const { subscribe } = useDataSync();
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    const unsubscribe = subscribe((mutation) => {
      callbackRef.current(mutation);
    });
    return unsubscribe;
  }, [subscribe]);
}
