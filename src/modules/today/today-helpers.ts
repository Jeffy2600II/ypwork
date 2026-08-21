'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Helpers
 * ============================================================
 * Item builders + categorization engine
 *
 * Round 19: Redesigned date sections — no overdue state.
 * Shows what's happening now and what's coming, grouped by
 * natural time proximity. No "เลยกำหนด" status — the system
 * doesn't have enough data to confirm that as a real status.
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
// MODULE 4: EVENT CATEGORIZATION (Round 19)
// ═══════════════════════════════════════════════════════════════

/**
 * Date section keys — ordered by time proximity.
 * Round 19: No overdue section. Past-due items are shown in "today"
 * since the system cannot confirm they are truly "overdue" as a status.
 */
export type TodaySectionKey = 'today' | 'soon' | 'tomorrow' | 'upcoming' | 'later';

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
 * Categorize EVENTS into natural date sections.
 * Round 19: No overdue state. Items with past dates are shown in "today".
 * A single event can appear in MULTIPLE sections simultaneously.
 * For group events, each sub-task is checked individually.
 */
export function categorizeEventsIntoSections(
  events: YPEvent[],
  todayStr: string,
): {
  today: YPEvent[];
  soon: YPEvent[];
  tomorrow: YPEvent[];
  upcoming: YPEvent[];
  later: YPEvent[];
} {
  const todaySet = new Set<YPEvent>();
  const soonSet = new Set<YPEvent>();
  const tomorrowSet = new Set<YPEvent>();
  const upcomingSet = new Set<YPEvent>();
  const laterSet = new Set<YPEvent>();

  for (const ev of events) {
    if (ev.type === 'group') {
      const tasks = ev.tasks || [];
      if (tasks.length === 0) {
        categorizeSingleEvent(ev, todayStr, {
          todaySet, soonSet, tomorrowSet, upcomingSet, laterSet,
        });
      } else {
        for (const t of tasks) {
          const effectiveStart = getEffectiveTaskStartDate(t, ev);
          const effectiveDue = getEffectiveTaskDueDate(t, ev);
          categorizeByDateRange(ev, effectiveStart, effectiveDue, todayStr, {
            todaySet, soonSet, tomorrowSet, upcomingSet, laterSet,
          });
        }
      }
    } else {
      categorizeSingleEvent(ev, todayStr, {
        todaySet, soonSet, tomorrowSet, upcomingSet, laterSet,
      });
    }
  }

  const sortByDate = (a: YPEvent, b: YPEvent) => {
    const aDate = getEffectiveStartDate(a) || '9999-99-99';
    const bDate = getEffectiveStartDate(b) || '9999-99-99';
    return aDate.localeCompare(bDate);
  };

  return {
    today: [...todaySet].sort(sortByDate),
    soon: [...soonSet].sort(sortByDate),
    tomorrow: [...tomorrowSet].sort(sortByDate),
    upcoming: [...upcomingSet].sort(sortByDate),
    later: [...laterSet].sort(sortByDate),
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
  todaySet: Set<YPEvent>;
  soonSet: Set<YPEvent>;
  tomorrowSet: Set<YPEvent>;
  upcomingSet: Set<YPEvent>;
  laterSet: Set<YPEvent>;
}

/**
 * Core categorization — assigns event to section based on dates.
 * Round 19: No overdue state. Past-due items go to "today".
 * Priority order (first match wins):
 *   1. today     — active today (start <= today <= due, OR past date)
 *   2. soon      — within 1-2 days (เร็ว ๆ นี้)
 *   3. tomorrow  — starts tomorrow (diff = 1)
 *   4. upcoming  — within 2-7 days (กำลังจะถึง)
 *   5. later     — 8+ days (อนาคต)
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

  // 1. Today — includes past-due items (no overdue state in Round 19)
  if (due < todayStr) {
    sets.todaySet.add(ev);
    return;
  }
  if (start <= todayStr && due >= todayStr) {
    sets.todaySet.add(ev);
    return;
  }

  // 2-5. Future dates
  const diffDays = daysBetween(todayStr, start);

  if (diffDays === 1) {
    sets.tomorrowSet.add(ev);
  } else if (diffDays >= 2 && diffDays <= 3) {
    sets.soonSet.add(ev);
  } else if (diffDays >= 4 && diffDays <= 7) {
    sets.upcomingSet.add(ev);
  } else if (diffDays >= 8) {
    sets.laterSet.add(ev);
  } else {
    // diffDays <= 0 but didn't match above — treat as today
    sets.todaySet.add(ev);
  }
}

/**
 * Get section metadata — title and subtitle for display.
 * Round 19: Natural Thai language labels without overdue state.
 */
export function getSectionMeta(
  key: TodaySectionKey,
  count: number,
): { title: string; subtitle: string } {
  const meta: Record<TodaySectionKey, { title: string; subtitle: string }> = {
    today: {
      title: 'วันนี้',
      subtitle: count > 0 ? `${count} รายการต้องทำวันนี้` : '',
    },
    soon: {
      title: 'เร็ว ๆ นี้',
      subtitle: count > 0 ? `${count} รายการที่กำลังจะถึง` : '',
    },
    tomorrow: {
      title: 'พรุ่งนี้',
      subtitle: count > 0 ? `${count} รายการที่จะถึง` : '',
    },
    upcoming: {
      title: 'กำลังจะถึง',
      subtitle: count > 0 ? `${count} รายการในสัปดาห์นี้` : '',
    },
    later: {
      title: 'อนาคต',
      subtitle: count > 0 ? `${count} รายการในอนาคต` : '',
    },
  };
  return meta[key];
}
