'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Sorting (r48)
 * ============================================================
 * Sort functions สำหรับ TimelineItem
 * - sortByPriorityTimeTitle (within section)
 * - sortByDatePriorityTimeTitle (across dates)
 * ============================================================
 */

import type { TimelineItem } from './today-types';

// MODULE 4: SORTING
// ═══════════════════════════════════════════════════════════════

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function sortByPriorityTimeTitle(a: TimelineItem, b: TimelineItem): number {
  const pa = PRIORITY_ORDER[a.priority] ?? 3;
  const pb = PRIORITY_ORDER[b.priority] ?? 3;
  if (pa !== pb) return pa - pb;
  const sa = a.startTime || '';
  const sb = b.startTime || '';
  if (sa && sb && sa !== sb) return sa.localeCompare(sb);
  if (sa && !sb) return -1;
  if (!sa && sb) return 1;
  return a.title.localeCompare(b.title, 'th');
}

export function sortByDatePriorityTimeTitle(
  a: TimelineItem,
  b: TimelineItem,
): number {
  const da = a.itemDate;
  const db = b.itemDate;
  if (da && db && da !== db) return da.localeCompare(db);
  return sortByPriorityTimeTitle(a, b);
}
