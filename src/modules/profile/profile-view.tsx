'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Profile View (client component — v1.8.2 realtime)
// v1.5: เปลี่ยน logout confirmation จาก custom dialog → BottomSheet
// v1.8: subscribe realtime — stats และ department อัพเดตทันทีเมื่อ DB เปลี่ยน
//       (เช่น admin เปลี่ยนฝ่ายของ user, task status เปลี่ยน, assignee เปลี่ยน)
// v1.8.2: เพิ่ม useRealtimeSessionUser — ชื่อ/สี/ฝ่าย ของ user อัพเดต live
//         (admin เปลี่ยนชื่อ หรือย้ายฝ่าย ผู้ใช้เห็นทันทีในหน้าโปรไฟล์)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Settings,
  LogOut,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import type { SessionUser, Department } from '@/lib/types';
import { Avatar } from '@/components/framework/avatar';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { logout } from '@/lib/auth/logout';
import { createClient } from '@/lib/supabase/client';
import {
  useRealtimeProfileStats,
  useRealtimeDepartments,
  useRealtimeSessionUser,
  type ProfileStats,
} from '@/lib/hooks/use-realtime';

export interface ProfileViewProps {
  user: SessionUser;
  department: Department | null;
  stats: ProfileStats;
}

export function ProfileView({ user: initialUser, department, stats }: ProfileViewProps) {
  const router = useRouter();
  const [idRevealed, setIdRevealed] = React.useState(false);
  const [codeRevealed, setCodeRevealed] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

  // v1.8.2: subscribe realtime — ชื่อ/สี/ฝ่าย ของ user อัพเดต live
  //   ถ้า admin เปลี่ยนชื่อ หรือย้ายฝ่าย หน้าโปรไฟล์จะอัพเดตทันที
  const { user } = useRealtimeSessionUser(initialUser);

  // v1.8: subscribe realtime — stats อัพเดตทันทีเมื่อ tasks/assignees/events
  //       ของ user เปลี่ยน หรือเมื่อ profile ของตัวเองถูกแก้
  const { stats: liveStats } = useRealtimeProfileStats(
    user.auth_uid,
    user.department_id,
    stats
  );

  // v1.8: subscribe departments — เมื่อฝ่ายถูกเปลี่ยนชื่อ/สี/ไอคอน
  //       หน้าโปรไฟล์จะแสดงข้อมูลล่าสุดทันที
  const initialDepts: Department[] = department ? [department] : [];
  const { departments: liveDepts } = useRealtimeDepartments(initialDepts);
  const liveDepartment = user.department_id
    ? liveDepts.find((d) => d.id === user.department_id) || department
    : department;

  const accent = user.color || '#4F46E5';
  const roleLabel = formatRoleLabel(user.role, user.account_type);

  const maskedId = maskId(user.national_id);
  const formattedId = formatId(user.national_id);
  const maskedCode = maskCode(user.student_id);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await logout(supabase);
      router.push('/login');
      router.refresh();
    } catch (e) {
      // ถึงแม้จะ error ก็ redirect ไป /login อยู่ดี
      router.push('/login');
    }
  };

  return (
    <div
      className="yp-page yp-profile-page yp-page-enter"
      style={{ ['--accent' as string]: accent }}
    >
      {/* ── HERO ── */}
      <section className="yp-profile-hero yp-hero-enter" aria-labelledby="profile-hero-title">
        <div className="yp-profile-hero__glow" aria-hidden="true" />
        <div className="yp-profile-hero__avatar" aria-hidden="true">
          <Avatar
            name={user.full_name}
            color={accent}
            size={96}
          />
        </div>
        <h1 id="profile-hero-title" className="yp-profile-hero__name">
          {user.full_name}
        </h1>
        <p className="yp-profile-hero__role">
          {roleLabel}
          {liveDepartment ? ` · ${liveDepartment.name}` : ''}
        </p>
        {liveDepartment ? (
          <span className="yp-profile-hero__chip">
            <span aria-hidden="true">{liveDepartment.icon || '◎'}</span>
            {liveDepartment.name}
          </span>
        ) : null}
      </section>

      {/* ── STATS ── */}
      <section className="yp-profile-stats" aria-label="สรุปภาพรวม">
        <div className="yp-profile-stat">
          <span className="yp-profile-stat__value">{liveStats.deptEvents}</span>
          <span className="yp-profile-stat__label">งานในฝ่าย</span>
        </div>
        <div className="yp-profile-stat">
          <span className="yp-profile-stat__value">{liveStats.myTasks}</span>
          <span className="yp-profile-stat__label">Task รับผิดชอบ</span>
        </div>
        <div className="yp-profile-stat yp-profile-stat--success">
          <span className="yp-profile-stat__value">{liveStats.myDone}</span>
          <span className="yp-profile-stat__label">ทำเสร็จ</span>
        </div>
        <div className="yp-profile-stat yp-profile-stat--warning">
          <span className="yp-profile-stat__value">{liveStats.myPending}</span>
          <span className="yp-profile-stat__label">ค้างทำ</span>
        </div>
      </section>

      {/* ── PROGRESS ── */}
      {liveStats.myTasks > 0 ? (
        <section className="yp-profile-progress" aria-label="อัตราความคืบหน้า">
          <div className="yp-profile-progress__head">
            <span className="yp-profile-progress__label">อัตราความคืบหน้า</span>
            <span className="yp-profile-progress__pct">
              {liveStats.completionRate}%
            </span>
          </div>
          <div
            className="yp-progress"
            role="progressbar"
            aria-valuenow={liveStats.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="yp-progress__fill"
              style={{ width: `${liveStats.completionRate}%` }}
            />
          </div>
        </section>
      ) : null}

      {/* ── ACCOUNT INFO ── */}
      <section
        className="yp-profile-section"
        aria-labelledby="profile-info-title"
      >
        <header className="yp-profile-section__head">
          <span className="yp-profile-section__icon" aria-hidden="true">
            <UserIcon />
          </span>
          <h2 id="profile-info-title" className="yp-profile-section__title">
            ข้อมูลบัญชี
          </h2>
        </header>
        <div className="yp-profile-section__body">
          <dl className="yp-profile-info">
            <div className="yp-profile-info__row">
              <dt className="yp-profile-info__label">ชื่อ-นามสกุล</dt>
              <dd className="yp-profile-info__value">{user.full_name}</dd>
            </div>
            <div className="yp-profile-info__row">
              <dt className="yp-profile-info__label">บทบาท</dt>
              <dd className="yp-profile-info__value">{roleLabel}</dd>
            </div>
            <div className="yp-profile-info__row">
              <dt className="yp-profile-info__label">ฝ่าย</dt>
              <dd className="yp-profile-info__value">
                {liveDepartment?.name || '-'}
              </dd>
            </div>

            {user.national_id ? (
              <div className="yp-profile-info__row">
                <dt className="yp-profile-info__label">เลขบัตรประชาชน</dt>
                <dd className="yp-profile-info__value">
                  <span className="yp-profile-id">
                    <span className="yp-profile-id__value">
                      {idRevealed ? formattedId : maskedId}
                    </span>
                    <button
                      type="button"
                      className="yp-profile-id__reveal"
                      onClick={() => setIdRevealed((v) => !v)}
                      aria-label={idRevealed ? 'ซ่อนเลขบัตร' : 'แสดงเลขบัตร'}
                    >
                      {idRevealed ? <EyeOff /> : <Eye />}
                    </button>
                  </span>
                </dd>
              </div>
            ) : null}

            {user.student_id ? (
              <div className="yp-profile-info__row">
                <dt className="yp-profile-info__label">รหัสนักเรียน</dt>
                <dd className="yp-profile-info__value">
                  <span className="yp-profile-id">
                    <span className="yp-profile-id__value">
                      {codeRevealed ? user.student_id : maskedCode}
                    </span>
                    <button
                      type="button"
                      className="yp-profile-id__reveal"
                      onClick={() => setCodeRevealed((v) => !v)}
                      aria-label={codeRevealed ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                    >
                      {codeRevealed ? <EyeOff /> : <Eye />}
                    </button>
                  </span>
                </dd>
              </div>
            ) : null}

            {user.email ? (
              <div className="yp-profile-info__row">
                <dt className="yp-profile-info__label">อีเมล</dt>
                <dd className="yp-profile-info__value">{user.email}</dd>
              </div>
            ) : null}

            {user.year ? (
              <div className="yp-profile-info__row">
                <dt className="yp-profile-info__label">ปีการศึกษา</dt>
                <dd className="yp-profile-info__value">{user.year}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {/* ── SETTINGS & ACTIONS ── */}
      <section
        className="yp-profile-section"
        aria-labelledby="profile-settings-title"
      >
        <header className="yp-profile-section__head">
          <span className="yp-profile-section__icon" aria-hidden="true">
            <Settings />
          </span>
          <h2 id="profile-settings-title" className="yp-profile-section__title">
            การตั้งค่า & การจัดการ
          </h2>
        </header>
        <div className="yp-profile-section__body yp-profile-actions">
          <button
            type="button"
            className="yp-profile-action"
            onClick={() => router.push('/about')}
          >
            <span className="yp-profile-action__icon" aria-hidden="true">
              <Info />
            </span>
            <span className="yp-profile-action__text">
              <strong>เกี่ยวกับ YP Work</strong>
              <small>ระบบจัดการงานสภานักเรียน</small>
            </span>
            <span className="yp-profile-action__chevron" aria-hidden="true">
              <ChevronRight />
            </span>
          </button>

          <button
            type="button"
            className="yp-profile-action yp-profile-action--danger"
            onClick={() => setShowLogoutDialog(true)}
            disabled={loggingOut}
          >
            <span className="yp-profile-action__icon" aria-hidden="true">
              <LogOut />
            </span>
            <span className="yp-profile-action__text">
              <strong>{loggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}</strong>
              <small>กลับสู่หน้าเข้าสู่ระบบ</small>
            </span>
            <span className="yp-profile-action__chevron" aria-hidden="true">
              <ChevronRight />
            </span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="yp-profile-footer">
        <p>YP Work · สมองของสภานักเรียน</p>
        <p>สร้างด้วย Next.js 16 + Supabase · Indigo Trust theme</p>
      </footer>

      {/* ── LOGOUT CONFIRM SHEET (v1.5 — BottomSheet เหมือน demo) ── */}
      <BottomSheet
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        title="ออกจากระบบ?"
        footer={
          <div className="yp-form-actions">
            <button
              type="button"
              className="yp-btn yp-btn--ghost yp-btn--block"
              onClick={() => setShowLogoutDialog(false)}
              disabled={loggingOut}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="yp-btn yp-btn--danger yp-btn--block"
              onClick={() => {
                setShowLogoutDialog(false);
                handleLogout();
              }}
              disabled={loggingOut}
            >
              {loggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
            </button>
          </div>
        }
      >
        <div className="yp-confirm-body">
          <div className="yp-confirm-body__icon yp-confirm-body__icon--warning">
            <AlertTriangle width={20} height={20} />
          </div>
          <div className="yp-confirm-body__text">
            คุณจะกลับสู่<strong>หน้าเข้าสู่ระบบ</strong> — เซสชันปัจจุบันจะถูกปิด
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

/* ── Helpers ── */

function formatRoleLabel(role: string, accountType: string): string {
  if (accountType === 'teacher') return 'ครูที่ปรึกษา';
  if (accountType === 'other') return 'บุคลากร';
  // student
  const r = (role || '').toLowerCase();
  if (r.includes('president') || r.includes('ประธาน')) return 'ประธานสภานักเรียน';
  if (r.includes('vice') || r.includes('รอง')) return 'รองประธานสภานักเรียน';
  if (r.includes('secret') || r.includes('เลขา')) return 'เลขานุการ';
  if (r.includes('leader') || r.includes('หัวหน้า')) return 'หัวหน้าฝ่าย';
  if (r.includes('member') || r.includes('สมาชิก')) return 'สมาชิกสภานักเรียน';
  return role || 'สมาชิกสภานักเรียน';
}

function maskId(s: string | null): string {
  if (!s) return '';
  return '•-••••-•••••-••-•';
}

function maskCode(s: string | null): string {
  if (!s) return '';
  return '•••••';
}

function formatId(s: string | null): string {
  if (!s) return '';
  const clean = s.replace(/\D/g, '');
  if (clean.length !== 13) return s;
  return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12, 13)}`;
}
