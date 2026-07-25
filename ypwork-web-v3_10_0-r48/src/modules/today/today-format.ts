'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Formatters (r48)
 * ============================================================
 * Schedule label + card time display formatters
 * - formatScheduleLabel (combines date + time into human-readable)
 * - formatCardTimeDisplay (compact time for card display)
 * ============================================================
 */

import { relativeDay } from '@/lib/utils/date';
import type { TimelineItem } from './today-types';

// MODULE 5: SCHEDULE LABEL FORMATTER (Centralised — DRY)
// ═══════════════════════════════════════════════════════════════

/**
 * Build the schedule text used by both the card (Row 4) and the detail sheet.
 * Returns a human-readable string or null.
 *
 * Rules:
 *   - overdue:    "เลยกำหนด {relativeDay}" (no time — avoids confusion)
 *   - today:      "วันนี้ HH:MM น." (if itemDate is today)
 *                "เริ่ม {relativeDay} HH:MM น." (if started earlier)
 *   - upcoming:   "{relativeDay} HH:MM น."
 *   - no startTime → null
 */
export function formatScheduleLabel(
  item: TimelineItem,
  todayStr: string,
): string | null {
  const isOverdue = item.dateContext === 'overdue';
  const isToday = item.dateContext === 'today';
  const isUpcoming = item.dateContext === 'upcoming';

  // Overdue: show which date was missed, but not the time
  if (isOverdue) {
    if (item.itemDate && item.itemDate !== todayStr) {
      return `เลยกำหนด ${relativeDay(item.itemDate)}`;
    }
    return 'เลยกำหนด';
  }

  // No start time → no schedule
  if (!item.startTime) return null;

  // Today section
  if (isToday) {
    if (item.itemDate !== todayStr) {
      // Started on a past day, still active today
      return `เริ่ม ${relativeDay(item.itemDate)} ${item.startTime} น.`;
    }
    return `วันนี้ ${item.startTime} น.`;
  }

  // Upcoming section
  if (isUpcoming && item.itemDate) {
    return `${relativeDay(item.itemDate)} ${item.startTime} น.`;
  }

  return null;
}

/**
 * Format time text for Row 1 of the card (subtle, no capsule).
 * Returns null for overdue (overdue badge handles this in Row 4).
 * No "กำหนดการ" prefix — context is clear from position.
 */
export function formatCardTimeDisplay(
  item: TimelineItem,
  todayStr: string,
): string | null {
  // Overdue: don't show time in Row 1 (overdue badge in Row 4 instead)
  if (item.dateContext === 'overdue') return null;
  // No start time → no display
  if (!item.startTime) return null;
  // Today section
  if (item.dateContext === 'today') {
    if (item.itemDate === todayStr) {
      // Started today — show "วันนี้ HH:MM น."
      return `วันนี้ ${item.startTime} น.`;
    }
    // ★ r45 FIX: Carryover (started before today) — show when it started
    // เช่น "เริ่มเมื่อวาน 10:00 น." หรือ "เริ่ม3 วันที่แล้ว 14:00 น."
    if (item.itemDate) {
      return `เริ่ม${relativeDay(item.itemDate)} ${item.startTime} น.`;
    }
    return null;
  }
  // Upcoming: "{relativeDay} HH:MM น."
  if (item.dateContext === 'upcoming' && item.itemDate) {
    return `${relativeDay(item.itemDate)} ${item.startTime} น.`;
  }
  return null;
}
