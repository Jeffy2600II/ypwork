/**
 * ============================================================
 * YP WORK - Auth - Barrel Export (r48)
 * ============================================================
 * "Public Airlock" ของ auth module
 *
 * File structure:
 *   types.ts            - LoginStatus, PendingRequestInfo, ServerStatusResult
 *   validation.ts       - synthesizeEmail, validateNationalId, etc.
 *   check-status.ts     - checkStatusViaServerApi (client-side)
 *   login-student.ts    - loginStudent (student auth flow)
 *   login-other.ts      - loginOther (teacher/other auth flow)
 *   session.ts          - getSessionUser, profileToSessionUser, profileToUserProfile (server-side)
 *   user-guard.ts       - userGuard (route protection)
 *   api-guard.ts        - apiGuard (API route protection)
 *   logout.ts           - logout helper
 *
 * Backward compat: imports from '@/lib/auth' ยังทำงานเหมือนเดิม
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

// Session helpers (server-side compatible — getSessionUser takes SupabaseClient as param)
export { getSessionUser, profileToUserProfile, profileToSessionUser } from './session';

// Route guards — server-only, NOT re-exported here to keep barrel client-safe.
// Server-side consumers should import directly:
//   import { requireUser } from '@/lib/auth/user-guard';
//   import { requireAdmin } from '@/lib/auth/api-guard';

// Logout (server-side, but safe to re-export — uses supabase server client internally
// but logout() itself takes a SupabaseClient parameter)
export { logout } from './logout';
