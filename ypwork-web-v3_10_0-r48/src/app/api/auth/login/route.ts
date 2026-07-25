// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/auth/login (v3.7.7)
// ═══════════════════════════════════════════════════════════════
// Server-side login endpoint — แก้ปัญหา RLS บล็อกการ query council_users
//
// ★ ทำไมต้องมี endpoint นี้?
//   ปัญหา: หลัง logout แล้ว login ใหม่ ระบบบอก "ไม่พบบัญชี"
//   สาเหตุ: council_users มี RLS policy "SELECT ตัวเอง" (WHERE auth_uid = auth.uid())
//   หลัง signIn สำเร็จ Supabase auth session อาจยังไม่พร้อมทันที
//   → auth.uid() คืนค่า null → RLS บล็อก → query คืนค่าว่าง → "ไม่พบบัญชี"
//
//   วิธีแก้: server-side endpoint ที่:
//   1. signInWithPassword ฝั่ง server (set httpOnly cookies)
//   2. ใช้ adminClient (service role) query council_users → bypass RLS
//   3. ตรวจ approved/disabled/national_id
//   4. return SessionUser + set cookies
//
// ★ Security:
//   - Rate limit: ผ่าน middleware (LOGIN_ATTEMPT)
//   - ไม่ log password
//   - Audit log: login_success / login_failure
//   - ตรวจ national_id match ฝั่ง server
//
// Body: { email: string, password: string, national_id?: string }
// Response: { success: boolean, user?: SessionUser, error?: string }
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';
import { getUserColor } from '@/lib/utils/user-color';
import type { SessionUser } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;
    const password = body?.password;
    const national_id = body?.national_id; // optional — สำหรับนักเรียน

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing email' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing password' },
        { status: 400 }
      );
    }

    // 1. signInWithPassword ฝั่ง server — set httpOnly cookies ผ่าน NextResponse
    const supabase = await createClient();
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInErr || !signInData?.user) {
      console.error('[/api/auth/login] signIn error:', signInErr?.message);
      auditLog('login_failure', {
        actor: email.slice(0, 50),
        status: 'failure',
        meta: { reason: 'sign_in_failed', error: signInErr?.message?.slice(0, 100) },
      });
      return NextResponse.json(
        { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const authUid = signInData.user.id;

    // 2. ใช้ adminClient (service role) query council_users → bypass RLS
    //   ★ สำคัญมาก: แก้ปัญหา RLS บล็อกหลัง signIn ใหม่
    const adminClient = createAdminClient();
    const { data: profile, error: profileErr } = await adminClient
      .from('council_users')
      .select('*')
      .eq('auth_uid', authUid)
      .limit(1)
      .maybeSingle();

    if (profileErr) {
      console.error('[/api/auth/login] council_users query error:', profileErr.message);
      // signOut เพื่อล้าง session ที่ไม่มี profile
      await supabase.auth.signOut();
      auditLog('login_failure', {
        actor: authUid,
        status: 'failure',
        meta: { reason: 'profile_query_error' },
      });
      return NextResponse.json(
        { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี' },
        { status: 500 }
      );
    }

    if (!profile) {
      // ไม่พบ profile — อาจเป็น pending หรือยังไม่ได้อนุมัติ
      await supabase.auth.signOut();
      auditLog('login_failure', {
        actor: authUid,
        status: 'failure',
        meta: { reason: 'no_profile' },
      });
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบัญชีในระบบ — อาจยังไม่ได้รับการอนุมัติ' },
        { status: 403 }
      );
    }

    // 3. ตรวจ approved / disabled
    if (!profile.approved) {
      await supabase.auth.signOut();
      auditLog('login_failure', {
        actor: authUid,
        status: 'failure',
        meta: { reason: 'not_approved' },
      });
      return NextResponse.json(
        { success: false, error: 'บัญชียังไม่ได้รับการอนุมัติ' },
        { status: 403 }
      );
    }

    if (profile.disabled) {
      await supabase.auth.signOut();
      auditLog('login_failure', {
        actor: authUid,
        status: 'failure',
        meta: { reason: 'disabled' },
      });
      return NextResponse.json(
        { success: false, error: 'บัญชีถูกปิดใช้งาน' },
        { status: 403 }
      );
    }

    // 4. ตรวจ national_id สำหรับนักเรียน (ถ้าส่งมา)
    if (national_id && typeof national_id === 'string') {
      const cleanNational = national_id.replace(/\D/g, '');
      if (
        profile.national_id !== undefined &&
        profile.national_id !== null &&
        profile.national_id !== ''
      ) {
        if (String(profile.national_id).trim() !== cleanNational.trim()) {
          await supabase.auth.signOut();
          auditLog('login_failure', {
            actor: authUid,
            status: 'failure',
            meta: { reason: 'national_id_mismatch' },
          });
          return NextResponse.json(
            { success: false, error: 'เลขบัตรประชาชนไม่ตรงกับข้อมูลในระบบ' },
            { status: 403 }
          );
        }
      }
    }

    // 5. สร้าง SessionUser
    const user: SessionUser = {
      auth_uid: profile.auth_uid,
      full_name: profile.full_name,
      student_id: profile.student_id || null,
      national_id: profile.national_id || null,
      year: profile.year || null,
      role: profile.role || 'member',
      account_type: (profile.account_type || 'student') as 'student' | 'teacher' | 'other',
      email: profile.email || '',
      department_id: profile.department_id || null,
      color: getUserColor(profile.auth_uid),
    };

    auditLog('login_success', {
      actor: authUid,
      status: 'success',
      meta: { method: 'server_login' },
    });

    return NextResponse.json(
      { success: true, user },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/auth/login] exception:', err);
    auditLog('login_failure', {
      status: 'failure',
      meta: { reason: 'exception', error: String(err).slice(0, 100) },
    });
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
