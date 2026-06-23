// Path:    src/components/LoginPage.tsx
// Purpose: Login page — student (full name + 5-digit student ID) or other (email + password).
//          Same auth flow as yplabs — uses synthesizeEmail pattern.
//          Uses council_users table for verification.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { setCachedProfile } from '@/lib/profileCache';
import type { UserProfile } from '@/lib/types';

/** Generate a synthetic email from a 5-digit student ID — same pattern as yplabs.
 *  CRITICAL: must use @yplabs.internal domain so the auth user created by yplabs
 *  is found by Supabase Auth (the two apps share one Supabase project). */
function synthesizeEmail(studentId: string): string {
  return `student_${studentId}@yplabs.internal`;
}

export function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [mode, setMode] = useState<'student' | 'other'>('student');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError('กรุณากรอกชื่อ-นามสกุล');
    if (!/^\d{5}$/.test(studentId)) return setError('รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก');

    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const synEmail = synthesizeEmail(studentId);

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: synEmail, password: studentId,
      });

      if (signInErr || !signInData?.user) {
        throw new Error('รหัสนักเรียนไม่ถูกต้อง หรือยังไม่มีบัญชีในระบบ');
      }

      const { data: row, error: rowErr } = await supabase
        .from('council_users')
        .select('auth_uid,full_name,student_id,email,year,role,account_type,approved,disabled')
        .eq('auth_uid', signInData.user.id)
        .limit(1)
        .maybeSingle();

      if (rowErr || !row) {
        await supabase.auth.signOut();
        throw new Error('ไม่พบข้อมูลบัญชีในระบบ');
      }

      if (!row.approved) { await supabase.auth.signOut(); throw new Error('บัญชียังไม่ได้รับการอนุมัติ'); }
      if (row.disabled)  { await supabase.auth.signOut(); throw new Error('บัญชีถูกปิดใช้งาน'); }

      if (row.full_name.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
        await supabase.auth.signOut();
        throw new Error('ชื่อ-นามสกุลไม่ตรงกับข้อมูลในระบบ');
      }

      const profile: UserProfile = {
        ...row,
        email: (row as any).email ?? '',
        avatar_url: null,
      } as UserProfile;
      setCachedProfile(profile);

      await refresh();
      router.push('/');
    } catch (err: any) {
      setError(err?.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtherLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('กรุณากรอก email และรหัสผ่าน');

    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });

      if (signInErr || !data?.user) {
        throw new Error(signInErr?.message ?? 'Email หรือรหัสผ่านไม่ถูกต้อง');
      }

      const { data: row, error: rowErr } = await supabase
        .from('council_users')
        .select('auth_uid,full_name,student_id,email,year,role,account_type,approved,disabled')
        .eq('auth_uid', data.user.id)
        .limit(1)
        .maybeSingle();

      if (rowErr || !row) {
        await supabase.auth.signOut();
        throw new Error('บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ');
      }

      if (!row.approved) { await supabase.auth.signOut(); throw new Error('บัญชียังไม่ได้รับการอนุมัติ'); }
      if (row.disabled)  { await supabase.auth.signOut(); throw new Error('บัญชีถูกปิดใช้งาน'); }

      const profile: UserProfile = {
        ...row,
        email: (row as any).email ?? '',
        avatar_url: null,
      } as UserProfile;
      setCachedProfile(profile);

      await refresh();
      router.push('/');
    } catch (err: any) {
      setError(err?.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div className="card" style={{ padding: '32px 32px 28px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{
              display: 'inline-flex',
              background: 'var(--sb-bg)',
              borderRadius: 'var(--r-lg)',
              padding: '10px 20px',
              marginBottom: 14,
              gap: 8,
              alignItems: 'center',
            }}>
              <span style={{
                background: 'var(--gold)', color: '#fff', fontWeight: 900, fontSize: 12,
                padding: '3px 9px', borderRadius: 7, letterSpacing: '0.08em',
              }}>
                ypwork
              </span>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>สภานักเรียน</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>
              เข้าสู่ระบบ
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>โรงเรียนคำยางพิทยา</div>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)',
            padding: 4, gap: 3, marginBottom: 22,
          }}>
            {(['student', 'other'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, border: 'none', borderRadius: 12, padding: '9px 4px',
                  fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--brand)' : 'var(--text-3)',
                  boxShadow: mode === m ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {m === 'student' ? '👩‍🎓 นักเรียน' : '👨‍🏫 ครู / อื่นๆ'}
              </button>
            ))}
          </div>

          {mode === 'student' ? (
            <form onSubmit={handleStudentLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="form-group">
                <label className="form-label">ชื่อ-นามสกุล (ตามที่สมัคร)</label>
                <input
                  value={fullName}
                  onChange={e => { setFullName(e.target.value); setError(null); }}
                  placeholder="เช่น สมชาย ใจดี"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">รหัสนักเรียน (5 หลัก)</label>
                <input
                  value={studentId}
                  onChange={e => { setStudentId(e.target.value); setError(null); }}
                  placeholder="12345"
                  inputMode="numeric"
                  maxLength={5}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div style={{
                  background: 'var(--red-bg)', color: 'var(--red)',
                  padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 13,
                }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                {loading ? '🔄 กำลังตรวจสอบ...' : 'เข้าสู่ระบบ →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtherLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  placeholder="teacher@school.ac.th"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div style={{
                  background: 'var(--red-bg)', color: 'var(--red)',
                  padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 13,
                }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                {loading ? '🔄 กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-3)' }}>
            ใช้บัญชีเดียวกับ yplabs — ถ้าเข้าได้ที่ yplabs ก็เข้าได้ที่นี่
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
          <Link href="/" style={{ color: 'var(--text-3)' }}>← กลับหน้าหลัก</Link>
        </div>
      </div>
    </div>
  );
}
