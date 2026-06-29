'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Profile View (client component — logout + masked IDs)
// v1.4: เพิ่ม confirm dialog ก่อน logout (เหมือน demo v8.2)
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
} from 'lucide-react';
import type { SessionUser, Department } from '@/lib/types';
import { Avatar } from '@/components/framework/avatar';
import { logout } from '@/lib/auth/logout';
import { createClient } from '@/lib/supabase/client';

export interface ProfileViewProps {
  user: SessionUser;
  department: Department | null;
  stats: {
    deptEvents: number;
    myTasks: number;
    myDone: number;
    myPending: number;
    completionRate: number;
  };
}

export function ProfileView({ user, department, stats }: ProfileViewProps) {
  const router = useRouter();
  const [idRevealed, setIdRevealed] = React.useState(false);
  const [codeRevealed, setCodeRevealed] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

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
          {department ? ` · ${department.name}` : ''}
        </p>
        {department ? (
          <span className="yp-profile-hero__chip">
            <span aria-hidden="true">{department.icon || '◎'}</span>
            {department.name}
          </span>
        ) : null}
      </section>

      {/* ── STATS ── */}
      <section className="yp-profile-stats" aria-label="สรุปภาพรวม">
        <div className="yp-profile-stat">
          <span className="yp-profile-stat__value">{stats.deptEvents}</span>
          <span className="yp-profile-stat__label">งานในฝ่าย</span>
        </div>
        <div className="yp-profile-stat">
          <span className="yp-profile-stat__value">{stats.myTasks}</span>
          <span className="yp-profile-stat__label">Task รับผิดชอบ</span>
        </div>
        <div className="yp-profile-stat yp-profile-stat--success">
          <span className="yp-profile-stat__value">{stats.myDone}</span>
          <span className="yp-profile-stat__label">ทำเสร็จ</span>
        </div>
        <div className="yp-profile-stat yp-profile-stat--warning">
          <span className="yp-profile-stat__value">{stats.myPending}</span>
          <span className="yp-profile-stat__label">ค้างทำ</span>
        </div>
      </section>

      {/* ── PROGRESS ── */}
      {stats.myTasks > 0 ? (
        <section className="yp-profile-progress" aria-label="อัตราความคืบหน้า">
          <div className="yp-profile-progress__head">
            <span className="yp-profile-progress__label">อัตราความคืบหน้า</span>
            <span className="yp-profile-progress__pct">
              {stats.completionRate}%
            </span>
          </div>
          <div
            className="yp-progress"
            role="progressbar"
            aria-valuenow={stats.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="yp-progress__fill"
              style={{ width: `${stats.completionRate}%` }}
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
                {department?.name || '-'}
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

      {/* ── LOGOUT CONFIRM DIALOG (v1.4 — เหมือน demo v8.2) ── */}
      {showLogoutDialog ? (
        <div className="yp-confirm-overlay" onClick={() => setShowLogoutDialog(false)}>
          <div
            className="yp-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-desc"
          >
            <h3 id="logout-dialog-title" className="yp-confirm-dialog__title">
              ออกจากระบบ?
            </h3>
            <p id="logout-dialog-desc" className="yp-confirm-dialog__message">
              คุณจะกลับสู่หน้าเข้าสู่ระบบ
            </p>
            <div className="yp-confirm-dialog__actions">
              <button
                type="button"
                className="yp-confirm-dialog__btn yp-confirm-dialog__btn--cancel"
                onClick={() => setShowLogoutDialog(false)}
                disabled={loggingOut}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="yp-confirm-dialog__btn yp-confirm-dialog__btn--danger"
                onClick={() => {
                  setShowLogoutDialog(false);
                  handleLogout();
                }}
                disabled={loggingOut}
              >
                {loggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
