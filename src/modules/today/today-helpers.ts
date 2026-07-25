'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Helpers (r48)
 * ============================================================
 * Item builders + categorization engine
 * - buildStandaloneEventItem, buildTaskItem
 * - categorizeByDates, buildDateClusters, formatFullDateCaption, buildTimeGroups
 * ============================================================
 */

import type { YPEvent, Task } from '@/lib/types';
import { THAI_DAYS, THAI_MONTHS, resolveEventStatus } from '@/lib/utils/date';
import type {
  TimelineItem,
  ItemDateContext,
  DateCluster,
} from './today-types';

// MODULE 2: ITEM BUILDERS
// ═══════════════════════════════════════════════════════════════

/** Build a TimelineItem from a standalone event (no tasks inside) */
export function buildStandaloneEventItem(
  ev: YPEvent,
  dateContext: ItemDateContext,
): TimelineItem {
  return {
    id: `ev-${ev.id}`,
    startTime: ev.time || null,
    title: ev.title,
    status: ev.type === 'group' ? resolveEventStatus(ev) : ev.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev.type === 'group' ? ev : null,
    task: null,
    event: ev.type === 'group' ? null : ev,
    assigneeName: null,
    assigneeColor: null,
    priority: 'medium',
    estimatedTime: null,
    dueDate: ev.date,
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    itemDate: ev.start_date || ev.date,
  };
}

/** Build a TimelineItem from a task inside a group event */
export function buildTaskItem(
  ev: YPEvent,
  t: Task,
  dateContext: ItemDateContext,
): TimelineItem {
  return {
    id: `task-${t.id}`,
    startTime: t.start_time || ev.time || null,
    title: t.title,
    status: t.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev,
    task: t,
    event: null,
    assigneeName: t.assignees?.[0]?.full_name?.split(' ')[0] || null,
    assigneeColor: t.assignees?.[0]?.color || null,
    priority: t.priority || 'medium',
    estimatedTime: t.estimated_time || null,
    dueDate: t.due_date || ev.date,
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    itemDate: t.start_date || ev.start_date || ev.date,
  };
}

// ═══════════════════════════════════════════════════════════════
// MODULE 3: CATEGORIZATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Decide which section a item belongs to based on effectiveStart / effectiveDue.
 *   - overdue:  effectiveDue < today && not done
 *   - today:    effectiveStart ≤ today ≤ effectiveDue
 *   - upcoming: effectiveStart > today && not done
 *   - null:     done item in past or future (hide)
 */
export function categorizeByDates(
  effectiveStart: string,
  effectiveDue: string,
  todayStr: string,
  isDone: boolean,
): ItemDateContext | null {
  if (effectiveDue < todayStr && !isDone) return 'overdue';
  if (effectiveStart <= todayStr && effectiveDue >= todayStr) return 'today';
  if (effectiveStart > todayStr && !isDone) return 'upcoming';
  return null;
}

/** Group items by itemDate for date-cluster sections */
export function buildDateClusters(items: TimelineItem[]): DateCluster[] {
  const clusters: DateCluster[] = [];
  for (const item of items) {
    const dateKey = item.itemDate;
    const last = clusters[clusters.length - 1];
    if (last && last.dateKey === dateKey) {
      last.items.push(item);
      last.itemCount++;
    } else {
      clusters.push({ dateKey, items: [item], itemCount: 1 });
    }
  }
  return clusters;
}

/** Full Thai date caption for date-cluster headers */
export function formatFullDateCaption(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = THAI_DAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `วัน${weekday}ที่ ${day} ${month} ${yearBE}`;
}

/** Split items into morning / afternoon / unscheduled groups */
export function buildTimeGroups(items: TimelineItem[]) {
  const morning: TimelineItem[] = [];
  const afternoon: TimelineItem[] = [];
  const unscheduled: TimelineItem[] = [];

  for (const item of items) {
    if (!item.startTime) {
      unscheduled.push(item);
      continue;
    }
    const hour = parseInt(item.startTime.split(':')[0] || '', 10);
    if (!Number.isNaN(hour) && hour < 12) {
      morning.push(item);
    } else {
      afternoon.push(item);
    }
  }
  return { morning, afternoon, unscheduled };
}
