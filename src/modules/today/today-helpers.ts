'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Helpers (r51 — aerospace refactor)
 * ============================================================
 * Item builders + categorization engine
 * - buildStandaloneEventItem, buildTaskItem
 * - categorizeByDates, buildDateClusters, formatFullDateCaption, buildTimeGroups
 *
 * ★ r51 changes:
 *   - ใช้ getEffectiveStartDate / getEffectiveDueDate / getEffectiveTaskStartDate
 *     / getEffectiveTaskDueDate จาก event-date.ts (single source of truth)
 *   - ทุก function รองรับ null date (group type ที่ไม่มี deadline)
 *   - categorizeByDates ไม่ crash เมื่อ effectiveStart/effectiveDue เป็น null
 * ============================================================
 */

import type { YPEvent, Task } from '@/lib/types';
import { THAI_DAYS, THAI_MONTHS, resolveEventStatus } from '@/lib/utils/date';
// ★ r51: ใช้ shared helpers จาก event-date.ts (single source of truth)
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
    status: ev.type === 'group' ? resolveEventStatus(ev) : ev.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev.type === 'group' ? ev : null,
    task: null,
    event: ev.type === 'group' ? null : ev,
    assigneeName: null,
    assigneeColor: null,
    priority: 'medium',
    estimatedTime: null,
    // ★ r51: ใช้ getEffectiveDueDate — อาจเป็น null สำหรับ group
    dueDate: getEffectiveDueDate(ev),
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    // ★ r51: ใช้ getEffectiveStartDate — อาจเป็น null สำหรับ group ที่ไม่มี date เลย
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
    status: t.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev,
    task: t,
    event: null,
    assigneeName: t.assignees?.[0]?.full_name?.split(' ')[0] || null,
    assigneeColor: t.assignees?.[0]?.color || null,
    priority: t.priority || 'medium',
    estimatedTime: t.estimated_time || null,
    // ★ r51: ใช้ getEffectiveTaskDueDate — fallback chain: task.due_date → parent.date
    dueDate: getEffectiveTaskDueDate(t, ev),
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    // ★ r51: ใช้ getEffectiveTaskStartDate — fallback chain:
    //   task.start_date → parent.start_date → parent.date
    itemDate: getEffectiveTaskStartDate(t, ev),
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
 *   - null:     done item in past or future, OR null dates (cannot categorize)
 *
 * ★ r51: ถ้า effectiveStart หรือ effectiveDue เป็น null → คืน null (skip)
 *   เพราะไม่สามารถ categorize ได้ (group ที่ไม่มี date เลยจะถูก skip)
 */
export function categorizeByDates(
  effectiveStart: string | null,
  effectiveDue: string | null,
  todayStr: string,
  isDone: boolean,
): ItemDateContext | null {
  // ★ r51: ถ้าไม่มี effectiveDue → ใช้ effectiveStart แทน (defensive)
  //   กรณีนี้เกิดขึ้นเฉพาะ group ที่ไม่มี date แต่มี start_date
  //   ถ้าไม่มีทั้งสอง → คืน null (skip)
  const due = effectiveDue ?? effectiveStart;
  if (!due || !effectiveStart) return null;

  if (due < todayStr && !isDone) return 'overdue';
  if (effectiveStart <= todayStr && due >= todayStr) return 'today';
  if (effectiveStart > todayStr && !isDone) return 'upcoming';
  return null;
}

/** Group items by itemDate for date-cluster sections
 *  ★ r51: items ที่มี itemDate เป็น null จะถูกข้าม (defensive) */
export function buildDateClusters(items: TimelineItem[]): DateCluster[] {
  const clusters: DateCluster[] = [];
  for (const item of items) {
    // ★ r51: skip items ที่ไม่มี itemDate
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
