'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Register Page
// ═══════════════════════════════════════════════════════════════
// - ใช้ .yp-login-bg (gradient + dust particles นิ่ง)
// - Type toggle: นักเรียน / ครู / อื่นๆ (3 ปุ่ม)
// - Common: ชื่อ-นามสกุล
// - Student: เลขบัตร 13 + รหัสนักเรียน 5 + ปีการศึกษา (required)
// - Teacher/Other: email + password (≥6) + ปีการศึกษา (optional)
// - หลัง submit → success state "ส่งคำขอสำเร็จ"
// - NOTE: register เป็น demo — ไม่ได้สร้าง Supabase user จริง
//   (ต้องใช้ service role key ที่ server-side — เก็บไว้ทำทีหลัง)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  User as UserIcon,
  IdCard,
  Mail,
  Lock,
  Calendar,
  ArrowLeft,
  Check,
  Send,
} from 'lucide-react';
import {
  validateNationalId,
  validateStudentCode,
  validateEmail,
  validatePassword,
} from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { RegisterAccountType } from '@/lib/types';

interface FieldErrors {
  fullName?: string;
  nationalId?: string;
  studentCode?: string;
  email?: string;
  password?: string;
  year?: string;
}

const YEAR_OPTIONS = ['2568', '2567', '2566'];

const TYPE_LABEL: Record<RegisterAccountType, string> = {
  student: 'นักเรียน',
  teacher: 'ครู',
  other: 'บุคลากร',
};

