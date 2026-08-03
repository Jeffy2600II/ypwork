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
 *
 * ★ r67 changes:
 *   - formatFullDateCaption → เปลี่ยนจาก "วันอาทิตย์ที่ 12 มกราคม 2568" (28 ตัว)
 *     เป็น "12 ม.ค. 68" (10 ตัว) — ลดความยาว ~64% ทำให้ caption ไม่รกตา
 *   - เพิ่ม formatClusterCaption ที่เลือก format ตาม cluster label context
 *     (ซ่อน caption เมื่อ label บอกข้อมูลครบแล้ว เช่น "วันนี้"/"พรุ่งนี้"/"เมื่อวาน")
 * ============================================================
 */

import type { YPEvent, Task } from '@/lib/types';
import { resolveEventStatus, formatShortThaiDate, formatWeekdayOnly } from '@/lib/utils/date';
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

/**
 * ★ r67: Compact date caption — เปลี่ยนจาก "วันอาทิตย์ที่ 12 มกราคม 2568" (28 ตัว)
 *   เป็น "12 ม.ค. 68" (10 ตัว) — ลดความยาว ~64%
 *   ผู้ใช้รายงานว่า caption ที่ยาวเกินไปทำให้หัวข้อ cluster "รกตา"
 *
 *   ถ้ายังต้องการ long format (เช่น screen reader) สามารถเรียก formatDate จาก
 *   lib/utils/date โดยตรงได้
 */
export function formatFullDateCaption(dateStr: string): string {
  if (!dateStr) return '';
  return formatShortThaiDate(dateStr);
}

/**
 * ★ r67: Smart cluster caption — เลือก format ตาม cluster label context
 *
 * กติกาการแสดง caption ใต้ cluster header:
 *   - label เป็น "วันนี้" / "พรุ่งนี้" / "เมื่อวาน" → ซ่อน caption (label บอกข้อมูลครบแล้ว)
 *   - label เป็น "อีก N วัน" / "N วันที่แล้ว" (2-7 วัน) → แสดง weekday "วันอาทิตย์"
 *     (compact เพิ่มเติม ไม่ต้องแสดง date เต็ม เพราะ label บอก range อยู่แล้ว)
 *   - label เป็น absolute date ("12 ม.ค. 68") → แสดง weekday "วันอาทิตย์"
 *     (label บอก date แล้ว caption เสริมด้วย weekday)
 *   - กรณีอื่นๆ → ใช้ compact date "12 ม.ค. 68"
 *
 * คืนค่า '' เมื่อไม่ควรแสดง caption
 */
export function formatClusterCaption(label: string, dateKey: string): string {
  if (!dateKey) return '';

  // Label ที่บอกข้อมูลครบแล้ว → ไม่ต้องแสดง caption
  const selfExplanatory = ['วันนี้', 'พรุ่งนี้', 'เมื่อวาน'];
  if (selfExplanatory.includes(label)) return '';

  // Label ที่บอก relative range ("อีก N วัน", "N วันที่แล้ว") → แสดง weekday เสริม
  // เพื่อให้รู้ว่าตรงกับวันอะไรของสัปดาห์ โดยไม่ต้องแสดง date เต็มๆ
  if (/^(อีก\s*\d+\s*วัน|\d+\s*วันที่แล้ว)$/.test(label)) {
    return formatWeekdayOnly(dateKey);
  }

  // Label เป็น absolute date (จาก relativeDay fallback) → แสดง weekday เสริม
  // เช่น label = "12 ม.ค. 68" → caption = "วันอาทิตย์"
  if (/\d+\s+[ก-๙.]+\s+\d{2,4}/.test(label)) {
    return formatWeekdayOnly(dateKey);
  }

  // Default: แสดง compact date
  return formatShortThaiDate(dateKey);
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
