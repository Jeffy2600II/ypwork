// ═══════════════════════════════════════════════════════════════
// YP WORK · Event Date Utilities (r51 — aerospace-grade single source of truth)
// ═══════════════════════════════════════════════════════════════
// โมดูลนี้เป็น single source of truth สำหรับทุกการคำนวณ/ตีความ
// วันที่ของ event ทั้งระบบ ก่อนหน้านี้ logic `ev.start_date || ev.date`
// กระจัดกระจายอยู่หลายไฟล์ ทำให้เกิด inconsistency และซ้ำซ้อน
//
// ★ r51 changes (key business rule):
//   - กลุ่มรายการ (type: 'group') → ไม่มี "กำหนดส่ง" (date เป็น null ได้)
//     เหตุผล: group สามารถมีรายการย่อยได้หลายอัน แต่ละอันมี due_date ของตัวเอง
//     การตั้ง deadline ระดับ group จึงไม่สื่อความหมายและสับสน
//   - รายการเดี่ยว (type: 'task') → ยังบังคับมี date (deadline) เหมือนเดิม
//
// หลักการ aerospace (NASA Power of Ten Rule #4: "Restrict all code to very simple control flow constructs"):
//   - ทุก function ทำหน้าที่เดียว มี return path ชัดเจน
//   - ทุก function มี JSDoc อธิบายเจตนา พารามิเตอร์ และค่าที่คืน
//   - ไม่มี magic value ทั้งหมดมี named constant
//   - ทุก branch มี unit-testable behavior
// ═══════════════════════════════════════════════════════════════

import type { YPEvent, Task } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * ผลลัพธ์การ resolve วันที่สำหรับการแสดงผล (display layer)
 * - `start`: วันที่เริ่มต้นที่จะใช้แสดงเป็น meta หลัก (อาจเป็น null ถ้าไม่มีข้อมูลเลย)
 * - `due`: วันที่กำหนดส่ง (เป็น null สำหรับ group ที่ไม่มี deadline)
 * - `displayLabel`: label สั้นๆ สำหรับ meta หลัก เช่น "เริ่ม 12 ม.ค. 68" หรือ "ไม่มีกำหนดส่ง"
 */
export interface ResolvedEventDates {
  start: string | null;
  due: string | null;
  displayLabel: string;
}

// ─────────────────────────────────────────────────────────────────
// Pure helpers — Event level
// ─────────────────────────────────────────────────────────────────

/**
 * ตรวจสอบว่า event นี้บังคับให้มี deadline หรือไม่
 *
 * กติกา:
 *   - type === 'task' → บังคับมี date (deadline)
 *   - type === 'group' → date เป็น optional (null ได้)
 *
 * @param type ประเภท event
 * @returns true ถ้าบังคับมี deadline, false ถ้า deadline เป็น optional
 */
export function requiresDeadline(type: YPEvent['type']): boolean {
  return type === 'task';
}

/**
 * ดึง "วันที่เริ่มต้น" ที่ใช้แสดงผลได้จริงของ event
 *
 * ลำดับความสำคัญ:
 *   1. event.start_date (วันที่เริ่มลงมือทำ — explicit)
 *   2. event.date (วันกำหนดส่ง — fallback เมื่อไม่ได้ตั้ง start_date แยก)
 *   3. null (ไม่มีข้อมูลเลย — เฉพาะ group ที่ไม่มีทั้งสองค่า)
 *
 * @param event event ที่ต้องการคำนวณ
 * @returns YYYY-MM-DD หรือ null ถ้าไม่มีข้อมูลเลย
 */
export function getEffectiveStartDate(event: YPEvent): string | null {
  if (event.start_date) return event.start_date;
  if (event.date) return event.date;
  return null;
}

/**
 * ดึง "วันกำหนดส่ง" ที่ใช้แสดงผลได้จริงของ event
 *
 * กติกา:
 *   - type === 'task' → event.date (always non-null per business rule)
 *   - type === 'group' → event.date (อาจเป็น null ถ้า group ไม่มี deadline ระดับตัวมันเอง)
 *
 * @param event event ที่ต้องการ
 * @returns YYYY-MM-DD หรือ null สำหรับ group ที่ไม่มี deadline
 */
export function getEffectiveDueDate(event: YPEvent): string | null {
  return event.date ?? null;
}

/**
 * ดึง "วันกำหนดส่ง" ที่ใช้แสดงผลสำหรับ task ย่อยใน group
 *
 * ลำดับความสำคัญ:
 *   1. task.due_date (deadline ของ task โดยตรง)
 *   2. parent event.date (fallback ที่เดิมใช้ — แต่ group อาจไม่มี date แล้วใน r51)
 *   3. null (ไม่มี deadline เลย)
 *
 * @param task task ย่อย
 * @param parentEvent parent event
 * @returns YYYY-MM-DD หรือ null
 */
export function getEffectiveTaskDueDate(
  task: Task,
  parentEvent: YPEvent,
): string | null {
  if (task.due_date) return task.due_date;
  return parentEvent.date ?? null;
}

