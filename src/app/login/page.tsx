'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Login Page (v1.9 — pending + rejected flow)
// ═══════════════════════════════════════════════════════════════
// v1.9 changes:
//   - ถ้า login สำเร็จ → redirect ไป /today (เหมือนเดิม)
//   - ถ้า status='pending' → set pending session + redirect ไป /pending-status
//     (ผู้ใช้ที่ส่งคำขอแล้วแต่ยังไม่อนุมัติ สามารถดูสถานะแบบ realtime ได้)
//   - ถ้า status='rejected' → แสดงข้อความ "ถูกปฏิเสธ" + ปุ่ม "ส่งคำขอใหม่"
//   - ถ้า status='not_found' → แสดงข้อความ "ยังไม่มีบัญชี" + ปุ่ม "ส่งคำขอสมัคร"
//   - ตอน mount → ตรวจ localStorage ว่ามี pending session อยู่หรือไม่
//     ถ้ามี → auto-redirect ไป /pending-status (user กลับเข้ามาดูสถานะต่อ)
//
// Baseline (v1.8):
//   - ใช้ .yp-login-bg (gradient + dust particles นิ่ง)
//   - Mode toggle: นักเรียน ↔ ครู/อื่นๆ (segmented control)
//   - Student form: national_id (13) + student_code (5)
//   - Other form: email + password
//   - หลัง login สำเร็จ → redirect ไป /today หรือ ?redirect= param
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Briefcase,
  IdCard,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  UserX,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  loginStudent,
  loginOther,
  validateNationalId,
  validateStudentCode,
  validateEmail,
  validatePassword,
} from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  getPendingSession,
  setPendingSession,
  clearPendingSession,
  clearRejectedAccount,
} from '@/lib/pending-session';

type LoginMode = 'student' | 'other';

interface FieldErrors {
  nationalId?: string;
  studentCode?: string;
  email?: string;
  password?: string;
}

