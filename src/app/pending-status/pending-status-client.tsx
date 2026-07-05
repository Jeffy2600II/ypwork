'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Pending Status Client (v1.9.2 — FIXED)
// ═══════════════════════════════════════════════════════════════
// แสดงสถานะคำขอสมัครแบบ realtime:
//   - อ่าน pending session จาก localStorage
//   - ถ้าไม่มี pending session → redirect ไป /login
//   - subscribe council_join_requests + council_users ผ่าน useRealtimePendingRequest
//   - status='pending' → แสดงข้อมูลคำขอ + animation รอ
//   - status='approved' → เคลียร์ pending session + redirect ไป /today
//   - status='rejected' → เคลียร์ pending session + mark rejected + แสดงข้อความ
//   - status='unknown' → แสดงข้อความให้ login ใหม่ (สำหรับครู/อื่นๆ)
//
// ★ v1.9.2 CRITICAL FIX:
//   ก่อนหน้านี้ เมื่อ status='rejected' ระบบจะเรียก addRejectedAccount()
//   ทันที → บันทึกลง localStorage → login ครั้งต่อไปเห็น isRejected=true
//   → คืน 'rejected' ทันทีโดยไม่ตรวจตาราง
//
//   แต่บางครั้ง status='rejected' เกิดจาก RLS บล็อกการ SELECT ไม่ใช่
//   การถูกปฏิเสธจริง → ทำให้ user ที่ยัง pending ถูก mark เป็น rejected ผิด ๆ
//
//   ตอนนี้ useRealtimePendingRequest ใช้ server API (service role)
//   ถ้าหาก status='rejected' จะเป็นการยืนยันจาก server แล้วว่าไม่มี row
//   จึงสามารถ mark rejected ได้อย่างปลอดภัย
//
//   สำหรับ status='unknown' (API error หรือ server ไม่พร้อม) →
//   ไม่ mark rejected, ไม่ redirect, แค่แสดงให้ user ลองใหม่
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LogOut,
  ArrowRight,
  Hourglass,
} from 'lucide-react';
import {
  getPendingSession,
  clearPendingSession,
  addRejectedAccount,
} from '@/lib/pending-session';
import { useRealtimePendingRequest } from '@/lib/hooks/use-realtime';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DisplayMode = 'loading' | 'pending' | 'approved' | 'rejected' | 'unknown' | 'no_session';

