// Path:    src/app/api/auth/register/route.ts
// Purpose: Register a new council member — creates auth.users entry + council_users row.
//          ypwork reuses yplabs' council_users table (same Supabase project).
//          Use the service-role admin client so we can write to auth.users.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

export const runtime = 'nodejs';

/** Synthesize an email from a 5-digit student ID — same pattern as yplabs */
function synthesizeEmail(studentId: string): string {
  return `student_${studentId}@ypwork.local`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, studentId, year, accountType } = body as {
      fullName?: string; studentId?: string; year?: number; accountType?: string;
    };

    if (!fullName?.trim()) return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุล' }, { status: 400 });
    if (!studentId || !/^\d{5}$/.test(studentId)) return NextResponse.json({ error: 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก' }, { status: 400 });
    if (!year) return NextResponse.json({ error: 'กรุณาระบุปีการศึกษา' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const synEmail = synthesizeEmail(studentId);

    // Create auth user with email + password (password = studentId, like yplabs)
    const { data: createUserRes, error: createErr } = await admin.auth.admin.createUser({
      email: synEmail,
      password: studentId,
      email_confirm: true,
      user_metadata: { full_name: fullName, student_id: studentId },
    });

    if (createErr || !createUserRes?.user) {
      // User already exists?
      if (createErr?.message?.includes('already')) {
        return NextResponse.json({ error: 'รหัสนักเรียนนี้มีบัญชีแล้ว' }, { status: 409 });
      }
      return NextResponse.json({ error: createErr?.message ?? 'สร้างบัญชีล้มเหลว' }, { status: 500 });
    }

    const uid = createUserRes.user.id;

    // Insert into council_users (pending approval)
    const { error: profileErr } = await admin.from('council_users').insert({
      auth_uid: uid,
      full_name: fullName.trim(),
      student_id: studentId,
      email: synEmail,
      year,
      role: 'member',
      approved: false,
      disabled: false,
      account_type: accountType ?? 'student',
    });

    if (profileErr) {
      console.error('[register] insert council_users failed:', profileErr);
      // Roll back auth user
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: 'บันทึกโปรไฟล์ล้มเหลว' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      uid,
      message: 'ลงทะเบียนสำเร็จ — รอแอดมินอนุมัติ',
    });
  } catch (e: any) {
    console.error('[register] error:', e);
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
