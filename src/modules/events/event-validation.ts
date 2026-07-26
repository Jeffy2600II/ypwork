// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Validation (r51 — single source of truth for input rules)
// ═══════════════════════════════════════════════════════════════
// ก่อนหน้านี้ validation rules กระจัดกระจาย:
//   - ใน form (create-event-form.tsx, edit-event-sheet.tsx)
//   - ใน API route (/api/events/route.ts, /api/events/[id]/route.ts)
// ทำให้ client/server validation อาจไม่ตรงกัน เสี่ยง data inconsistency
//
// ★ r51 changes:
//   - รวม validation rules ไว้ที่เดียว ทั้ง client และ server ใช้ชุดเดียวกัน
//   - เพิ่ม business rule: group type → date เป็น optional
//
// หลักการ aerospace (NASA Power of Ten Rule #2: "Enable bounds checking"):
//   - ทุก field มี explicit bounds (length, format, allowed values)
//   - ทุก function คืนผลเป็น object ไม่ throw — ทำให้ composable และ testable
// ═══════════════════════════════════════════════════════════════

import type { EventType } from '@/lib/types';
import { isDateValidForType } from '@/lib/utils/event-date';

// ─────────────────────────────────────────────────────────────────
// Constants — bounds ที่ใช้ในการ validate
// ─────────────────────────────────────────────────────────────────

export const EVENT_TITLE_MIN_LENGTH = 1;
export const EVENT_TITLE_MAX_LENGTH = 200;
export const EVENT_LOCATION_MAX_LENGTH = 500;
export const EVENT_DESCRIPTION_MAX_LENGTH = 5000;
export const EVENT_TIME_MAX_LENGTH = 8; // HH:MM:SS

export const VALID_EVENT_TYPES: readonly EventType[] = ['group', 'task'];

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;
export const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// ─────────────────────────────────────────────────────────────────
// Validation result type
// ─────────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  error: string | null;
}

/** Helper: สร้าง result สำเร็จ */
export function ok(): ValidationResult {
  return { ok: true, error: null };
}

/** Helper: สร้าง result ล้มเหลว */
export function fail(error: string): ValidationResult {
  return { ok: false, error };
}

// ─────────────────────────────────────────────────────────────────
// Field-level validators
// ─────────────────────────────────────────────────────────────────

/** Validate event type */
export function validateEventType(type: unknown): ValidationResult {
  if (typeof type !== 'string' || !VALID_EVENT_TYPES.includes(type as EventType)) {
    return fail('ประเภทงานไม่ถูกต้อง');
  }
  return ok();
}

/** Validate event title */
export function validateEventTitle(title: unknown): ValidationResult {
  if (typeof title !== 'string' || !title.trim()) {
    return fail('ชื่อรายการไม่ถูกต้อง (ต้องมี 1-200 ตัวอักษร)');
  }
  if (title.length > EVENT_TITLE_MAX_LENGTH) {
    return fail(`ชื่อรายการต้องไม่เกิน ${EVENT_TITLE_MAX_LENGTH} ตัวอักษร`);
  }
  return ok();
}

/**
 * Validate date field สำหรับ event ตาม type
 * ★ r51: group type → date เป็น optional (null หรือ empty string ได้)
 *        task type → date บังคับ และต้องเป็น YYYY-MM-DD
 */
