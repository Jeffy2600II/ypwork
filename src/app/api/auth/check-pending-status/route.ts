// ═══════════════════════════════════════════════════════════════
// YP WORK · API · /api/auth/check-pending-status (v1.9.2)
// ═══════════════════════════════════════════════════════════════
// ตรวจสอบสถานะคำขอสมัครของผู้ใช้แบบ definitive
//
// ★ ทำไมต้องมี API นี้ (v1.9.2 bug fix):
//   ก่อนหน้านี้ ระบบฝั่ง client ใช้ Supabase client (anon key) เพื่อ
//   SELECT จาก council_join_requests เพื่อตรวจสอบว่ายัง pending หรือไม่
//   แต่ RLS policy `council_join_requests_select_own` อนุญาต
//   เฉพาะ authenticated users เท่านั้น — anon users (ผู้ที่ยังไม่ login)
//   ไม่สามารถ SELECT ได้เลย
//
//   ผลคือ: ผู้ใช้ที่ส่งคำขอใหม่ (ยังไม่มี auth account) มาที่หน้า /pending-status
//          → fetchPendingRequest() คืน null (RLS บล็อก)
//          → tryCheckApproved() ลอง signIn ล้มเหลว (ยังไม่มี auth account)
//          → ระบบตีความเป็น 'rejected' ทั้งที่จริงยัง 'pending' อยู่
//
//   การแก้ไข: API นี้ใช้ service role (bypass RLS) เพื่อตรวจสอบสถานะ
//   ที่แน่นอน — ถ้า row มีอยู่ใน council_join_requests = pending เสมอ
//
// ★ Logic ตาม requirement ของ user (v1.9.2):
//   - ข้อมูลอยู่ใน council_join_requests = ยังรออนุมัติ (pending)
//     ยังไม่อนุมัติ และยังไม่ถูกปฏิเสธ
//   - ข้อมูลไม่อยู่ใน council_join_requests:
//     - ถ้าอยู่ใน council_users (approved=true) = approved (อนุมัติแล้ว)
//     - ถ้าไม่อยู่ใน council_users = rejected (ถูกปฏิเสธ) หรือไม่เคยสมัคร
//
// Auth: ไม่ต้อง login — API นี้ใช้สำหรับ pre-login status check
//       แต่จำกัด input เพื่อกัน abuse (เช็คแค่ student_id หรือ email เท่านั้น)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { synthesizeEmail } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/check-pending-status?student_id=12345
 * GET /api/auth/check-pending-status?email=test@example.com
 *
 * Response:
 *   {
 *     status: 'pending' | 'approved' | 'rejected' | 'not_found' | 'error',
 *     request?: { full_name, student_id, email, national_id, account_type, year, department_id, submitted_at },
 *     user?: { full_name, auth_uid }
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id')?.trim();
    const email = url.searchParams.get('email')?.trim().toLowerCase();

    if (!studentId && !email) {
      return NextResponse.json(
        { status: 'error', error: 'ต้องระบุ student_id หรือ email' },
        { status: 400 }
      );
    }

    // สร้าง adminClient (service role) — bypass RLS
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (err) {
      console.error('[check-pending-status] createAdminClient failed:', err);
      return NextResponse.json(
        {
          status: 'error',
          error: 'ระบบยังไม่พร้อม — กรุณาติดต่อผู้ดูแล (SERVICE_ROLE_KEY ไม่ได้ตั้งค่า)',
        },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // STEP 1: ตรวจ council_join_requests ก่อน
    //   ถ้ามี row → pending (ยังไม่ถูกอนุมัติ และยังไม่ถูกปฏิเสธ)
    // ─────────────────────────────────────────────────────────
    let requestQuery = adminClient
      .from('council_join_requests')
      .select(
        'id, full_name, student_id, email, national_id, account_type, year, department_id, created_at'
      );

    if (studentId) {
      requestQuery = requestQuery.eq('student_id', studentId);
    } else if (email) {
      requestQuery = requestQuery.eq('email', email);
    }

    const { data: pendingRow, error: pendingErr } = await requestQuery
      .limit(1)
      .maybeSingle();

    if (pendingErr) {
      console.error('[check-pending-status] query council_join_requests error:', pendingErr);
      return NextResponse.json(
        { status: 'error', error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' },
        { status: 500 }
      );
    }

    if (pendingRow) {
      // ★ มี row ใน council_join_requests → pending แน่นอน
      return NextResponse.json({
        status: 'pending',
        request: {
          full_name: pendingRow.full_name,
          student_id: pendingRow.student_id ?? null,
          email: pendingRow.email ?? null,
          national_id: pendingRow.national_id ?? null,
          account_type: pendingRow.account_type || 'student',
          year: pendingRow.year ?? null,
          department_id: pendingRow.department_id ?? null,
          submitted_at: pendingRow.created_at ?? null,
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // STEP 2: ไม่มี row ใน council_join_requests → ตรวจ council_users
    //   ถ้ามี row ที่ approved=true → approved (อนุมัติแล้ว)
    //   ถ้าไม่มี row → rejected (ถูกปฏิเสธ) หรือไม่เคยสมัคร
    // ─────────────────────────────────────────────────────────

    let lookupEmail = email;
    if (studentId && !email) {
      lookupEmail = synthesizeEmail(studentId);
    }

    if (lookupEmail) {
      const { data: councilUser, error: councilErr } = await adminClient
        .from('council_users')
        .select('id, auth_uid, full_name, approved, disabled, email, student_id, account_type')
        .eq('email', lookupEmail)
        .limit(1)
        .maybeSingle();

      if (councilErr) {
        console.error('[check-pending-status] query council_users by email error:', councilErr);
      }

      if (councilUser) {
        if (councilUser.approved && !councilUser.disabled) {
          return NextResponse.json({
            status: 'approved',
            user: {
              full_name: councilUser.full_name,
              auth_uid: councilUser.auth_uid,
            },
          });
        }
        return NextResponse.json({
          status: 'rejected',
          reason: 'disabled_or_not_approved',
        });
      }
    }

    if (studentId) {
      const { data: councilUserBySid, error: sidErr } = await adminClient
        .from('council_users')
        .select('id, auth_uid, full_name, approved, disabled, email, student_id')
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle();

      if (sidErr) {
        console.error('[check-pending-status] query council_users by student_id error:', sidErr);
      }

      if (councilUserBySid) {
        if (councilUserBySid.approved && !councilUserBySid.disabled) {
          return NextResponse.json({
            status: 'approved',
            user: {
              full_name: councilUserBySid.full_name,
              auth_uid: councilUserBySid.auth_uid,
            },
          });
        }
        return NextResponse.json({
          status: 'rejected',
          reason: 'disabled_or_not_approved',
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // STEP 3: ไม่พบทั้งใน council_join_requests และ council_users
    //   → อาจเป็น rejected (เคยส่งคำขอแล้วถูกปฏิเสธ — row ถูกลบไปแล้ว)
    //   → หรือไม่เคยสมัครเลย
    //   เราไม่สามารถแยก 2 กรณีนี้ได้จาก DB (เพราะ rejected = ลบ row)
    //   จึงคืนเป็น 'rejected' และให้ client ตัดสินใจต่อ
    //   (client สามารถเช็ค localStorage เพื่อดูว่าเคยส่งคำขอหรือไม่)
    // ─────────────────────────────────────────────────────────
    return NextResponse.json({
      status: 'rejected',
      reason: 'no_record_found',
    });
  } catch (err: any) {
    console.error('[check-pending-status] unexpected error:', err);
    return NextResponse.json(
      {
        status: 'error',
        error: err?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
      },
      { status: 500 }
    );
  }
}
