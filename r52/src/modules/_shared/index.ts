'use client';

/**
 * ============================================================
 * YP WORK - Shared Module - Barrel Export (r48)
 * ============================================================
 * "Public Airlock" ของ _shared module — components/constants ที่ใช้ร่วมกัน
 * ระหว่าง today + events module
 *
 * Files:
 *   status-meta.ts        - STATUS_META, StatusMeta, TASK_STATUS_ORDER, EVENT_STATUS_ORDER
 *   status-picker-sheet.tsx - StatusPickerSheet component + StatusPickerSheetProps
 * ============================================================
 */

export {
  STATUS_META,
  TASK_STATUS_ORDER,
  EVENT_STATUS_ORDER,
} from './status-meta';
export type { StatusMeta } from './status-meta';
export { StatusPickerSheet } from './status-picker-sheet';
export type { StatusPickerSheetProps } from './status-picker-sheet';