export function PendingStatusClient() {
  const router = useRouter();
  const { toast } = useToast();

  // อ่าน pending session เก็บไว้ใน state — ใช้ใน render และ hook
  const [session, setSession] = React.useState(() => getPendingSession());
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('loading');

  // ถ้าไม่มี pending session → redirect ไป /login (ใน useEffect)
  React.useEffect(() => {
    const pending = getPendingSession();
    if (!pending) {
      router.replace('/login');
      return;
    }
    setSession(pending);
    setDisplayMode('pending');
  }, [router]);

  // subscribe realtime — รอการอนุมัติ/ปฏิเสธ
  const { status, request, loading, error } = useRealtimePendingRequest({
    studentId: session?.student_id ?? null,
    email: session?.email ?? null,
    accountType: session?.account_type ?? 'student',
    nationalId: session?.national_id ?? null,
  });

  // เมื่อ status เปลี่ยน → จัดการตามสถานะ
  React.useEffect(() => {
    if (loading || !session) return;

    if (status === 'approved') {
      // อนุมัติแล้ว — เคลียร์ pending session + redirect ไป /today
      setDisplayMode('approved');
      clearPendingSession();
      toast({
        title: 'อนุมัติแล้ว! 🎉',
        description: 'กำลังนำคุณเข้าสู่ระบบ...',
      });
      setTimeout(() => {
        router.replace('/today');
      }, 1200);
    } else if (status === 'rejected') {
      // ปฏิเสธ — mark rejected + sign out + เคลียร์ pending session
      setDisplayMode('rejected');
      addRejectedAccount({
        student_id: session.student_id,
        email: session.email,
        rejected_at: new Date().toISOString(),
      });
      // sign out (defensive — user ยังไม่ได้ login จริง แต่เผื่อไว้)
      try {
        const supabase = createClient();
        supabase.auth.signOut();
      } catch {
        // ignore
      }
      clearPendingSession();
      toast({
        title: 'คำขอถูกปฏิเสธ',
        description: 'คุณสามารถส่งคำขอใหม่ได้หากต้องการ',
        variant: 'destructive',
      });
    } else if (status === 'unknown') {
      // ไม่สามารถตรวจสอบได้ (ครู/อื่นๆ) — ให้ user login ด้วยตัวเอง
      setDisplayMode('unknown');
    } else if (status === 'pending') {
      setDisplayMode('pending');
    }
  }, [status, loading, session, router, toast]);

  // ── Render ──

  // Loading state — กำลังอ่าน pending session หรือ realtime status
  if (displayMode === 'loading' || !session) {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
            <div className="yp-auth__logo" aria-hidden="true">YP</div>
            <div className="yp-auth__brand-text">
              <div className="yp-auth__brand-name">YP Work</div>
              <div className="yp-auth__brand-tag">Student Council Hub</div>
            </div>
          </div>
          <div className="yp-auth__card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '14px', color: 'var(--yp-text-muted)' }}>
              กำลังโหลด...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Approved state — อนุมัติแล้ว กำลัง redirect
  if (displayMode === 'approved') {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
            <div className="yp-auth__logo" aria-hidden="true">YP</div>
            <div className="yp-auth__brand-text">
              <div className="yp-auth__brand-name">YP Work</div>
              <div className="yp-auth__brand-tag">Student Council Hub</div>
            </div>
          </div>
          <div className="yp-auth__card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid rgba(16, 185, 129, 0.30)',
              }}
            >
              <CheckCircle2 className="size-9" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--yp-text-strong)', marginBottom: '6px' }}>
              คำขอได้รับการอนุมัติ
            </div>
            <div style={{ fontSize: '14px', color: 'var(--yp-text-muted)' }}>
              กำลังนำคุณเข้าสู่ระบบ...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rejected state — ปฏิเสธแล้ว
  if (displayMode === 'rejected') {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
            <div className="yp-auth__logo" aria-hidden="true">YP</div>
            <div className="yp-auth__brand-text">
              <div className="yp-auth__brand-name">YP Work</div>
              <div className="yp-auth__brand-tag">Student Council Hub</div>
            </div>
          </div>
          <div className="yp-auth__hero">
            <span className="yp-auth__demo-badge">v1.9.2 · Status</span>
            <h1>คำขอสมัคร<br />ถูกปฏิเสธ</h1>
            <p>ผู้ดูแลระบบได้ปฏิเสธคำขอสมัครของคุณ</p>
          </div>
          <div className="yp-auth__card">
            <div
              style={{
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.10)',
                  color: '#E11D48',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(244, 63, 94, 0.30)',
                }}
              >
                <XCircle className="size-9" strokeWidth={2.2} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--yp-text-strong)', marginBottom: '6px' }}>
                ถูกปฏิเสธ
              </div>
              <div style={{ fontSize: '14px', color: 'var(--yp-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                คำขอสมัครของ &ldquo;<strong>{session.full_name}</strong>&rdquo;
                ถูกปฏิเสธโดยผู้ดูแลระบบ
                <br />
                หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล หรือส่งคำขอใหม่
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/register" className="yp-btn yp-btn--primary">
                  ส่งคำขอใหม่
                </Link>
                <Link href="/login" className="yp-btn yp-btn--ghost">
                  กลับหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </div>
          </div>
          <div className="yp-auth__footer">
            © 2026 YP Work · Demo สำหรับทดสอบแนวคิด · เชื่อมต่อ Supabase
          </div>
        </div>
      </div>
    );
  }

  // Unknown state — สำหรับครู/อื่นๆ ที่เราไม่สามารถตรวจสอบได้
  if (displayMode === 'unknown') {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
            <div className="yp-auth__logo" aria-hidden="true">YP</div>
            <div className="yp-auth__brand-text">
              <div className="yp-auth__brand-name">YP Work</div>
              <div className="yp-auth__brand-tag">Student Council Hub</div>
            </div>
          </div>
          <div className="yp-auth__hero">
            <span className="yp-auth__demo-badge">v1.9.2 · Status</span>
            <h1>กรุณาเข้าสู่ระบบ<br />อีกครั้ง</h1>
            <p>ไม่สามารถตรวจสอบสถานะอัตโนมัติได้ — กรุณา login ด้วยตัวเอง</p>
          </div>
          <div className="yp-auth__card">
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.10)',
                  color: '#F59E0B',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(245, 158, 11, 0.30)',
                }}
              >
                <HelpCircle className="size-9" strokeWidth={2.2} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--yp-text-strong)', marginBottom: '6px' }}>
                ตรวจสอบสถานะด้วยตัวเอง
              </div>
              <div style={{ fontSize: '14px', color: 'var(--yp-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                ระบบไม่สามารถตรวจสอบสถานะคำขอของคุณได้อัตโนมัติ
                <br />
                กรุณา login ด้วยตัวเอง — ถ้าคำขอได้รับการอนุมัติ คุณจะเข้าสู่ระบบได้ปกติ
                <br />
                ถ้าคำขอถูกปฏิเสธ ระบบจะแจ้งให้ทราบ
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/login" className="yp-btn yp-btn--primary">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className="yp-btn yp-btn--ghost">
                  ส่งคำขอใหม่
                </Link>
              </div>
            </div>
          </div>
          <div className="yp-auth__footer">
            © 2026 YP Work · Demo สำหรับทดสอบแนวคิด · เชื่อมต่อ Supabase
          </div>
        </div>
      </div>
    );
  }

  // Default — pending state (กำลังรออนุมัติ)
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
          <span className="yp-auth__demo-badge">v1.9.2 · Pending Status</span>
          <h1>รอผู้ดูแล<br />อนุมัติ</h1>
          <p>คำขอของคุณถูกส่งเรียบร้อย — หน้านี้จะอัพเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง</p>
        </div>

        {/* ── CARD ── */}
        <div className="yp-auth__card">
          {/* ── STATUS ICON (animated) ── */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 14px',
                borderRadius: '50%',
                background: 'rgba(79, 70, 229, 0.10)',
                color: '#4F46E5',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                position: 'relative',
              }}
            >
              <Hourglass
                className="size-9"
                strokeWidth={2.2}
                style={{
                  animation: 'yp-pending-spin 3s ease-in-out infinite',
                }}
              />
            </div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--yp-text-strong)', marginBottom: '4px' }}>
              กำลังรออนุมัติ
            </div>
            <div style={{ fontSize: '13px', color: 'var(--yp-text-muted)' }}>
              สถานะอัพเดตแบบเรียลไทม์ — ไม่ต้อง refresh
            </div>
          </div>

          {/* ── REQUEST INFO ── */}
          <div
            style={{
              background: 'var(--yp-bg-card-soft, #F9FAFB)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px',
              border: '1px solid var(--yp-border-subtle, #E5E7EB)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--yp-text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ข้อมูลคำขอ
            </div>
            <InfoRow label="ชื่อ-นามสกุล" value={request?.full_name || session.full_name} />
            {session.student_id ? (
              <InfoRow label="รหัสนักเรียน" value={session.student_id} />
            ) : null}
            {session.email ? (
              <InfoRow label="อีเมล" value={session.email} />
            ) : null}
            <InfoRow
              label="ประเภทบัญชี"
              value={
                session.account_type === 'student'
                  ? 'นักเรียน'
                  : session.account_type === 'teacher'
                  ? 'ครู'
                  : 'บุคลากร'
              }
            />
            <InfoRow
              label="ส่งเมื่อ"
              value={formatDate(request?.submitted_at || session.submitted_at)}
            />
            <InfoRow
              label="สถานะปัจจุบัน"
              value={
                <span
                  style={{
                    color: '#4F46E5',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Clock className="size-3.5" strokeWidth={2} />
                  รออนุมัติ
                </span>
              }
            />
          </div>

          {/* ── WHAT HAPPENS NEXT ── */}
          <div
            style={{
              fontSize: '13px',
              color: 'var(--yp-text-muted)',
              lineHeight: 1.6,
              marginBottom: '16px',
              padding: '12px 14px',
              background: 'rgba(79, 70, 229, 0.04)',
              borderRadius: '10px',
              border: '1px solid rgba(79, 70, 229, 0.10)',
            }}
          >
            <strong style={{ color: 'var(--yp-text-body)', display: 'block', marginBottom: '4px' }}>
              เกิดอะไรขึ้นต่อ?
            </strong>
            เมื่อผู้ดูแลอนุมัติคำขอ ระบบจะพาคุณเข้าสู่ระบบโดยอัตโนมัติ
            หากคำขอถูกปฏิเสธ ระบบจะแจ้งให้ทราบทันที
          </div>

          {error ? (
            <div
              style={{
                fontSize: '12px',
                color: '#BE123C',
                marginBottom: '12px',
                padding: '8px 10px',
                background: 'rgba(244, 63, 94, 0.06)',
                borderRadius: '8px',
              }}
            >
              ⚠ {error}
            </div>
          ) : null}

          {/* ── ACTIONS ── */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="yp-btn yp-btn--ghost"
              style={{ flex: 1, minWidth: '140px' }}
              onClick={async () => {
                // sign out + clear pending session + redirect ไป /login
                try {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                } catch {
                  // ignore
                }
                clearPendingSession();
                toast({ title: 'ออกจากระบบแล้ว' });
                router.replace('/login');
              }}
            >
              <LogOut className="size-4" />
              ออกจากระบบ
            </button>
            <Link
              href="/login"
              className="yp-btn yp-btn--ghost"
              style={{ flex: 1, minWidth: '140px', textDecoration: 'none' }}
            >
              ไปหน้าเข้าสู่ระบบ
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="yp-auth__footer">
          © 2026 YP Work · Demo สำหรับทดสอบแนวคิด · เชื่อมต่อ Supabase
        </div>

        {/* ── inline animation styles ── */}
        <style>{`
          @keyframes yp-pending-spin {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        fontSize: '13px',
        borderBottom: '1px solid var(--yp-border-subtle, #F3F4F6)',
      }}
    >
      <span style={{ color: 'var(--yp-text-muted)' }}>{label}</span>
      <span
        style={{
          color: 'var(--yp-text-body)',
          fontWeight: 500,
          textAlign: 'right',
          maxWidth: '60%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