/** UI state สำหรับ v1.9 — แยกจาก toast เพื่อให้แสดง actionable UI */
type LoginUiState =
  | { kind: 'idle' }
  | { kind: 'rejected'; message: string; canResubmit: boolean; studentId?: string | null; email?: string | null }
  | { kind: 'not_found'; message: string };

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = React.useMemo(() => createClient(), []);

  const [mode, setMode] = React.useState<LoginMode>('student');
  const [submitting, setSubmitting] = React.useState(false);

  // form state
  const [nationalId, setNationalId] = React.useState('');
  const [studentCode, setStudentCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const [errors, setErrors] = React.useState<FieldErrors>({});

  // v1.9: UI state สำหรับ pending/rejected/not_found
  const [uiState, setUiState] = React.useState<LoginUiState>({ kind: 'idle' });

  // v1.9: ตอน mount → ตรวจ localStorage ว่ามี pending session อยู่หรือไม่
  //       ถ้ามี → auto-redirect ไป /pending-status (user กลับเข้ามาดูสถานะต่อ)
  React.useEffect(() => {
    const pending = getPendingSession();
    if (pending) {
      // ใช้ replace เพื่อไม่ให้ user กด back กลับมาหน้า login ได้
      router.replace('/pending-status');
    }
  }, [router]);

  // ── Helpers ──
  const clearError = React.useCallback((field: keyof FieldErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    // v1.9: เคลียร์ UI state ด้วยถ้า user เริ่มพิมพ์ใหม่
    setUiState({ kind: 'idle' });
  }, []);

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
    setNationalId(digits);
    clearError('nationalId');
  };

  const handleStudentCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
    setStudentCode(digits);
    clearError('studentCode');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearError('email');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    clearError('password');
  };

  // ── Submit handlers ──
  const [debugLogs, setDebugLogs] = React.useState<string[]>([]);

  const addLog = React.useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors: FieldErrors = {};
    if (!validateNationalId(nationalId)) nextErrors.nationalId = 'เลขบัตรประชาชนต้องมี 13 หลัก';
    if (!validateStudentCode(studentCode)) nextErrors.studentCode = 'รหัสนักเรียนต้องมี 5 หลัก';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast({ title: 'กรุณาตรวจสอบข้อมูลที่กรอก', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    setDebugLogs([]);
    setUiState({ kind: 'idle' });
    addLog(`เริ่ม login นักเรียน — nationalId=${nationalId}, studentCode=${studentCode}`);
    try {
      const result = await loginStudent(supabase, nationalId, studentCode);
      if (result.debug && result.debug.length > 0) {
        result.debug.forEach((d) => addLog(d));
      }

      // v1.9: แยก handling ตาม status
      if (result.success && result.user) {
        addLog(`✅ สำเร็จ — ${result.user.full_name}`);
        // เคลียร์ pending session ถ้ามี (user อนุมัติแล้ว ไม่ใช่ pending อีก)
        clearPendingSession();
        toast({ title: `สวัสดี ${result.user.full_name}`, description: 'เข้าสู่ระบบสำเร็จ' });
        const redirect = getRedirectParam();
        setTimeout(() => router.replace(redirect), 350);
        return;
      }

      // v1.9: pending → set pending session + redirect ไป /pending-status
      if (result.status === 'pending' && result.pendingRequest) {
        addLog(`⏳ pending — ${result.pendingRequest.full_name}`);
        setPendingSession({
          student_id: result.pendingRequest.student_id,
          email: result.pendingRequest.email,
          national_id: result.pendingRequest.national_id,
          full_name: result.pendingRequest.full_name,
          account_type: result.pendingRequest.account_type,
          submitted_at: result.pendingRequest.submitted_at || new Date().toISOString(),
          // v1.9.3: นักเรียนไม่ต้องเก็บ password (คำนวณได้จาก student_id)
          password: null,
        });
        toast({
          title: 'คำขอยังอยู่ระหว่างพิจารณา',
          description: 'กำลังนำคุณไปยังหน้าสถานะ...',
        });
        setTimeout(() => router.replace('/pending-status'), 350);
        return;
      }

      // v1.9: rejected → แสดง UI "ถูกปฏิเสธ" + ปุ่มส่งคำขอใหม่
      if (result.status === 'rejected') {
        addLog(`🚫 rejected — studentCode=${studentCode}`);
        setUiState({
          kind: 'rejected',
          message: result.error ?? 'คำขอถูกปฏิเสธ',
          canResubmit: true,
          studentId: studentCode,
        });
        toast({
          title: 'คำขอสมัครถูกปฏิเสธ',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      // v1.9: not_found → แสดง UI "ยังไม่มีบัญชี" + ปุ่มสมัคร
      if (result.status === 'not_found') {
        addLog(`❓ not_found — แนะนำให้สมัคร`);
        setUiState({
          kind: 'not_found',
          message: result.error ?? 'ยังไม่มีบัญชีในระบบ',
        });
        toast({
          title: 'ยังไม่มีบัญชีในระบบ',
          description: 'คุณต้องส่งคำขอสมัครก่อน',
          variant: 'destructive',
        });
        return;
      }

      // error ทั่วไป
      addLog(`❌ ล้มเหลว: ${result.error ?? 'ไม่ทราบสาเหตุ'}`);
      toast({ title: result.error ?? 'เข้าสู่ระบบไม่สำเร็จ', variant: 'destructive' });
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors: FieldErrors = {};
    if (!validateEmail(email)) nextErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!validatePassword(password)) nextErrors.password = 'รหัสผ่านต้องไม่น้อยกว่า 6 ตัว';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast({ title: 'กรุณาตรวจสอบข้อมูลที่กรอก', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    setUiState({ kind: 'idle' });
    try {
      const result = await loginOther(supabase, email, password);

      // v1.9: แยก handling ตาม status (เหมือนนักเรียน)
      if (result.success && result.user) {
        clearPendingSession();
        toast({ title: `สวัสดี ${result.user.full_name}`, description: 'เข้าสู่ระบบสำเร็จ' });
        const redirect = getRedirectParam();
        setTimeout(() => router.replace(redirect), 350);
        return;
      }

      if (result.status === 'pending' && result.pendingRequest) {
        setPendingSession({
          student_id: result.pendingRequest.student_id,
          email: result.pendingRequest.email,
          national_id: result.pendingRequest.national_id,
          full_name: result.pendingRequest.full_name,
          account_type: result.pendingRequest.account_type,
          submitted_at: result.pendingRequest.submitted_at || new Date().toISOString(),
          // v1.9.3: เก็บ password ของครู/อื่นๆ เพื่อใช้ sign-in อัตโนมัติเมื่อ admin อนุมัติ
          // (user กรอก password เอง และอยู่ในเครื่องของตัวเอง เป็นความปลอดภัยที่ยอมรับได้)
          password: password,
        });
        toast({
          title: 'คำขอยังอยู่ระหว่างพิจารณา',
          description: 'กำลังนำคุณไปยังหน้าสถานะ...',
        });
        setTimeout(() => router.replace('/pending-status'), 350);
        return;
      }

      if (result.status === 'rejected') {
        setUiState({
          kind: 'rejected',
          message: result.error ?? 'คำขอถูกปฏิเสธ',
          canResubmit: true,
          email,
        });
        toast({
          title: 'คำขอสมัครถูกปฏิเสธ',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      if (result.status === 'not_found') {
        setUiState({
          kind: 'not_found',
          message: result.error ?? 'ยังไม่มีบัญชีในระบบ',
        });
        toast({
          title: 'ยังไม่มีบัญชีในระบบ',
          description: 'คุณต้องส่งคำขอสมัครก่อน',
          variant: 'destructive',
        });
        return;
      }

      // error ทั่วไป
      toast({ title: result.error ?? 'เข้าสู่ระบบไม่สำเร็จ', variant: 'destructive' });
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const subText =
    mode === 'student'
      ? 'กรอกเลขบัตรประชาชน 13 หลัก และรหัสนักเรียน 5 หลัก'
      : 'กรอกอีเมลและรหัสผ่านที่ลงทะเบียนไว้';

  return (
    <div className="yp-auth yp-login-bg">
      <div className="yp-auth__inner">
        {/* ── BRAND ── */}
        <div className="yp-auth__brand">
          <div className="yp-auth__logo" aria-hidden="true">YP</div>
          <div className="yp-auth__brand-text">
            <div className="yp-auth__brand-name">YP Work</div>
            <div className="yp-auth__brand-tag">Student Council Hub</div>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="yp-auth__hero">
          <span className="yp-auth__demo-badge">DEMO · Supabase</span>
          <h1>สมองของ<br />สภานักเรียน</h1>
          <p>จัดตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อย ในที่เดียว — ไม่ลืมอีกต่อไป</p>
        </div>

        {/* ── CARD ── */}
        <div className="yp-auth__card">
          <h2 className="yp-auth__card-title">เข้าสู่ระบบ</h2>
          <p className="yp-auth__card-sub">{subText}</p>

          {/* ── MODE TOGGLE ── */}
          <div className="yp-auth__mode-toggle" role="tablist" aria-label="เลือกประเภทผู้ใช้">
            <button
              type="button"
              className={`yp-auth__mode-btn${mode === 'student' ? ' is-active' : ''}`}
              onClick={() => setMode('student')}
              role="tab"
              aria-selected={mode === 'student'}
            >
              <GraduationCap />
              นักเรียน
            </button>
            <button
              type="button"
              className={`yp-auth__mode-btn${mode === 'other' ? ' is-active' : ''}`}
              onClick={() => setMode('other')}
              role="tab"
              aria-selected={mode === 'other'}
            >
              <Briefcase />
              ครู / อื่นๆ
            </button>
          </div>

          {/* ── STUDENT FORM ── */}
          {mode === 'student' ? (
            <form onSubmit={handleStudentSubmit} noValidate>
              {/* National ID */}
              <div className={`field${errors.nationalId ? ' has-error' : ''}`}>
                <label className="field__label" htmlFor="national-id">
                  เลขบัตรประจำตัวประชาชน<span className="yp-required">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group__addon" aria-hidden="true">
                    <IdCard className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <input
                    id="national-id"
                    className="yp-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="1 1 0 0 5 0 1 2 4 5 6 2 1"
                    autoComplete="off"
                    value={nationalId}
                    onChange={handleNationalIdChange}
                    disabled={submitting}
                  />
                </div>
                {errors.nationalId ? (
                  <div className="field__error">{errors.nationalId}</div>
                ) : null}
              </div>

              {/* Student Code */}
              <div className={`field${errors.studentCode ? ' has-error' : ''}`}>
                <label className="field__label" htmlFor="student-code">
                  รหัสนักเรียน<span className="yp-required">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group__addon" aria-hidden="true">
                    <GraduationCap className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <input
                    id="student-code"
                    className="yp-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="3 8 0 0 1"
                    autoComplete="off"
                    value={studentCode}
                    onChange={handleStudentCodeChange}
                    disabled={submitting}
                  />
                </div>
                {errors.studentCode ? (
                  <div className="field__error">{errors.studentCode}</div>
                ) : null}
              </div>

              <button
                type="submit"
                className="yp-btn yp-btn--primary yp-btn--block yp-btn--lg"
                style={{ marginTop: '8px' }}
                disabled={submitting}
              >
                {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
                {!submitting ? <ArrowRight className="size-4" /> : null}
              </button>

              {/* Debug panel (collapsible) */}
              {debugLogs.length > 0 ? (
                <details
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'var(--yp-text-muted)',
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      userSelect: 'none',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🔍 ดู login log ({debugLogs.length} ขั้นตอน)
                  </summary>
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: 'var(--yp-bg-card-soft)',
                      border: '1px solid var(--yp-border-subtle)',
                      borderRadius: 'var(--yp-radius-sm)',
                      fontFamily: 'var(--yp-font-mono, monospace)',
                      fontSize: '11px',
                      color: 'var(--yp-text-body)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {debugLogs.map((l, i) => (
                      <div
                        key={i}
                        style={{
                          color: l.includes('❌')
                            ? '#BE123C'
                            : l.includes('✅')
                            ? '#047857'
                            : l.includes('⚠️')
                            ? '#B45309'
                            : 'var(--yp-text-body)',
                        }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(debugLogs.join('\n')).catch(() => {});
                      }
                    }}
                    style={{
                      marginTop: '6px',
                      background: 'transparent',
                      border: '1px solid var(--yp-border-subtle)',
                      borderRadius: 'var(--yp-radius-sm)',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--yp-text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    📋 คัดลอก log
                  </button>
                </details>
              ) : null}
            </form>
          ) : (
            <form onSubmit={handleOtherSubmit} noValidate>
              {/* Email */}
              <div className={`field${errors.email ? ' has-error' : ''}`}>
                <label className="field__label" htmlFor="email">
                  อีเมล<span className="yp-required">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group__addon" aria-hidden="true">
                    <Mail className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <input
                    id="email"
                    className="yp-input"
                    type="email"
                    inputMode="email"
                    placeholder="teacher@school.ac.th"
                    autoComplete="off"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={submitting}
                  />
                </div>
                {errors.email ? (
                  <div className="field__error">{errors.email}</div>
                ) : null}
              </div>

              {/* Password */}
              <div className={`field${errors.password ? ' has-error' : ''}`}>
                <label className="field__label" htmlFor="password">
                  รหัสผ่าน<span className="yp-required">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group__addon" aria-hidden="true">
                    <Lock className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <input
                    id="password"
                    className="yp-input"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={submitting}
                  />
                </div>
                {errors.password ? (
                  <div className="field__error">{errors.password}</div>
                ) : null}
              </div>

              <button
                type="submit"
                className="yp-btn yp-btn--primary yp-btn--block yp-btn--lg"
                style={{ marginTop: '8px' }}
                disabled={submitting}
              >
                {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
                {!submitting ? <ArrowRight className="size-4" /> : null}
              </button>
            </form>
          )}

          {/* ── v1.9: UI STATE BANNERS (rejected / not_found) ── */}
          {uiState.kind === 'rejected' ? (
            <div
              role="alert"
              style={{
                marginTop: '14px',
                padding: '14px 16px',
                borderRadius: 'var(--yp-radius-md, 12px)',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                color: '#9F1239',
                fontSize: '0.9em',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <UserX className="size-5" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>
                    คำขอสมัครถูกปฏิเสธ
                  </strong>
                  <div style={{ opacity: 0.85 }}>
                    {uiState.message}
                  </div>
                  {uiState.canResubmit ? (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="yp-btn yp-btn--primary"
                        onClick={() => {
                          // เคลียร์สถานะ rejected ใน localStorage ก่อน แล้ว redirect ไป register
                          clearRejectedAccount(uiState.studentId, uiState.email);
                          router.push('/register');
                        }}
                      >
                        ส่งคำขอใหม่
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {uiState.kind === 'not_found' ? (
            <div
              role="alert"
              style={{
                marginTop: '14px',
                padding: '14px 16px',
                borderRadius: 'var(--yp-radius-md, 12px)',
                background: 'rgba(245, 158, 11, 0.10)',
                border: '1px solid rgba(245, 158, 11, 0.30)',
                color: '#92400E',
                fontSize: '0.9em',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <AlertCircle className="size-5" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>
                    ยังไม่มีบัญชีในระบบ
                  </strong>
                  <div style={{ opacity: 0.85 }}>
                    {uiState.message}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Link href="/register" className="yp-btn yp-btn--primary">
                      ส่งคำขอสมัคร
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── REGISTER LINK ── */}
          <div className="yp-auth__alt-link">
            ยังไม่มีบัญชี?
            <Link href="/register">ส่งคำขอสมัคร</Link>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="yp-auth__footer">
          © 2026 YP Work · Demo สำหรับทดสอบแนวคิด · เชื่อมต่อ Supabase
        </div>
      </div>
    </div>
  );
}

/** อ่าน ?redirect= param จาก URL (client-side) — fallback ไป /today */
function getRedirectParam(): string {
  if (typeof window === 'undefined') return '/today';
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (!redirect) return '/today';
  // กัน open redirect — อนุญาตเฉพาะ relative path
  if (redirect.startsWith('/') && !redirect.startsWith('//')) return redirect;
  return '/today';
}
