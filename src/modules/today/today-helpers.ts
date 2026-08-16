'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Helpers
 * ============================================================
 * Item builders + categorization engine
 * - buildStandaloneEventItem, buildTaskItem
 * - categorizeByDates, buildDateClusters, formatFullDateCaption, buildTimeGroups
 *
 * Round 12: Removed 'overdue' category — no status system.
 *   Past-due items now appear in 'today' section.
 * ============================================================
 */

import type { YPEvent, Task } from '@/lib/types';
import { THAI_DAYS, THAI_MONTHS } from '@/lib/utils/date';
import {
  getEffectiveStartDate,
  getEffectiveDueDate,
  getEffectiveTaskStartDate,
  getEffectiveTaskDueDate,
} from '@/lib/utils/event-date';
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
    accent: ev.color || '#4F46E5',
    parentEvent: ev.type === 'group' ? ev : null,
    task: null,
    event: ev.type === 'group' ? null : ev,
    assigneeName: null,
    assigneeColor: null,
    priority: 'medium',
    estimatedTime: null,
    dueDate: getEffectiveDueDate(ev),
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    itemDate: getEffectiveStartDate(ev),
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
    accent: ev.color || '#4F46E5',
    parentEvent: ev,
    task: t,
    event: null,
    assigneeName: t.assignees?.[0]?.full_name?.split(' ')[0] || null,
    assigneeColor: t.assignees?.[0]?.color || null,
    priority: t.priority || 'medium',
    estimatedTime: t.estimated_time || null,
    dueDate: getEffectiveTaskDueDate(t, ev),
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    itemDate: getEffectiveTaskStartDate(t, ev),
  };
}

// ═══════════════════════════════════════════════════════════════
// MODULE 3: CATEGORIZATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Decide which section a item belongs to based on effectiveStart / effectiveDue.
 *   - today:    effectiveStart ≤ today ≤ effectiveDue, OR due date is in the past (still relevant)
 *   - upcoming: effectiveStart > today
 *   - null:     null dates (cannot categorize)
 *
 * Round 12: Past-due items now return 'today' instead of 'overdue'.
 */
export function categorizeByDates(
  effectiveStart: string | null,
  effectiveDue: string | null,
  todayStr: string,
): ItemDateContext | null {
  const due = effectiveDue ?? effectiveStart;
  if (!due || !effectiveStart) return null;

  // Past-due items are still relevant → show in 'today' section
  if (due < todayStr) return 'today';
  if (effectiveStart <= todayStr && due >= todayStr) return 'today';
  if (effectiveStart > todayStr) return 'upcoming';
  return null;
}

/** Group items by itemDate for date-cluster sections */
export function buildDateClusters(items: TimelineItem[]): DateCluster[] {
  const clusters: DateCluster[] = [];
  for (const item of items) {
    if (!item.itemDate) continue;
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

/**
 * Categorize EVENTS into 2 sections (today / upcoming).
 * A single event can appear in MULTIPLE sections simultaneously.
 * For group events, each sub-task is checked individually.
 * Round 12: Removed 'overdue' section — no status system.
 */
export function categorizeEventsIntoSections(
  events: YPEvent[],
  todayStr: string,
): { today: YPEvent[]; upcoming: YPEvent[] } {
  const todaySet = new Set<YPEvent>();
  const upcoming = new Set<YPEvent>();

  for (const ev of events) {
    if (ev.type === 'group') {
      const tasks = ev.tasks || [];
      if (tasks.length === 0) {
        const effectiveStart = getEffectiveStartDate(ev);
        const effectiveDue = getEffectiveDueDate(ev);
        const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr);
        if (ctx === 'today') todaySet.add(ev);
        else if (ctx === 'upcoming') upcoming.add(ev);
      } else {
        for (const t of tasks) {
          const effectiveStart = getEffectiveTaskStartDate(t, ev);
          const effectiveDue = getEffectiveTaskDueDate(t, ev);
          const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr);
          if (ctx === 'today') todaySet.add(ev);
          else if (ctx === 'upcoming') upcoming.add(ev);
        }
      }
    } else {
      const effectiveStart = getEffectiveStartDate(ev);
      const effectiveDue = getEffectiveDueDate(ev);
      const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr);
      if (ctx === 'today') todaySet.add(ev);
      else if (ctx === 'upcoming') upcoming.add(ev);
    }
  }

  const sortByDate = (a: YPEvent, b: YPEvent) => {
    const aDate = getEffectiveStartDate(a) || '9999-99-99';
    const bDate = getEffectiveStartDate(b) || '9999-99-99';
    return aDate.localeCompare(bDate);
  };

  return {
    today: [...todaySet].sort(sortByDate),
    upcoming: [...upcoming].sort(sortByDate),
  };
}
