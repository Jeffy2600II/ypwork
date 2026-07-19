// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/auth/auto-login (v3.7.2)
// ═══════════════════════════════════════════════════════════════
// Server-side auto-login endpoint — ใช้หลัง admin อนุมัติการลงทะเบียน
//
// ★ ทำไมต้องมี endpoint นี้?
//   ก่อนหน้านี้: pending-status-client ใช้ client-side
//   supabase.auth.signInWithPassword() ซึ่งมีปัญหา:
//   - sign-in สำเร็จใน memory ✓
//   - แต่ httpOnly cookies อาจยังไม่ถูก set ทัน (race condition)
//   - แล้ว router.replace('/today') (SPA) → middleware ตรวจพบ !user
//   - → redirect กลับ /login → user ต้อง login เอง
//
//   ตอนนี้: server-side endpoint ที่:
//   1. รับ email + password จาก client
//   2. signInWithPassword ฝั่ง server (server client)
//   3. Supabase SSR จะ set httpOnly cookies ผ่าน NextResponse โดยตรง
//   4. return success → client ใช้ window.location.replace (hard nav)
//
// ★ Security:
//   - Rate limit: ใช้ GENERIC_API (ผ่าน middleware แล้ว)
//   - ไม่ log password
//   - Audit log: login_success / login_failure
//   - Exempt CSRF: ใช้ session ฝั่ง server ตรวจสอบเอง
//
// Body: { email: string, password: string }
// Response: { success: boolean, error?: string }
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;
    const password = body?.password;

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

    // สร้าง server Supabase client — จะจัดการ cookies ผ่าน NextResponse
    const supabase = await createClient();

    // signInWithPassword ฝั่ง server
    // ★ สำคัญ: supabase ที่สร้างจาก createServerClient จะ set cookies
    //   ผ่าน cookies().set() โดยอัตโนมัติเมื่อ sign-in สำเร็จ
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.user) {
      console.error('[/api/auth/auto-login] sign-in error:', error?.message);
      auditLog('login_failure', {
        actor: email.slice(0, 50),
        status: 'failure',
        meta: { reason: 'auto_login_failed', error: error?.message?.slice(0, 100) },
      });
      return NextResponse.json(
        { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ — อาจยังไม่ได้รับการอนุมัติ' },
        { status: 401 }
      );
    }

    // sign-in สำเร็จ — cookies ถูก set แล้วโดย supabase SSR
    auditLog('login_success', {
      actor: data.user.id,
      status: 'success',
      meta: { method: 'auto_login' },
    });

    return NextResponse.json(
      { success: true, uid: data.user.id },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/auth/auto-login] exception:', err);
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
