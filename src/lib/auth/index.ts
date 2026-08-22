/**
 * ============================================================
 * YP WORK - Auth - Barrel Export (Round 22)
 * ============================================================
 * Added: permissions, ownership exports
 * ============================================================
 */

// Types
export type { LoginStatus, PendingRequestInfo, ServerStatusResult } from './types';

// Validators
export {
  synthesizeEmail,
  validateNationalId,
  validateStudentCode,
  validateEmail,
  validatePassword,
} from './validation';

// Login flows
export { loginStudent } from './login-student';
export { loginOther } from './login-other';

// Session helpers
export { getSessionUser, profileToSessionUser, profileToUserProfile } from './session';

// Authorization (Round 22)
export {
  canCreateEvent,
  canUpdateEvent,
  canDeleteEvent,
  canCreateTask,
  canUpdateTask,
  canDeleteTask,
  type PermissionContext,
  type ResourceOwnership,
} from './permissions';

export {
  getEventOwnership,
  getTaskOwnership,
} from './ownership';

// Logout
export { logout } from './logout';
