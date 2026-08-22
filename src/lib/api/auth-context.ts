// ═══════════════════════════════════════════════════════════════
// YP WORK · API · Auth Context (Round 24)
// ═══════════════════════════════════════════════════════════════
// Gateway-compatible auth context that wraps the existing guards.
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { requireUser, type UserGuard } from '@/lib/auth/user-guard';
import { requireAdmin, type AdminGuard } from '@/lib/auth/api-guard';
import { apiError, ErrorCode } from './response';
import type { NextResponse } from 'next/server';

// ── Auth Context Result Types ──────────────────────────────────

type AuthUserContextSuccess = {
  ok: true;
  userClient: UserGuard extends { ok: true; userClient: infer T } ? T : never;
  adminClient: UserGuard extends { ok: true; adminClient: infer T } ? T : never;
  userAuthUid: string;
  userFullName: string;
  userRole: 'admin' | 'member';
  userDepartmentId: string | null;
};

type AuthAdminContextSuccess = {
  ok: true;
  adminClient: AdminGuard extends { ok: true; adminClient: infer T } ? T : never;
  userAuthUid: string;
  userFullName: string;
};

export type AuthUserContext = AuthUserContextSuccess;
export type AuthAdminContext = AuthAdminContextSuccess;

export interface AuthFail {
  ok: false;
  response: NextResponse;
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Require an authenticated, approved user.
 * Returns standardized API response on failure.
 */
export async function requireAuthUser(
  req: NextRequest
): Promise<AuthUserContext | AuthFail> {
  const guard = await requireUser();
  if (!guard.ok) {
    const status = guard.response.status;
    const code =
      status === 401 ? ErrorCode.AUTH_REQUIRED : ErrorCode.AUTH_FORBIDDEN;
    const message =
      status === 401
        ? 'ไม่ได้เข้าสู่ระบบ'
        : 'บัญชีนี้ยังไม่ได้รับการอนุมัติหรือถูกปิดใช้งาน';

    return {
      ok: false,
      response: apiError(req, code, message, { status }),
    };
  }

  // guard.ok === true here — extract fields
  return {
    ok: true,
    userClient: guard.userClient,
    adminClient: guard.adminClient,
    userAuthUid: guard.userAuthUid,
    userFullName: guard.userFullName,
    userRole: guard.userRole,
    userDepartmentId: guard.userDepartmentId,
  };
}

/**
 * Require an authenticated admin.
 * Returns standardized API response on failure.
 */
export async function requireAuthAdmin(
  req: NextRequest
): Promise<AuthAdminContext | AuthFail> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    const status = guard.response.status;
    const code =
      status === 401 ? ErrorCode.AUTH_REQUIRED : ErrorCode.AUTH_FORBIDDEN;
    const message =
      status === 401
        ? 'ไม่ได้เข้าสู่ระบบ'
        : status === 403
          ? 'ไม่มีสิทธิ์เข้าถึง — เฉพาะผู้ดูแลระบบเท่านั้น'
          : 'ไม่พบบัญชีในระบบ';

    return {
      ok: false,
      response: apiError(req, code, message, { status }),
    };
  }

  return {
    ok: true,
    adminClient: guard.adminClient,
    userAuthUid: guard.userAuthUid,
    userFullName: guard.userFullName,
  };
}
