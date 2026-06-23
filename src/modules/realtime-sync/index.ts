// Path:    src/modules/realtime-sync/index.ts
// Purpose: RealtimeSync — Module #6 of 6 Core Modules.
//          Subscribes to Supabase Realtime on ypwork_tasks, ypwork_subtasks,
//          ypwork_assignees. Re-fetches on any change so all clients stay in sync.

'use client';

import { useEffect, useRef } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';

/**
 * useRealtimeSync — subscribes to ypwork_* table changes.
 * Calls `onChange` whenever any of the watched tables changes.
 *
 * Usage:
 *   useRealtimeSync(() => { refetch(); });
 */
export function useRealtimeSync(onChange: () => void, enabled = true) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const sb = getBrowserSupabase();
    let mounted = true;

    const channel = sb
      .channel('ypwork-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ypwork_tasks' }, () => {
        if (mounted) cbRef.current();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ypwork_subtasks' }, () => {
        if (mounted) cbRef.current();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ypwork_assignees' }, () => {
        if (mounted) cbRef.current();
      })
      .subscribe();

    return () => {
      mounted = false;
      try { sb.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [enabled]);
}

export const RealtimeSyncAPI = Object.freeze({
  useRealtimeSync,
} as const);
