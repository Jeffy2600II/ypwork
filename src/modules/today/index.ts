'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Barrel Export (r48)
 * ============================================================
 * "Public Airlock" ของ today module
 *
 * File structure:
 *   today-types.ts        - shared types (TimelineItem, DateCluster, etc.)
 *   today-helpers.ts      - item builders + categorization
 *   today-sorting.ts      - sort functions
 *   today-format.ts       - schedule label + card time formatters
 *   today-item-card.tsx   - TodayItemCard component
 *   today-client.tsx      - main orchestrator (TodayClient)
 * ============================================================
 */

export { TodayClient } from './today-client';
export type { TodayClientProps, TimelineItem, ItemDateContext, DateCluster } from './today-types';
export {
  buildStandaloneEventItem,
  buildTaskItem,
  categorizeByDates,
  buildDateClusters,
  formatFullDateCaption,
  buildTimeGroups,
} from './today-helpers';
export { sortByPriorityTimeTitle, sortByDatePriorityTimeTitle } from './today-sorting';
export { formatScheduleLabel, formatCardTimeDisplay } from './today-format';
export { TodayItemCard } from './today-item-card';
