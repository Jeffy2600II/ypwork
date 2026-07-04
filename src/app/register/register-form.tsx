'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Register Form (client component — v1.9)
// ═══════════════════════════════════════════════════════════════
// v1.9 changes (NEW):
//   - ★ เมื่อส่งคำขอสำเร็จ → login อัตโนมัติเป็น "pending user" ★
//     ระบบจะ set pending session (localStorage) และพา user ไปยังหน้า
//     /pending-status ทันที — ไม่ต้องไปกด login เอง
//   - ผู้ใช้เห็นสถานะคำขอแบบ realtime ในหน้า /pending-status
//   - เมื่อ admin อนุมัติ → ระบบ redirect ไป /today อัตโนมัติ
//   - เมื่อ admin ปฏิเสธ → ระบบ sign out + แสดงข้อความ "ถูกปฏิเสธ"
//
// v1.8.1 changes (CRITICAL BUG FIX):
//   - ★ เพิ่ม `national_id` เข้า insert payload ของ council_join_requests ★
//     ก่อนหน้านี้ form กรอกเลขบัตรประชาชน 13 หลัก แต่ payload ไม่ได้ส่ง
//     field นี้ไปเลย → ข้อมูลเลขบัตรหายไปตั้งแต่ขั้นตอน insert
//   - ★ เปลี่ยนรายการปีการศึกษาจาก hardcoded → ดึงจาก `council_years` ★
//     ก่อนหน้านี้ใช้ YEAR_OPTIONS = ['2568','2567','2566'] ตายตัว
//     ตอนนี้ดึงจาก DB ผ่าน prop `years` (ส่งจาก server component)
//     และ subscribe Realtime ผ่าน `useRealtimeYears`
//   - ปีที่ `closed=true` จะแสดงเป็น option ที่เลือกไม่ได้ พร้อม label "(ปิดรับ)"
//
// v1.8 changes (baseline):
//   - เลิก swallow error เงียบ ๆ — ตอนนี้แสดง error จริงให้ user เห็น
//     ก่อนหน้านี้เมื่อ insert ล้มเหลว (RLS บล็อก, column หาย, ฯลฯ)
//     ระบบจะแสดง "ส่งคำขอสำเร็จ" ทั้ง ๆ ที่จริงล้มเหลว → สร้างความสับสน
//   - ตอนนี้: error จริง → toast + ข้อความ error ใต้ปุ่ม
//            สำเร็จจริง → success state เท่านั้น
//
// v1.7 changes (baseline):
//   - เพิ่ม dropdown เลือกฝ่าย (department_id) — optional
//   - เมื่อ submit → insert จริงเข้า `council_join_requests`
//     พร้อม department_id (ถ้าเลือกฝ่ายไว้)
//   - หลังส่งสำเร็จ → แสดง success state
//
// หมายเหตุ: การ insert ใช้ anon key (public RLS policy)
//   - ต้องรัน ypwork-v1.8.1-national-id-and-years-from-db.sql ก่อน
//     เพื่อเพิ่มคอลัมน์ national_id ใน council_join_requests
//     และเปิด RLS SELECT บน council_years ให้ anon อ่านได้
//   - ผู้ดูแลจะตรวจสอบและ approve ผ่าน YP Labs admin ภายหลัง
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Building2,
} from 'lucide-react';
import {
  validateNationalId,
  validateStudentCode,
  validateEmail,
  validatePassword,
} from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeDepartments, useRealtimeYears } from '@/lib/hooks/use-realtime';
import type { CouncilYear } from '@/lib/hooks/use-realtime';
import type { Department, RegisterAccountType } from '@/lib/types';
import { setPendingSession, clearRejectedAccount } from '@/lib/pending-session';

interface FieldErrors {
  fullName?: string;
  nationalId?: string;
  studentCode?: string;
  email?: string;
  password?: string;
  year?: string;
  department?: string;
}

const TYPE_LABEL: Record<RegisterAccountType, string> = {
  student: 'นักเรียน',
  teacher: 'ครู',
  other: 'บุคลากร',
};

interface RegisterFormProps {
  departments: Department[];
  // v1.8.1: รายการปีการศึกษาจาก `council_years` (ส่งจาก server component)
  years: CouncilYear[];
}