export function validateEventDate(
  type: EventType,
  date: unknown,
): ValidationResult {
  if (!isDateValidForType(type, date as string | null | undefined)) {
    if (type === 'task') {
      return fail('วันกำหนดส่งไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
    }
    return fail('วันที่ไม่ถูกต้อง (ถ้าระบุ ต้องเป็น YYYY-MM-DD)');
  }
  return ok();
}

/** Validate start_date (optional, YYYY-MM-DD) */
export function validateStartDate(startDate: unknown): ValidationResult {
  if (startDate === null || startDate === undefined || startDate === '') {
    return ok();
  }
  if (typeof startDate !== 'string' || !DATE_REGEX.test(startDate)) {
    return fail('วันที่เริ่มไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
  }
  return ok();
}

/**
 * Validate ความสัมพันธ์ระหว่าง start_date และ date (deadline)
 * - ถ้ามีทั้งสองค่า → date ต้องไม่น้อยกว่า start_date
 * - ถ้ามีอันใดอันหนึ่ง → ผ่านได้
 */
export function validateDateRange(
  startDate: string | null | undefined,
  date: string | null | undefined,
): ValidationResult {
  // ถ้าไม่มีทั้งสองค่า → ผ่าน (group ที่ไม่มี date เลยก็ได้)
  if (!startDate && !date) return ok();
  // ถ้ามีอันใดอันหนึ่ง → ผ่าน (ไม่มี range ให้ตรวจ)
  if (!startDate || !date) return ok();
  // มีทั้งสองค่า → ตรวจ range
  if (date < startDate) {
    return fail('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม');
  }
  return ok();
}

/** Validate time (optional, HH:MM or HH:MM:SS) */
export function validateTime(time: unknown): ValidationResult {
  if (time === null || time === undefined || time === '') {
    return ok();
  }
  if (typeof time !== 'string' || !TIME_REGEX.test(time)) {
    return fail('เวลาไม่ถูกต้อง (ต้องเป็น HH:MM หรือ HH:MM:SS)');
  }
  return ok();
}

/** Validate location (optional, max 500 chars) */
export function validateLocation(location: unknown): ValidationResult {
  if (location === null || location === undefined) return ok();
  if (typeof location !== 'string') {
    return fail('สถานที่ต้องเป็นข้อความ');
  }
  if (location.length > EVENT_LOCATION_MAX_LENGTH) {
    return fail(`สถานที่ต้องไม่เกิน ${EVENT_LOCATION_MAX_LENGTH} ตัวอักษร`);
  }
  return ok();
}

/** Validate description (optional, max 5000 chars) */
export function validateDescription(description: unknown): ValidationResult {
  if (description === null || description === undefined) return ok();
  if (typeof description !== 'string') {
    return fail('รายละเอียดต้องเป็นข้อความ');
  }
  if (description.length > EVENT_DESCRIPTION_MAX_LENGTH) {
    return fail(`รายละเอียดต้องไม่เกิน ${EVENT_DESCRIPTION_MAX_LENGTH} ตัวอักษร`);
  }
  return ok();
}

/** Validate color (optional, #RRGGBB format) */
export function validateColor(color: unknown): ValidationResult {
  if (color === null || color === undefined || color === '') return ok();
  if (typeof color !== 'string' || !COLOR_REGEX.test(color)) {
    return fail('รูปแบบสีไม่ถูกต้อง (ต้องเป็น #RRGGBB)');
  }
  return ok();
}

/** Validate department_id (optional, UUID-like string) */
export function validateDepartmentId(deptId: unknown): ValidationResult {
  if (deptId === null || deptId === undefined || deptId === '') return ok();
  if (typeof deptId !== 'string') {
    return fail('ฝ่ายที่รับผิดชอบไม่ถูกต้อง');
  }
  return ok();
}

// ─────────────────────────────────────────────────────────────────
// Composite validator — สำหรับ create-event payload
// ─────────────────────────────────────────────────────────────────

export interface EventPayloadForValidation {
  type: unknown;
  title: unknown;
  date: unknown;
  start_date?: unknown;
  time?: unknown;
  location?: unknown;
  description?: unknown;
  color?: unknown;
  department_id?: unknown;
}

/**
 * Validate ทุก field ของ event payload ที่ใช้สร้าง/แก้ไข
 * คืนผลลัพธ์แบบ short-circuit — เจอ error แรกจะคืนทันที
 *
 * @param payload object ที่ต้องการ validate
 * @returns ValidationResult
 */
export function validateEventPayload(payload: EventPayloadForValidation): ValidationResult {
  // type
  const typeRes = validateEventType(payload.type);
  if (!typeRes.ok) return typeRes;

  // After type is validated, we know it's a valid EventType
  const type = payload.type as EventType;

  // title
  const titleRes = validateEventTitle(payload.title);
  if (!titleRes.ok) return titleRes;

  // date — depends on type
  const dateRes = validateEventDate(type, payload.date);
  if (!dateRes.ok) return dateRes;

  // start_date — optional
  const startDateRes = validateStartDate(payload.start_date);
  if (!startDateRes.ok) return startDateRes;

  // date range
  const rangeRes = validateDateRange(
    payload.start_date as string | null | undefined,
    payload.date as string | null | undefined,
  );
  if (!rangeRes.ok) return rangeRes;

  // time
  const timeRes = validateTime(payload.time);
  if (!timeRes.ok) return timeRes;

  // location
  const locationRes = validateLocation(payload.location);
  if (!locationRes.ok) return locationRes;

  // description
  const descRes = validateDescription(payload.description);
  if (!descRes.ok) return descRes;

  // color
  const colorRes = validateColor(payload.color);
  if (!colorRes.ok) return colorRes;

  // department_id
  const deptRes = validateDepartmentId(payload.department_id);
  if (!deptRes.ok) return deptRes;

  return ok();
}
