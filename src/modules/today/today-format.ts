'use client';

/**
 * ============================================================
 * YP WORK - Today Module - Formatters (r48 + r67 cleanup)
 * ============================================================
 * Schedule label + card time display formatters
 * - formatScheduleLabel (combines date + time into human-readable)
 * - formatCardTimeDisplay (compact time for card display)
 *
 * ★ r67: "DATE DE-CLUTTER" — ทำความสะอาด format วันที่ทั้งหมด
 *   ปัญหาเดิม:
 *     - "เริ่มเมื่อวาน 14:00 น." — missing space, เริ่ม prefix ไม่จำเป็น
 *     - "เริ่ม2 วันที่แล้ว 14:00 น." — missing space หลังเริ่ม, รกตา
 *     - "12 ม.ค. 68 14:00 น." — date+time ติดกัน ไม่มี separator ดูสับสน
 *
 *   แนวทาง r67:
 *     - ใช้ separator " · " ระหว่าง date context กับ time เสมอ
 *     - ลบ "เริ่ม" prefix จาก carryover (section label "ดำเนินการต่อเนื่อง"
 *       บอกอยู่แล้วว่างานนี้เริ่มก่อนหน้า)
 *     - Time format เดียวกันทุกกรณี: "{date context} · {time} น."
 *     - กรณี today ที่เริ่มวันนี้: "วันนี้ · 14:00 น."
 *     - กรณี carryover: "เมื่อวาน · 14:00 น." / "2 วันที่แล้ว · 14:00 น."
 *     - กรณี upcoming: "พรุ่งนี้ · 14:00 น." / "12 ม.ค. 68 · 14:00 น."
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
 * Rules (★ r67 cleaned):
 *   - overdue:    "เลยกำหนด {relativeDay}" (no time — avoids confusion)
 *   - today:      "วันนี้ · HH:MM น." (if itemDate is today)
 *                 "{relativeDay} · HH:MM น." (if started earlier)
 *   - upcoming:   "{relativeDay} · HH:MM น."
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
    // ★ r51: defensive — item.itemDate อาจเป็น null (group ที่ไม่มี date)
    //   ถ้าเป็น null → แสดงแค่ "วันนี้ · HH:MM น."
    if (item.itemDate && item.itemDate !== todayStr) {
      // ★ r67: Carryover (started before today) — ลบ "เริ่ม" prefix
      //   section label "ดำเนินการต่อเนื่อง" บอกอยู่แล้วว่าเป็นงานต่อเนื่อง
      //   ใช้ separator " · " ระหว่าง date กับ time ให้ readable
      return `${relativeDay(item.itemDate)} · ${item.startTime} น.`;
    }
    // ★ r67: today's item — "วันนี้ · HH:MM น." (clean separator)
    return `วันนี้ · ${item.startTime} น.`;
  }

  // Upcoming section
  if (isUpcoming && item.itemDate) {
    // ★ r67: use separator " · " แทนการเว้นวรรคธรรมดา
    return `${relativeDay(item.itemDate)} · ${item.startTime} น.`;
  }

  return null;
}

/**
 * Format time text for Row 1 of the card (subtle, no capsule).
 * Returns null for overdue (overdue badge handles this in Row 4).
 * No "กำหนดการ" prefix — context is clear from position.
 *
 * ★ r67: ใช้ separator " · " ระหว่าง date context กับ time เสมอ
 *   ลบ "เริ่ม" prefix จาก carryover — ทำให้ format สม่ำเสมอและไม่รกตา
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
      // ★ r67: Started today — "วันนี้ · HH:MM น." (clean separator)
      return `วันนี้ · ${item.startTime} น.`;
    }
    // ★ r45 FIX: Carryover (started before today) — show when it started
    //   ★ r67: ลบ "เริ่ม" prefix (section บอกอยู่แล้ว) + ใช้ separator
    //   เช่น "เมื่อวาน · 10:00 น." หรือ "2 วันที่แล้ว · 14:00 น."
    if (item.itemDate) {
      return `${relativeDay(item.itemDate)} · ${item.startTime} น.`;
    }
    return null;
  }

  // Upcoming: "{relativeDay} · HH:MM น."
  // ★ r67: separator " · " ทำให้ date กับ time แยกกันชัดเจน
  if (item.dateContext === 'upcoming' && item.itemDate) {
    return `${relativeDay(item.itemDate)} · ${item.startTime} น.`;
  }
  return null;
}
