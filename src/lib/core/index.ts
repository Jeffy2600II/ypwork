/**
 * ============================================================
 * YP WORK - Central Core - Barrel Export (r48)
 * ============================================================
 * "Central Hub" ของ YP Work — shared infrastructure ที่ทุก module ใช้ร่วมกัน
 *
 * Files:
 *   sheet-timing.ts          - SHEET_CLOSE_DURATION, REACT_COMMIT_DURATION, etc.
 *   fab-context.tsx          - FAB context (let pages override + button behavior)
 *   toast-context.tsx        - Inline toast helper (useInlineToast)
 *   pending-delete-retry.ts  - Self-healing retry for failed DELETEs
 *   window-open-state.ts     - Reactive view of window-open state (for useScrollDirection)
 *
 * Design principle (NASA-style):
 *   - ทุก module มาต่อที่นี่เหมือน "docking port"
 *   - ไม่มี business logic ในนี่ — มีแค่ infrastructure
 *   - แต่ละไฟล์มี single responsibility ชัดเจน
 * ============================================================
 */

// Timing constants (must match CSS transition durations)
export {
  SHEET_CLOSE_DURATION,
  REACT_COMMIT_DURATION,
  TOAST_AUTO_DISMISS,
  SCROLL_HIDE_THRESHOLD,
  FAB_TRANSITION_DURATION,
} from './sheet-timing';

// FAB context (let pages override + button behavior)
export {
  FabProvider,
  useFabAction,
  useFabRegister,
  type FabAction,
} from './fab-context';

// Inline toast helper (thin wrapper around shadcn useToast)
export {
  useInlineToast,
  errorToastOptions,
  type InlineToastType,
  type InlineToastOptions,
} from './toast-context';

// Self-healing retry for failed DELETEs
export { usePendingDeleteRetry } from './pending-delete-retry';

// Window-open state (for useScrollDirection)
export {
  useIsWindowOpen,
  isWindowOpenRightNow,
  onWindowOpenChange,
} from './window-open-state';