/**
 * ดึง "วันที่เริ่ม" ของ task ย่อย (ใช้ใน today/sorting)
 *
 * ลำดับความสำคัญ:
 *   1. task.start_date (วันเริ่ม task โดยตรง)
 *   2. parent event.start_date (วันเริ่ม event)
 *   3. parent event.date (fallback — อาจเป็น null สำหรับ group)
 *   4. null
 *
 * @param task task ย่อย
 * @param parentEvent parent event
 */
export function getEffectiveTaskStartDate(
  task: Task,
  parentEvent: YPEvent,
): string | null {
  if (task.start_date) return task.start_date;
  if (parentEvent.start_date) return parentEvent.start_date;
  return parentEvent.date ?? null;
}

// ─────────────────────────────────────────────────────────────────
// Composite helpers — for display layer
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve ทั้ง start และ due date พร้อม label สำหรับ meta หลัก
 *
 * ใช้ใน EventCard, EventDetailClient, TodayItemCard — แทนที่ logic กระจัดกระจายเดิม
 *
 * @param event event ที่ต้องการ
 * @returns { start, due, displayLabel }
 *   - displayLabel เป็นคำอธิบายสั้นๆ สำหรับ meta หลัก เช่น
 *     "เริ่ม 12 ม.ค. 68" หรือ "ไม่มีกำหนดส่ง" หรือ "" (ถ้าไม่มีอะไรเลย)
 */
export function resolveEventDatesForDisplay(
  event: YPEvent,
  formatter: (dateStr: string) => string,
): ResolvedEventDates {
  const start = getEffectiveStartDate(event);
  const due = getEffectiveDueDate(event);

  let displayLabel = '';
  if (start) {
    displayLabel = `เริ่ม ${formatter(start)}`;
  } else if (due) {
    displayLabel = formatter(due);
  } else {
    // Group โดยไม่มี deadline และไม่มี start_date → แสดง "ไม่มีกำหนดส่ง"
    displayLabel = 'ไม่มีกำหนดส่ง';
  }

  return { start, due, displayLabel };
}

// ─────────────────────────────────────────────────────────────────
// Sorting helpers — for list view
// ─────────────────────────────────────────────────────────────────

/**
 * Sort key สำหรับ event ใน list view — เพื่อให้ group ที่ไม่มี date
 * ไม่ทำให้ .localeCompare() พัง (null.localeCompare จะ throw)
 *
 * @param event event ที่ต้องการ sort key
 * @returns string ที่ safe สำหรับ .localeCompare() (ใช้ '9999-99-99' เป็น fallback เพื่อให้ group ที่ไม่มี date ไปอยู่ท้าย list)
 */
export function getEventSortKey(event: YPEvent): string {
  // ใช้ start_date เป็นตัวเรียงลำดับหลัก (เหตุผล: เรียงตาม "วันที่จะเริ่มทำ" สื่อกว่า "วันกำหนดส่ง")
  // ถ้าไม่มี start_date → fallback ไป date (deadline)
  // ถ้าไม่มีทั้งสอง → ใช้ '9999-99-99' ให้ไปอยู่ท้าย list (กลุ่มรายการที่ยังไม่มีกำหนดการ)
  const sortDate = event.start_date || event.date;
  return sortDate || '9999-99-99';
}

/**
 * Group key สำหรับจัดกลุ่ม event ตามเดือน (ใช้ใน EventsListView)
 *
 * @param event event ที่ต้องการ group key
 * @returns key ในรูปแบบ "YYYY-MM" หรือ "ไม่มีกำหนดการ" สำหรับ event ที่ไม่มี date เลย
 */
export function getEventMonthGroupKey(event: YPEvent): string {
  const sortDate = event.start_date || event.date;
  if (!sortDate) return 'ไม่มีกำหนดการ';
  // Extract YYYY-MM จาก YYYY-MM-DD (safe string slicing ไม่ใช้ Date constructor)
  return sortDate.slice(0, 7);
}

// ─────────────────────────────────────────────────────────────────
// Validation helpers — shared ระหว่าง form และ API
// ═══════════════════════════════════════════════════════════════
// (ใช้ร่วมกับ event-validation.ts — ดูไฟล์นั้นสำหรับ validation rules เต็มรูปแบบ)
// ─────────────────────────────────────────────────────────────────

/**
 * ตรวจสอบว่า date ที่ส่งมาจาก form/API ถูกต้องตาม business rule ของ type นั้นหรือไม่
 *
 * @param type ประเภท event
 * @param date ค่า date ที่ส่งมา (string ว่าง, YYYY-MM-DD หรือ null/undefined)
 * @returns true ถ้าถูกต้องตาม business rule, false ถ้าผิด
 */
export function isDateValidForType(
  type: YPEvent['type'],
  date: string | null | undefined,
): boolean {
  if (requiresDeadline(type)) {
    // task type → บังคับมี date ที่ผ่าน regex
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  }
  // group type → date เป็น optional แต่ถ้าส่งมาต้องเป็น YYYY-MM-DD หรือ empty/null
  if (date === null || date === undefined || date === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
