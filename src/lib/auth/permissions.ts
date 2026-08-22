// ═══════════════════════════════════════════════════════════════
// YP WORK · Auth · Permissions (Round 22)
// ═══════════════════════════════════════════════════════════════
// Resource-level authorization for YP Work.
//
// Model: Creator + Assignee + Admin
//   Event: create/read = all, update/delete = creator or admin
//   Task:  create/read = all, update = creator/assignee/admin,
//          delete = creator or admin
//
// Server-side checks only — never rely on client-side authorization.
// ═══════════════════════════════════════════════════════════════

export interface PermissionContext {
  userAuthUid: string;
  userRole: 'admin' | 'member';
  userDepartmentId: string | null;
}

export interface ResourceOwnership {
  created_by?: string | null;
  assignees?: string[];
  department_id?: string | null;
}

// ── Event permissions ──────────────────────────────────────────

export function canCreateEvent(ctx: PermissionContext): boolean {
  return true; // all approved users can create events
}

export function canUpdateEvent(
  ctx: PermissionContext,
  ownership: ResourceOwnership
): boolean {
  if (ctx.userRole === 'admin') return true;
  return ownership.created_by === ctx.userAuthUid;
}

export function canDeleteEvent(
  ctx: PermissionContext,
  ownership: ResourceOwnership
): boolean {
  if (ctx.userRole === 'admin') return true;
  return ownership.created_by === ctx.userAuthUid;
}

// ── Task permissions ───────────────────────────────────────────

export function canCreateTask(ctx: PermissionContext): boolean {
  return true;
}

export function canUpdateTask(
  ctx: PermissionContext,
  ownership: ResourceOwnership
): boolean {
  if (ctx.userRole === 'admin') return true;
  // Event creator can update tasks in their event
  if (ownership.created_by === ctx.userAuthUid) return true;
  // Task assignee can update their assigned task
  return (ownership.assignees ?? []).includes(ctx.userAuthUid);
}

export function canDeleteTask(
  ctx: PermissionContext,
  ownership: ResourceOwnership
): boolean {
  if (ctx.userRole === 'admin') return true;
  // Only event creator can delete tasks (prevent unnecessary deletion)
  return ownership.created_by === ctx.userAuthUid;
}
