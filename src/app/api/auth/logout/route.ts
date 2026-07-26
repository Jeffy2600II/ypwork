// ═══════════════════════════════════════════════════════════════
// YP WORK · API · POST /api/auth/logout (v3.7.1)
// ═══════════════════════════════════════════════════════════════
// Server-side logout endpoint — แก้ปัญหา logout ไม่สำเร็จ
//
// ★ ทำไมต้องมี endpoint นี้?
//   ก่อนหน้านี้: client เรียก supabase.auth.signOut() โดยตรง
//   - signOut จะ revoke token ฝั่ง Supabase ✓
//   - แต่พยายามล้าง cookies ผ่าน document.cookie ❌
//   - Supabase auth cookies เป็น httpOnly → JS ล้างไม่ได้
//   - cookies ยังคงอยู่ → middleware เห็น session → redirect กลับ /today
//   - user ยังอยู่ในระบบ
//
//   ตอนนี้: server-side endpoint ที่:
//   1. เรียก supabase.auth.signOut() (server client)
//   2. ล้าง cookies ทั้งหมดผ่าน NextResponse (server ล้าง httpOnly ได้)
//   3. return 200 เมื่อเสร็จ
//
//   Client: เรียก endpoint นี้ รอ response แล้ว hard navigate ไป /login
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/security';

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. Sign out จาก Supabase Auth (revoke token ฝั่ง server)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[/api/auth/logout] signOut error:', error.message);
      // ไม่ return error — ยังล้าง cookies อยู่ดี
    }

    // 2. สร้าง response
    const response = NextResponse.json(
      { success: true, message: 'ออกจากระบบสำเร็จ' },
      { status: 200 }
    );

    // 3. ล้าง cookies ทั้งหมดที่เกี่ยวข้องกับ Supabase Auth
    //   ★ สำคัญมาก: ฝั่ง server สามารถล้าง httpOnly cookies ได้
    //   ฝั่ง client (JS) ล้างไม่ได้
    //
    //   Supabase cookies มีหลายรูปแบบ:
    //   - sb-<project-ref>-auth-token
    //   - sb-access-token
    //   - sb-refresh-token
    //   - และอื่นๆ ตาม config
    //
    //   วิธีที่ปลอดภัยที่สุด: ดึงรายการ cookies ทั้งหมดแล้วลบทุกตัวที่ขึ้นต้นด้วย 'sb-'
    //   รวมถึง yp_csrf_token ที่เราสร้างขึ้น

    // เข้าถึง cookies ผ่าน response
    // ใช้ cookieStore ผ่าน supabase response
    // แต่เนื่องจากเราใช้ @supabase/ssr createServerClient ที่รับ cookies()
    // เราต้องการล้าง cookies ทั้งหมดที่ browser ส่งมา

    // ใช้ next/headers cookies() เพื่อดูรายการ cookies ทั้งหมด
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // ล้างทุก cookie ที่เกี่ยวข้องกับ auth
    for (const cookie of allCookies) {
      const name = cookie.name;
      // ล้าง cookies ของ Supabase (sb-) + CSRF token ของเรา
      if (
        name.startsWith('sb-') ||
        name === 'yp_csrf_token' ||
        name.includes('supabase') ||
        name.includes('auth-token')
      ) {
        response.cookies.set(name, '', {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 0, // expire ทันที
        });
      }
    }

    // 4. Audit log
    auditLog('logout', { status: 'success' });

    return response;
  } catch (err) {
    console.error('[/api/auth/logout] exception:', err);
    auditLog('logout', { status: 'failure', meta: { error: String(err).slice(0, 200) } });

    // แม้จะ error ก็พยายามล้าง cookies
    const response = NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด แต่จะพยายามออกจากระบบอยู่ดี' },
      { status: 200 } // return 200 เพื่อให้ client navigate ต่อ
    );

    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      for (const cookie of allCookies) {
        if (
          cookie.name.startsWith('sb-') ||
          cookie.name === 'yp_csrf_token' ||
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth-token')
        ) {
          response.cookies.set(cookie.name, '', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 0,
          });
        }
      }
    } catch {
      // ignore
    }

    return response;
  }
}
