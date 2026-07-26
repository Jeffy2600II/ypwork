// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Color Constants (r51 — single source of truth)
// ═══════════════════════════════════════════════════════════════
// ก่อนหน้านี้ COLOR_OPTIONS ถูกประกาศซ้ำใน 2 ที่:
//   1. src/modules/events/create-event-form.tsx
//   2. src/modules/events/event-detail-types.ts
// ทำให้ถ้าเพิ่ม/ลบสี ต้องแก้ 2 ที่ เสี่ยง inconsistency
//
// หลักการ aerospace (NASA Power of Ten Rule #5: "Use a small number of data types"):
//   - แยก constants ออกจาก component logic
//   - export เดียว ใช้ได้ทั้งระบบ
//   - type-safe: ผูก type กับ tuple ของ array
// ═══════════════════════════════════════════════════════════════

/**
 * ชุดสีที่ผู้ใช้เลือกได้สำหรับรายการ
 * ค่าแรกใน array จะถูกใช้เป็น default เมื่อผู้ใช้ยังไม่ได้เลือก
 */
export const EVENT_COLOR_OPTIONS = [
  '#4F46E5',
  '#7C3AED',
  '#A855F7',
  '#14B8A6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#D946EF',
  '#F43F5E',
] as const;

/** Type ของสีแต่ละค่าใน EVENT_COLOR_OPTIONS */
export type EventColor = (typeof EVENT_COLOR_OPTIONS)[number];

/** ค่าสี default ที่ใช้เมื่อผู้ใช้ไม่ได้เลือก หรือ DB ส่งกลับมาเป็น null */
export const DEFAULT_EVENT_COLOR: EventColor = EVENT_COLOR_OPTIONS[0];

/**
 * Validate สีที่ผู้ใช้ส่งมา ถ้าไม่ตรงกับ option ในระบบ → คืนค่า default
 *
 * @param color ค่าสีที่ผู้ใช้ส่งมา (string หรือ null/undefined)
 * @returns สีที่ valid จาก EVENT_COLOR_OPTIONS
 */
export function resolveEventColor(color: string | null | undefined): string {
  if (!color) return DEFAULT_EVENT_COLOR;
  // ยอมรับทั้งสีที่อยู่ใน list และสีอื่นๆ ที่ผ่าน regex #RRGGBB (เผื่อกรณี DB เก็บสีเก่า)
  if ((EVENT_COLOR_OPTIONS as readonly string[]).includes(color)) return color;
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return DEFAULT_EVENT_COLOR;
}