export default function RegisterPage() {
  const { toast } = useToast();

  const [accountType, setAccountType] = React.useState<RegisterAccountType>('student');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ fullName: string; type: RegisterAccountType } | null>(
    null
  );

  // form state
  const [fullName, setFullName] = React.useState('');
  const [nationalId, setNationalId] = React.useState('');
  const [studentCode, setStudentCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [year, setYear] = React.useState('');

  const [errors, setErrors] = React.useState<FieldErrors>({});

  const clearError = React.useCallback((field: keyof FieldErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNationalId(e.target.value.replace(/\D/g, '').slice(0, 13));
    clearError('nationalId');
  };

  const handleStudentCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentCode(e.target.value.replace(/\D/g, '').slice(0, 5));
    clearError('studentCode');
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    clearError('fullName');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearError('email');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    clearError('password');
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(e.target.value);
    clearError('year');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const next: FieldErrors = {};
    const name = fullName.trim();
    if (!name) next.fullName = 'กรุณากรอกชื่อ-นามสกุล';

    if (accountType === 'student') {
      if (!validateNationalId(nationalId)) next.nationalId = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
      if (!validateStudentCode(studentCode)) next.studentCode = 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก';
      if (!year) next.year = 'กรุณาเลือกปีการศึกษา';
    } else {
      if (!validateEmail(email)) next.email = 'รูปแบบอีเมลไม่ถูกต้อง';
      if (!validatePassword(password)) next.password = 'รหัสผ่านต้องไม่น้อยกว่า 6 ตัว';
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      toast({ title: 'กรุณาตรวจสอบข้อมูลที่กรอก', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    // NOTE: Demo — ไม่ได้สร้าง Supabase user จริง
    // (ต้องใช้ service role key ที่ server-side route handler — เก็บไว้ทำทีหลัง)
    setTimeout(() => {
      setSubmitting(false);
      setDone({ fullName: name, type: accountType });
      toast({ title: 'ส่งคำขอสำเร็จ — รออนุมัติจากผู้ดูแล' });
    }, 500);
  };

  const handleReset = () => {
    setDone(null);
    setFullName('');
    setNationalId('');
    setStudentCode('');
    setEmail('');
    setPassword('');
    setYear('');
    setErrors({});
  };

  const isStudent = accountType === 'student';

  return (
    <div className="yp-auth yp-login-bg">
      <div className="yp-auth__inner">
        {/* ── BRAND + BACK ── */}
        <div className="yp-auth__brand">
          <div className="yp-auth__logo" aria-hidden="true">YP</div>
          <div className="yp-auth__brand-text">
            <div className="yp-auth__brand-name">YP Work</div>
            <div className="yp-auth__brand-tag">Student Council Hub</div>
          </div>
          <Link href="/login" className="yp-auth__back">
            <ArrowLeft className="size-4" />
            กลับ
          </Link>
        </div>

        {/* ── HERO ── */}
        <div className="yp-auth__hero">
          <span className="yp-auth__demo-badge">DEMO · Supabase</span>
          <h1>ส่งคำขอสมัคร<br />บัญชีใหม่</h1>
          <p>ผู้ดูแลระบบจะตรวจสอบและอนุมัติบัญชีของคุณหลังจากส่งคำขอ</p>
        </div>

        {/* ── CARD ── */}
        <div className="yp-auth__card">
          {done ? (
            <SuccessState fullName={done.fullName} type={done.type} onReset={handleReset} />
          ) : (
            <>
              <h2 className="yp-auth__card-title">สร้างบัญชี</h2>
              <p className="yp-auth__card-sub">เลือกประเภทบัญชีและกรอกข้อมูลให้ครบ</p>

              {/* ── TYPE TOGGLE ── */}
              <div className="yp-auth__type-toggle" role="tablist" aria-label="เลือกประเภทบัญชี">
                <button
                  type="button"
                  className={`yp-auth__type-btn${accountType === 'student' ? ' is-active' : ''}`}
                  onClick={() => setAccountType('student')}
                  role="tab"
                  aria-selected={accountType === 'student'}
                >
                  <GraduationCap />
                  นักเรียน
                </button>
                <button
                  type="button"
                  className={`yp-auth__type-btn${accountType === 'teacher' ? ' is-active' : ''}`}
                  onClick={() => setAccountType('teacher')}
                  role="tab"
                  aria-selected={accountType === 'teacher'}
                >
                  <BookOpen />
                  ครู
                </button>
                <button
                  type="button"
                  className={`yp-auth__type-btn${accountType === 'other' ? ' is-active' : ''}`}
                  onClick={() => setAccountType('other')}
                  role="tab"
                  aria-selected={accountType === 'other'}
                >
                  <UserIcon />
                  อื่นๆ
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* ── COMMON: full name ── */}
                <div className={`field${errors.fullName ? ' has-error' : ''}`}>
                  <label className="field__label" htmlFor="full-name">
                    ชื่อ-นามสกุล<span className="yp-required">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group__addon" aria-hidden="true">
                      <UserIcon className="size-[18px]" strokeWidth={1.8} />
                    </span>
                    <input
                      id="full-name"
                      className="yp-input"
                      type="text"
                      placeholder="สมชาย ใจดี"
                      autoComplete="off"
                      value={fullName}
                      onChange={handleFullNameChange}
                      disabled={submitting}
                    />
                  </div>
                  {errors.fullName ? (
                    <div className="field__error">{errors.fullName}</div>
                  ) : null}
                </div>

                {/* ── STUDENT FIELDS ── */}
                {isStudent ? (
                  <>
                    <div className={`field${errors.nationalId ? ' has-error' : ''}`}>
                      <label className="field__label" htmlFor="national-id">
                        เลขบัตรประชาชน (13 หลัก)<span className="yp-required">*</span>
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
                          placeholder="1234567890123"
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

                    <div className={`field${errors.studentCode ? ' has-error' : ''}`}>
                      <label className="field__label" htmlFor="student-code">
                        รหัสนักเรียน (5 หลัก)<span className="yp-required">*</span>
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
                          placeholder="12345"
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
                  </>
                ) : (
                  <>
                    {/* ── TEACHER/OTHER FIELDS ── */}
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
                          placeholder="อย่างน้อย 6 ตัว"
                          autoComplete="new-password"
                          value={password}
                          onChange={handlePasswordChange}
                          disabled={submitting}
                        />
                      </div>
                      {errors.password ? (
                        <div className="field__error">{errors.password}</div>
                      ) : null}
                    </div>
                  </>
                )}

                {/* ── YEAR ── */}
                <div className={`field${errors.year ? ' has-error' : ''}`}>
                  <label className="field__label" htmlFor="year-select">
                    ปีการศึกษา
                    {isStudent ? <span className="yp-required">*</span> : null}
                  </label>
                  <div className="input-group">
                    <span className="input-group__addon" aria-hidden="true">
                      <Calendar className="size-[18px]" strokeWidth={1.8} />
                    </span>
                    <select
                      id="year-select"
                      className="yp-select"
                      value={year}
                      onChange={handleYearChange}
                      disabled={submitting}
                    >
                      <option value="">— เลือกปี —</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {errors.year ? <div className="field__error">{errors.year}</div> : null}
                </div>

                <button
                  type="submit"
                  className="yp-btn yp-btn--primary yp-btn--block yp-btn--lg"
                  style={{ marginTop: '8px' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    'กำลังส่งคำขอ…'
                  ) : (
                    <>
                      <Send className="size-4" />
                      ส่งคำขอสมัคร
                    </>
                  )}
                </button>
              </form>

              {/* ── LOGIN LINK ── */}
              <div className="yp-auth__alt-link">
                มีบัญชีแล้ว?
                <Link href="/login">เข้าสู่ระบบ</Link>
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="yp-auth__footer">
          © 2026 YP Work · Demo สำหรับทดสอบแนวคิด · เชื่อมต่อ Supabase
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUCCESS STATE — หลังส่งคำขอสำเร็จ
// ═══════════════════════════════════════════════════════════════
function SuccessState({
  fullName,
  type,
  onReset,
}: {
  fullName: string;
  type: RegisterAccountType;
  onReset: () => void;
}) {
  return (
    <div className="yp-auth__success">
      <div className="yp-auth__success-icon" aria-hidden="true">
        <Check />
      </div>
      <div className="yp-auth__success-title">ส่งคำขอสำเร็จ</div>
      <div className="yp-auth__success-desc">
        บัญชี{TYPE_LABEL[type]} &ldquo;<strong>{fullName}</strong>&rdquo; ถูกส่งไปยังผู้ดูแลระบบ
        <br />
        ผู้ดูแลจะตรวจสอบและอนุมัติเร็ว ๆ นี้
        <br />
        <small style={{ opacity: 0.7 }}>
          (Demo — ไม่ได้สร้าง Supabase user จริง รอ service role setup ทีหลัง)
        </small>
      </div>
      <div className="yp-auth__success-actions">
        <Link href="/login" className="yp-btn yp-btn--primary">
          เข้าสู่ระบบ
        </Link>
        <button type="button" className="yp-btn yp-btn--ghost" onClick={onReset}>
          ส่งคำขออีกครั้ง
        </button>
      </div>
    </div>
  );
}
