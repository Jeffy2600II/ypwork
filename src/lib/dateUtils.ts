// Path:    src/lib/dateUtils.ts
// Purpose: Date helpers — Thai formatting, week ranges, calendar grid.
//          All functions are pure (no side effects) and timezone-safe
//          (work with YYYY-MM-DD strings, not Date objects, where possible).

import { THAI_MONTHS, THAI_MONTHS_FULL, THAI_DAYS, THAI_DAYS_SHORT } from '@/lib/constants';

// ─── Format helpers (output Thai) ─────────────────────────────────

/** "15 ก.ค." — short date for cards/lists */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${THAI_MONTHS[m - 1]}`;
}

/** "15 กรกฎาคม 2568" — long date with Thai Buddhist year */
export function formatLongDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
}

/** "วันจันทร์ที่ 15 กรกฎาคม 2568" — full sentence form */
export function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  const dayName = THAI_DAYS[date.getDay()];
  return `วัน${dayName}ที่ ${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
}

/** "กรกฎาคม 2568" — month + Thai year (for calendar header) */
export function formatMonthYear(year: number, month: number): string {
  return `${THAI_MONTHS_FULL[month - 1]} ${year + 543}`;
}

/** "จ" — single-letter day name from dateStr */
export function getDayShort(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  return THAI_DAYS_SHORT[date.getDay()];
}

// ─── Today ────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in local timezone (not UTC) */
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Date math ────────────────────────────────────────────────────

/** Parses YYYY-MM-DD into a Date at local midnight (avoids UTC off-by-one) */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a Date back to YYYY-MM-DD in local timezone */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adds n days to a YYYY-MM-DD string */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Difference in days between two YYYY-MM-DD strings (a - b) */
export function daysBetween(a: string, b: string): number {
  const da = parseDate(a).getTime();
  const db = parseDate(b).getTime();
  return Math.round((da - db) / 86_400_000);
}

/** Returns true if dateStr is today */
export function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

/** Returns true if dateStr is within `withinDays` days from today (inclusive) */
export function isWithinDays(dateStr: string, withinDays: number): boolean {
  if (!dateStr) return false;
  const diff = daysBetween(dateStr, todayStr());
  return diff >= 0 && diff <= withinDays;
}

// ─── Calendar grid helpers ────────────────────────────────────────

/**
 * Returns the YYYY-MM-DD of the first day visible on a month grid.
 * A month grid shows the full week containing the 1st of the month,
 * starting on Sunday. So if July 1 is a Tuesday, the grid starts
 * on the last Sunday of June.
 */
export function getMonthGridStart(year: number, month: number): string {
  // month: 1-12
  const firstOfMonth = new Date(year, month - 1, 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0 = Sunday
  const startDate = new Date(year, month - 1, 1 - dayOfWeek);
  return toDateStr(startDate);
}

/**
 * Returns 42 YYYY-MM-DD strings (6 weeks) for a month grid.
 * Always returns 42 so the grid is always 6 rows tall.
 */
export function getMonthGrid(year: number, month: number): string[] {
  const start = getMonthGridStart(year, month);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Returns 7 YYYY-MM-DD strings for the week containing `dateStr`,
 * starting on Sunday.
 */
export function getWeekRange(dateStr: string): string[] {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return toDateStr(d);
  });
}

// ─── Time helpers ─────────────────────────────────────────────────

/** "08:30" → "8:30 น." */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  return `${h}:${String(m).padStart(2, '0')} น.`;
}

/** "2025-07-15T08:30:00" → "08:30" */
export function extractTime(isoStr: string | null): string | null {
  if (!isoStr) return null;
  const match = isoStr.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : null;
}
