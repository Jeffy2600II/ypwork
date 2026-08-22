'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Centralized Data Sync Context (Round 22)
// ═══════════════════════════════════════════════════════════════
// In-app mutation broadcast layer that complements Supabase Realtime.
//
// Round 22: Event types now imported from @/lib/realtime/event-types
// — single source of truth for real-time event contracts.
//
// DESIGN PRINCIPLES
// - No global state store — hooks still own their state
// - No state duplication — context only carries mutation events
// - Fire-and-forget — notifications don't block the caller
// - Graceful degradation — works even if no subscribers
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import type { SyncMutation, SyncMutationType } from '@/lib/realtime/event-types';

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
  const subscribersRef = React.useRef<
    Set<(mutation: SyncMutation) => void>
  >(new Set());

  const recentMutationsRef = React.useRef<Map<string, number>>(new Map());
  const DEDUP_TTL_MS = 2000;

  const notifyMutation = React.useCallback(
    (mutation: Omit<SyncMutation, 'timestamp'>) => {
      const fullMutation: SyncMutation = {
        ...mutation,
        timestamp: Date.now(),
      };

      const dedupKey = `${mutation.type}:${mutation.eventId ?? ''}:${mutation.taskId ?? ''}`;
      const now = Date.now();

      for (const [key, ts] of recentMutationsRef.current.entries()) {
        if (now - ts > DEDUP_TTL_MS) {
          recentMutationsRef.current.delete(key);
        }
      }

      if (recentMutationsRef.current.has(dedupKey)) {
        return;
      }
      recentMutationsRef.current.set(dedupKey, now);

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
    return {
      notifyMutation: () => {},
      subscribe: () => () => {},
    };
  }
  return ctx;
}

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

// Re-export types for backward compatibility
export type { SyncMutationType, SyncMutation };