export function RegisterForm({ departments, years }: RegisterFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  // v1.8: subscribe realtime — รายการฝ่ายอัพเดตทันทีเมื่อ admin
  //       เปลี่ยนชื่อ/สี/ไอคอนฝ่าย หรือเพิ่ม/ลบฝ่าย โดยไม่ต้อง refresh
  const { departments: liveDepartments } = useRealtimeDepartments(departments);

  // v1.8.1: subscribe realtime — รายการปีการศึกษาอัพเดตทันทีเมื่อ admin
  //         เพิ่ม/ลบ/ปิดปีใน YP Labs โดยไม่ต้อง refresh
  const { years: liveYears } = useRealtimeYears(years);

  const [accountType, setAccountType] = React.useState<RegisterAccountType>('student');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{
    fullName: string;
    type: RegisterAccountType;
    departmentName: string | null;
  } | null>(null);

  // form state
  const [fullName, setFullName] = React.useState('');
  const [nationalId, setNationalId] = React.useState('');
  const [studentCode, setStudentCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [year, setYear] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');

  const [errors, setErrors] = React.useState<FieldErrors>({});

  // v1.8: เก็บ error จาก server แสดงใต้ปุ่ม submit
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const clearError = React.useCallback((field: keyof FieldErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    setSubmitError(null);
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

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartmentId(e.target.value);
    clearError('department');
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const next: FieldErrors = {};
    const name = fullName.trim();
    if (!name) next.fullName = 'กรุณากรอกชื่อ-นามสกุล';

    let synEmail = '';
    if (accountType === 'student') {
      if (!validateNationalId(nationalId)) next.nationalId = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
      if (!validateStudentCode(studentCode)) next.studentCode = 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก';
      if (!year) next.year = 'กรุณาเลือกปีการศึกษา';
      synEmail = `student_${studentCode.replace(/\D/g, '')}@yplabs.internal`;
    } else {
      if (!validateEmail(email)) next.email = 'รูปแบบอีเมลไม่ถูกต้อง';
      if (!validatePassword(password)) next.password = 'รหัสผ่านต้องไม่น้อยกว่า 6 ตัว';
      synEmail = email.trim();
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      toast({ title: 'กรุณาตรวจสอบข้อมูลที่กรอก', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // v1.8.1: insert จริงเข้า council_join_requests พร้อม national_id + department_id
      //         ★ FIX BUG: ก่อนหน้านี้ payload ไม่ได้ส่ง `national_id` เลย ★
      //         แม้ user กรอกเลขบัตร 13 หลักใน form ก็ตาม
      // v1.8: ถ้าล้มเหลว → แสดง error จริง ไม่ fallback เป็น success state อีกต่อไป
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error: insertErr } = await supabase
        .from('council_join_requests')
        .insert({
          full_name: name,
          // v1.8.1: ★ เพิ่ม national_id ใน payload ★ (student เท่านั้น)
          national_id:
            accountType === 'student' ? nationalId.replace(/\D/g, '') : '',
          student_id: accountType === 'student' ? studentCode.replace(/\D/g, '') : '',
          year: year ? parseInt(year, 10) : new Date().getFullYear() + 543,
          email: synEmail,
          account_type: accountType,
          department_id: departmentId || null,
        });

      if (insertErr) {
        // v1.8: แสดง error จริง — ไม่ใช่ demo fallback อีกต่อไป
        console.error('[register] insert failed:', insertErr.message, insertErr);

        // แปล error code ที่พบบ่อยให้เป็นข้อความที่ user เข้าใจ
        let userMessage = insertErr.message || 'ส่งคำขอไม่สำเร็จ';
        if (/row-level security policy/i.test(insertErr.message)) {
          userMessage = 'ระบบยังไม่ได้เปิดให้ส่งคำขอ — กรุณาติดต่อผู้ดูแลเพื่อรัน SQL v1.8';
        } else if (/could not find the .* department_id/i.test(insertErr.message)
          || /could not find the .* national_id/i.test(insertErr.message)) {
          userMessage = 'ฐานข้อมูลยังไม่ได้อัปเกรด — กรุณาบอกผู้ดูแลให้รัน ypwork-v1.8.1-national-id-and-years-from-db.sql';
        } else if (/duplicate key/i.test(insertErr.message)) {
          userMessage = 'อีเมลหรือรหัสนักเรียนนี้ส่งคำขอไปแล้ว รอผู้ดูแลอนุมัติ';
        }

        setSubmitError(userMessage);
        toast({
          title: 'ส่งคำขอไม่สำเร็จ',
          description: userMessage,
          variant: 'destructive',
        });
        return; // ★ หยุด — ไม่เข้า success state
      }

      // insert สำเร็จจริง ๆ → แสดง success state
      const deptName =
        liveDepartments.find((d) => d.id === departmentId)?.name ?? null;

      // v1.9: ★ Auto-login เป็น pending user ★
      //   ไม่ต้องให้ user ไปกด login เอง — ระบบจะ set pending session
      //   และพาไปหน้า /pending-status ทันที ตาม requirement ของ user
      //   "เมื่อส่งคำขอเสร็จปั๊บระบบจะทำการ login ให้อัตโนมัติเลย"
      const cleanStudentCode = studentCode.replace(/\D/g, '');
      const cleanNationalId = nationalId.replace(/\D/g, '');

      // เคลียร์สถานะ rejected เดิม (ถ้าเคยถูกปฏิเสธแล้วส่งคำขอใหม่)
      if (accountType === 'student') {
        clearRejectedAccount(cleanStudentCode, synEmail);
      } else {
        clearRejectedAccount(null, synEmail);
      }

      setPendingSession({
        student_id: accountType === 'student' ? cleanStudentCode : null,
        email: synEmail,
        national_id: accountType === 'student' ? cleanNationalId : null,
        full_name: name,
        account_type: accountType,
        submitted_at: new Date().toISOString(),
      });

      // แสดง success state สั้น ๆ แล้ว redirect ไป /pending-status
      setDone({ fullName: name, type: accountType, departmentName: deptName });
      toast({ title: 'ส่งคำขอสำเร็จ — กำลังนำคุณไปยังหน้าสถานะ...' });

      // redirect หลังจาก 800ms (ให้ user เห็น success state ก่อน)
      setTimeout(() => {
        router.replace('/pending-status');
      }, 800);
    } catch (err: any) {
      // v1.8: แสดง error จริง — ไม่ใช่ demo fallback อีกต่อไป
      console.error('[register] unexpected error:', err);
      const userMessage =
        err?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองอีกครั้ง';
      setSubmitError(userMessage);
      toast({
        title: 'ส่งคำขอไม่สำเร็จ',
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDone(null);
    setFullName('');
    setNationalId('');
    setStudentCode('');
    setEmail('');
    setPassword('');
    setYear('');
    setDepartmentId('');
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
            <SuccessState
              fullName={done.fullName}
              type={done.type}
              departmentName={done.departmentName}
              onReset={handleReset}
            />
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

                {/* ── YEAR (v1.8.1 — ดึงจาก council_years แทน hardcoded) ── */}
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
                      {liveYears.length === 0 ? (
                        <option value="">
                          ยังไม่มีปีในระบบ — ติดต่อผู้ดูแล
                        </option>
                      ) : (
                        liveYears.map((y) => (
                          <option
                            key={y.year}
                            value={String(y.year)}
                            disabled={y.closed}
                          >
                            {y.year}{y.closed ? ' (ปิดรับ)' : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {liveYears.length === 0 ? (
                    <div
                      style={{
                        fontSize: '0.85em',
                        color: 'var(--yp-text-muted)',
                        marginTop: '4px',
                      }}
                    >
                      ยังไม่มีปีการศึกษาในระบบ — ผู้ดูแลต้องเพิ่มปี
                      ในตาราง <code>council_years</code> ก่อน
                    </div>
                  ) : null}
                  {errors.year ? <div className="field__error">{errors.year}</div> : null}
                </div>

                {/* ── DEPARTMENT (v1.7 — optional) ── */}
                <div className={`field${errors.department ? ' has-error' : ''}`}>
                  <label className="field__label" htmlFor="department-select">
                    ฝ่ายงาน
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '0.85em',
                        color: 'var(--yp-text-muted)',
                        fontWeight: 400,
                      }}
                    >
                      (ถ้ารู้ว่าจะสังกัดฝ่ายไหน)
                    </span>
                  </label>
                  <div className="input-group">
                    <span className="input-group__addon" aria-hidden="true">
                      <Building2 className="size-[18px]" strokeWidth={1.8} />
                    </span>
                    <select
                      id="department-select"
                      className="yp-select"
                      value={departmentId}
                      onChange={handleDepartmentChange}
                      disabled={submitting || liveDepartments.length === 0}
                    >
                      <option value="">— ยังไม่ระบุฝ่าย —</option>
                      {liveDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.icon} {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {liveDepartments.length === 0 ? (
                    <div
                      style={{
                        fontSize: '0.85em',
                        color: 'var(--yp-text-muted)',
                        marginTop: '4px',
                      }}
                    >
                      ยังไม่มีฝ่ายในระบบ — สามารถข้ามไปก่อนและเลือกภายหลังได้
                    </div>
                  ) : null}
                  {errors.department ? (
                    <div className="field__error">{errors.department}</div>
                  ) : null}
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

                {/* v1.8: แสดง error จาก server ใต้ปุ่ม submit */}
                {submitError ? (
                  <div
                    role="alert"
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--yp-radius-md, 12px)',
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: 'var(--yp-rose-600, #E11D48)',
                      fontSize: '0.85em',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '2px' }}>
                      ⚠ ส่งคำขอไม่สำเร็จ
                    </strong>
                    {submitError}
                  </div>
                ) : null}
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
// SUCCESS STATE — หลังส่งคำขอสำเร็จ (v1.9: auto-redirect ไป /pending-status)
// ═══════════════════════════════════════════════════════════════
function SuccessState({
  fullName,
  type,
  departmentName,
  onReset,
}: {
  fullName: string;
  type: RegisterAccountType;
  departmentName: string | null;
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
        {departmentName ? (
          <>
            <br />
            สังกัด <strong>{departmentName}</strong>
          </>
        ) : null}
        <br />
        กำลังนำคุณไปยังหน้าสถานะคำขอ...
      </div>
      <div className="yp-auth__success-actions">
        <Link href="/pending-status" className="yp-btn yp-btn--primary">
          ไปหน้าสถานะ
        </Link>
        <button type="button" className="yp-btn yp-btn--ghost" onClick={onReset}>
          ส่งคำขออีกครั้ง
        </button>
      </div>
    </div>
  );
}
