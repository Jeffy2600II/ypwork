// ═══════════════════════════════════════════════════════════════
// YP WORK · Auth · Permissions (Round 24)
// ═══════════════════════════════════════════════════════════════
// Permission definitions and checking for YP Work.
//
// The user explicitly stated: "กลุ่มผู้ใช้ยังเป็นแบบเดิม ระบบเกี่ยวกับสิทธิ์
// ผู้ใช้ฉันก็ยังใช้เป็นสิทธิ์แบบเดิมไม่เปลี่ยน"
//
// So we keep the existing admin/member role system but provide a
// standardized way to check permissions so they're not scattered
// as hard-coded checks across the codebase.
//
// This is a permission MATRIX — not a new role system.
// It maps existing roles to permissions in one place.
// ═══════════════════════════════════════════════════════════════

// ── Permission Definitions ──────────────────────────────────────
// These are the canonical permission strings for YP Work.
// Derived from the actual resources in the system.

export const Permissions = {
  // Events
  EVENT_READ: 'event.read',
  EVENT_CREATE: 'event.create',
  EVENT_UPDATE: 'event.update',
  EVENT_DELETE: 'event.delete',

  // Tasks (sub-items)
  TASK_READ: 'task.read',
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',

  // Task assignment
  TASK_ASSIGN: 'task.assign',

  // Groups (departments)
  GROUP_READ: 'group.read',
  GROUP_MANAGE: 'group.manage',

  // Users / Members
  USER_READ: 'user.read',
  USER_MANAGE: 'user.manage',

  // Admin
  ADMIN_PANEL: 'admin.panel',
  ADMIN_APPROVE_REQUEST: 'admin.approve_request',
  ADMIN_REJECT_REQUEST: 'admin.reject_request',

  // Profile
  PROFILE_READ: 'profile.read',
  PROFILE_READ_STATS: 'profile.read_stats',

  // Pending requests (public — for registration status check)
  PENDING_STATUS_CHECK: 'pending_status.check',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// ── Role → Permission Matrix ───────────────────────────────────

const MEMBER_PERMISSIONS: Permission[] = [
  Permissions.EVENT_READ,
  Permissions.EVENT_CREATE,
  Permissions.EVENT_UPDATE,
  Permissions.EVENT_DELETE,
  Permissions.TASK_READ,
  Permissions.TASK_CREATE,
  Permissions.TASK_UPDATE,
  Permissions.TASK_DELETE,
  Permissions.TASK_ASSIGN,
  Permissions.GROUP_READ,
  Permissions.USER_READ,
  Permissions.PROFILE_READ,
  Permissions.PROFILE_READ_STATS,
  Permissions.PENDING_STATUS_CHECK,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MEMBER_PERMISSIONS,
  Permissions.GROUP_MANAGE,
  Permissions.USER_MANAGE,
  Permissions.ADMIN_PANEL,
  Permissions.ADMIN_APPROVE_REQUEST,
  Permissions.ADMIN_REJECT_REQUEST,
];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ADMIN_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
};

// ── Permission Checker ─────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
