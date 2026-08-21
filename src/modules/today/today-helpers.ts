'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Helpers
 * ============================================================
 * Item builders + categorization engine
 * - buildStandaloneEventItem, buildTaskItem
 * - categorizeByDates, buildDateClusters, formatFullDateCaption, buildTimeGroups
 *
 * Round 18: Enhanced categorization with 5 natural date sections:
 *   overdue, today, tomorrow, this week, next week
 * Uses natural Thai language labels for better UX communication.
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
 * Decide which section an item belongs to based on effectiveStart / effectiveDue.
 * Round 18: Enhanced with 5 natural date categories.
 */
export function categorizeByDates(
  effectiveStart: string | null,
  effectiveDue: string | null,
  todayStr: string,
): ItemDateContext | null {
  const due = effectiveDue ?? effectiveStart;
  if (!due || !effectiveStart) return null;

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

// ═══════════════════════════════════════════════════════════════
// MODULE 4: ENHANCED EVENT CATEGORIZATION (Round 18)
// ═══════════════════════════════════════════════════════════════

/**
 * Date section keys — ordered by urgency.
 */
export type TodaySectionKey = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek';

/**
 * Calculate days difference between two date strings.
 * Returns positive for future dates, negative for past dates.
 */
function daysBetween(todayStr: string, targetStr: string): number {
  const today = new Date(todayStr + 'T00:00:00');
  const target = new Date(targetStr + 'T00:00:00');
  return Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Categorize EVENTS into 5 natural date sections.
 * Round 18: Enhanced with overdue, tomorrow, this week, next week.
 * A single event can appear in MULTIPLE sections simultaneously.
 * For group events, each sub-task is checked individually.
 */
export function categorizeEventsIntoSections(
  events: YPEvent[],
  todayStr: string,
): {
  overdue: YPEvent[];
  today: YPEvent[];
  tomorrow: YPEvent[];
  thisWeek: YPEvent[];
  nextWeek: YPEvent[];
} {
  const overdueSet = new Set<YPEvent>();
  const todaySet = new Set<YPEvent>();
  const tomorrowSet = new Set<YPEvent>();
  const thisWeekSet = new Set<YPEvent>();
  const nextWeekSet = new Set<YPEvent>();

  for (const ev of events) {
    if (ev.type === 'group') {
      const tasks = ev.tasks || [];
      if (tasks.length === 0) {
        categorizeSingleEvent(ev, todayStr, {
          overdueSet, todaySet, tomorrowSet, thisWeekSet, nextWeekSet,
        });
      } else {
        for (const t of tasks) {
          const effectiveStart = getEffectiveTaskStartDate(t, ev);
          const effectiveDue = getEffectiveTaskDueDate(t, ev);
          categorizeByDateRange(ev, effectiveStart, effectiveDue, todayStr, {
            overdueSet, todaySet, tomorrowSet, thisWeekSet, nextWeekSet,
          });
        }
      }
    } else {
      categorizeSingleEvent(ev, todayStr, {
        overdueSet, todaySet, tomorrowSet, thisWeekSet, nextWeekSet,
      });
    }
  }

  const sortByDate = (a: YPEvent, b: YPEvent) => {
    const aDate = getEffectiveStartDate(a) || '9999-99-99';
    const bDate = getEffectiveStartDate(b) || '9999-99-99';
    return aDate.localeCompare(bDate);
  };

  return {
    overdue: [...overdueSet].sort(sortByDate),
    today: [...todaySet].sort(sortByDate),
    tomorrow: [...tomorrowSet].sort(sortByDate),
    thisWeek: [...thisWeekSet].sort(sortByDate),
    nextWeek: [...nextWeekSet].sort(sortByDate),
  };
}

function categorizeSingleEvent(
  ev: YPEvent,
  todayStr: string,
  sets: SectionSets,
) {
  const effectiveStart = getEffectiveStartDate(ev);
  const effectiveDue = getEffectiveDueDate(ev);
  categorizeByDateRange(ev, effectiveStart, effectiveDue, todayStr, sets);
}

interface SectionSets {
  overdueSet: Set<YPEvent>;
  todaySet: Set<YPEvent>;
  tomorrowSet: Set<YPEvent>;
  thisWeekSet: Set<YPEvent>;
  nextWeekSet: Set<YPEvent>;
}

/**
 * Core categorization — assigns event to section based on dates.
 * Priority order (first match wins):
 *   1. overdue  — due date is in the past
 *   2. today     — active today (start <= today <= due)
 *   3. tomorrow — starts tomorrow (diff = 1)
 *   4. thisWeek — within 2-7 days
 *   5. nextWeek — within 8-14 days (and beyond)
 */
function categorizeByDateRange(
  ev: YPEvent,
  effectiveStart: string | null,
  effectiveDue: string | null,
  todayStr: string,
  sets: SectionSets,
) {
  const due = effectiveDue ?? effectiveStart;
  const start = effectiveStart ?? effectiveDue;

  if (!due || !start) {
    sets.todaySet.add(ev);
    return;
  }

  // 1. Overdue
  if (due < todayStr) {
    sets.overdueSet.add(ev);
    return;
  }

  // 2. Today
  if (start <= todayStr && due >= todayStr) {
    sets.todaySet.add(ev);
    return;
  }

  // 3-5. Future dates
  const diffDays = daysBetween(todayStr, start);

  if (diffDays === 1) {
    sets.tomorrowSet.add(ev);
  } else if (diffDays >= 2 && diffDays <= 7) {
    sets.thisWeekSet.add(ev);
  } else if (diffDays >= 8) {
    sets.nextWeekSet.add(ev);
  } else {
    // diffDays <= 0 but didn't match above — treat as today
    sets.todaySet.add(ev);
  }
}

/**
 * Get section metadata — title and subtitle for display.
 * Round 18: Natural Thai language labels.
 */
export function getSectionMeta(
  key: TodaySectionKey,
  count: number,
): { title: string; subtitle: string } {
  const meta: Record<TodaySectionKey, { title: string; subtitle: string }> = {
    overdue: {
      title: 'เลยกำหนด',
      subtitle: count > 0 ? `${count} รายการต้องรีบดำเนินการ` : '',
    },
    today: {
      title: 'วันนี้',
      subtitle: count > 0 ? `${count} รายการต้องทำวันนี้` : '',
    },
    tomorrow: {
      title: 'พรุ่งนี้',
      subtitle: count > 0 ? `${count} รายการที่จะถึง` : '',
    },
    thisWeek: {
      title: 'สัปดาห์นี้',
      subtitle: count > 0 ? `${count} รายการในสัปดาห์นี้` : '',
    },
    nextWeek: {
      title: 'สัปดาห์หน้า',
      subtitle: count > 0 ? `${count} รายการในสัปดาห์หน้า` : '',
    },
  };
  return meta[key];
}
