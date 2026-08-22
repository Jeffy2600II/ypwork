'use client';

/**
 * YP WORK - Realtime - Normalizers (Round 22)
 * Re-exports from the shared repository normalize module.
 * Single source of truth — eliminates the 3-copy duplication.
 */

export {
  normalizeEvent,
  normalizeTask,
  normalizeUserProfile,
  buildAssigneesMap,
  EVENT_FIELDS,
} from '@/lib/repositories/normalize';
