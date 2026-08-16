'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Formatters
 * ============================================================
 * Schedule label + card time display formatters
 * - formatScheduleLabel (combines date + time into human-readable)
 * - formatCardTimeDisplay (compact time for card display)
 *
 * Round 12: Removed overdue formatting — no status system.
 * ============================================================
 */

import { relativeDay } from '@/lib/utils/date';
import type { TimelineItem } from './today-types';

// MODULE 5: SCHEDULE LABEL FORMATTER
// ═══════════════════════════════════════════════════════════════

/**
 * Build the schedule text used by both the card and the detail sheet.
 * Returns a human-readable string or null.
 *
 * Rules:
 *   - today:    "วันนี้ HH:MM น." (if itemDate is today)
 *              "เริ่ม {relativeDay} HH:MM น." (if started earlier)
 *   - upcoming: "{relativeDay} HH:MM น."
 *   - no startTime → null
 */
export function formatScheduleLabel(
  item: TimelineItem,
  todayStr: string,
): string | null {
  const isToday = item.dateContext === 'today';
  const isUpcoming = item.dateContext === 'upcoming';

  if (!item.startTime) return null;

  // Today section
  if (isToday) {
    if (item.itemDate && item.itemDate !== todayStr) {
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
 * No prefix — context is clear from position.
 */
export function formatCardTimeDisplay(
  item: TimelineItem,
  todayStr: string,
): string | null {
  if (!item.startTime) return null;

  // Today section
  if (item.dateContext === 'today') {
    if (item.itemDate === todayStr) {
      return `วันนี้ ${item.startTime} น.`;
    }
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
