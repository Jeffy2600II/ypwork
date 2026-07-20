'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Pending Status Client (v2.1.0 — InfoButton docs / v1.9.3 — Auto sign-in on approval)
// ═══════════════════════════════════════════════════════════════
// แสดงสถานะการลงทะเบียนแบบ realtime:
//   - อ่าน pending session จาก localStorage
//   - ถ้าไม่มี pending session → redirect ไป /login
//   - subscribe council_join_requests + council_users ผ่าน useRealtimePendingRequest
//   - status='pending' → แสดงข้อมูลการลงทะเบียน + animation รอ
//   - status='approved' → ★ sign-in กับ Supabase Auth ก่อน ★ แล้ว redirect ไป /today
//   - status='rejected' → เคลียร์ pending session + mark rejected + แสดงข้อความ
//   - status='unknown' → แสดงข้อความให้ login ใหม่ (สำหรับครู/อื่นๆ)
//
// ★ v1.9.3 CRITICAL FIX:
//   ก่อนหน้านี้ เมื่อ status='approved' ระบบจะเคลียร์ pending session และ
//   router.replace('/today') ทันที — แต่ user ยังไม่ได้ sign-in กับ
//   Supabase Auth จริง (เพราะ pending session เป็นเพียง localStorage state)
//   → middleware ตรวจพบ !user → redirect กลับไป /login
//   → user ต้อง login ใหม่ทั้งที่รออยู่ตั้งแต่แรก (ประสบการณ์ไม่ดี)
//
//   ตอนนี้เมื่อ status='approved':
//     1. คำนวณ email + password จาก pending session
//        - นักเรียน: email = synthesizeEmail(student_id), password = student_id
//        - ครู/อื่นๆ: email = session.email, password = session.password
//     2. เรียก supabase.auth.signInWithPassword พร้อม retry 5 ครั้ง
//        (race condition: auth account อาจยังไม่พร้อมทันทีหลัง admin approve)
//     3. เมื่อ sign-in สำเร็จ → เคลียร์ password จาก pending session → redirect ไป /today
//     4. ถ้า sign-in ล้มเหลวหลัง retry ครบ → fallback ไป /login พร้อม toast แจ้ง
//
// ★ v1.9.2 (คงไว้):
//   - ใช้ server API (service role) ตรวจสอบสถานะที่แน่นอน
//   - status='rejected' ยืนยันจาก server ก่อน mark ใน localStorage
//   - status='unknown' ไม่ mark rejected, ไม่ redirect
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
  Loader2,
} from 'lucide-react';
import {
  getPendingSession,
  clearPendingSession,
  clearPendingSessionPassword,
  addRejectedAccount,
} from '@/lib/pending-session';
import { useRealtimePendingRequest } from '@/lib/hooks/use-realtime';
import { createClient } from '@/lib/supabase/client';
import { synthesizeEmail } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

type DisplayMode = 'loading' | 'pending' | 'approved' | 'approved_signing_in' | 'rejected' | 'unknown' | 'no_session';

export function PendingStatusClient() {
  const router = useRouter();
  const { toast } = useToast();

  // อ่าน pending session เก็บไว้ใน state — ใช้ใน render และ hook
  const [session, setSession] = React.useState(() => getPendingSession());
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('loading');

  // v1.9.3: ref สำหรับกัน auto sign-in ทำงานซ้ำ (React strict mode + realtime events)
  const signingInRef = React.useRef(false);

  // ★ v3.7.2: performAutoSignIn — ใช้ server-side endpoint แทน client-side sign-in
  //   ก่อนหน้านี้: supabase.auth.signInWithPassword() (client) → cookies ไม่ set ทัน
  //   → middleware เห็น !user → redirect กลับ /login
  //
  //   ตอนนี้: เรียก /api/auth/auto-login (server-side) → cookies set ผ่าน NextResponse
  //   → client ใช้ window.location.replace (hard nav) → middleware เห็น cookies แน่นอน
  const performAutoSignIn = React.useCallback(
    async (currentSession: any): Promise<boolean> => {
      if (!currentSession) return false;
      if (signingInRef.current) return false;
      signingInRef.current = true;

      try {
        // คำนวณ email + password จาก pending session
        let signInEmail: string;
        let signInPassword: string;

        if (currentSession.account_type === 'student' && currentSession.student_id) {
          signInEmail = synthesizeEmail(currentSession.student_id);
          signInPassword = currentSession.student_id;
        } else if (currentSession.email && currentSession.password) {
          signInEmail = currentSession.email;
          signInPassword = currentSession.password;
        } else {
          console.warn(
            '[pending-status] cannot auto sign-in: missing password for non-student account'
          );
          return false;
        }

        // Retry สูงสุด 5 ครั้ง (race condition: auth account อาจยังไม่พร้อมทันทีหลัง admin approve)
        const retryDelays = [0, 600, 800, 1000, 1500, 2000];
        let lastError: any = null;

        for (let i = 0; i < retryDelays.length; i++) {
          if (i > 0) {
            await new Promise((r) => setTimeout(r, retryDelays[i]));
          }

          try {
            // ★ v3.7.2: เรียก server-side endpoint แทน client-side sign-in
            const res = await fetch('/api/auth/auto-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: signInEmail,
                password: signInPassword,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data?.success) {
                console.log(
                  '[pending-status] auto sign-in success after',
                  i,
                  'retries, uid=',
                  data.uid?.slice(-6)
                );
                clearPendingSessionPassword();
                return true;
              }
            }

            lastError = new Error(`HTTP ${res.status}`);
            console.warn(
              `[pending-status] auto sign-in attempt ${i + 1} failed: HTTP ${res.status}`
            );
          } catch (err) {
            lastError = err;
            console.warn(`[pending-status] auto sign-in attempt ${i + 1} exception:`, err);
          }
        }

        console.error(
          '[pending-status] auto sign-in failed after all retries:',
          lastError?.message || lastError
        );
        return false;
      } finally {
        signingInRef.current = false;
      }
    },
    []
  );

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
      // v1.9.3: อนุมัติแล้ว — sign-in กับ Supabase Auth ก่อน แล้วค่อย redirect ไป /today
      //   ถ้า sign-in สำเร็จ → redirect ไป /today (user ใช้งานได้ทันที ไม่ต้อง login ใหม่)
      //   ถ้า sign-in ล้มเหลว → fallback ไป /login พร้อม toast แจ้ง
      setDisplayMode('approved_signing_in');
      toast({
        title: 'อนุมัติแล้ว! 🎉',
        description: 'กำลังนำคุณเข้าสู่ระบบ...',
      });

      (async () => {
        const ok = await performAutoSignIn(session);
        if (ok) {
          // sign-in สำเร็จ → เคลียร์ pending session ทั้งหมด + redirect ไป /today
          clearPendingSession();
          setDisplayMode('approved');
          // ★ v3.7.2: ใช้ window.location.replace (hard navigation) แทน router.replace
          //   เพื่อให้แน่ใจว่า middleware เห็น cookies ที่ถูก set โดย server
          //   (router.replace เป็น SPA ที่อาจไม่ refresh cookies)
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.replace('/today');
            } else {
              router.replace('/today');
            }
          }, 600);
        } else {
          // sign-in ล้มเหลว → fallback ไป /login พร้อม toast แจ้ง
          console.warn('[pending-status] auto sign-in failed → fallback to /login');
          clearPendingSession();
          toast({
            title: 'อนุมัติแล้ว',
            description: 'กรุณาเข้าสู่ระบบด้วยตัวเองอีกครั้ง',
          });
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.replace('/login');
            } else {
              router.replace('/login');
            }
          }, 800);
        }
      })();
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
        title: 'การลงทะเบียนถูกปฏิเสธ',
        description: 'คุณสามารถลงทะเบียนใหม่ได้หากต้องการ',
        variant: 'destructive',
      });
    } else if (status === 'unknown') {
      // ไม่สามารถตรวจสอบได้ (ครู/อื่นๆ) — ให้ user login ด้วยตัวเอง
      setDisplayMode('unknown');
    } else if (status === 'pending') {
      setDisplayMode('pending');
    }
  }, [status, loading, session, router, toast, performAutoSignIn]);

  // ── Render ──

  // Loading state — กำลังอ่าน pending session หรือ realtime status
  if (displayMode === 'loading' || !session) {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
          <div className="yp-auth__logo yp-auth__logo--image" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </div>
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

  // v1.9.3: Approved + signing-in state — กำลัง sign-in กับ Supabase Auth
  // (แสดง spinner เพื่อให้ user รู้ว่าระบบกำลังทำงาน ไม่ใช่ค้าง)
  if (displayMode === 'approved_signing_in' || displayMode === 'approved') {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
          <div className="yp-auth__logo yp-auth__logo--image" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </div>
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
              {displayMode === 'approved_signing_in' ? (
                <Loader2
                  className="size-9"
                  strokeWidth={2.2}
                  style={{ animation: 'yp-spin 0.9s linear infinite' }}
                />
              ) : (
                <CheckCircle2 className="size-9" strokeWidth={2.2} />
              )}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--yp-text-strong)', marginBottom: '6px' }}>
              การลงทะเบียนได้รับการอนุมัติ
            </div>
            <div style={{ fontSize: '14px', color: 'var(--yp-text-muted)' }}>
              {displayMode === 'approved_signing_in'
                ? 'กำลังนำคุณเข้าสู่ระบบ...'
                : 'เข้าสู่ระบบสำเร็จ! กำลังพาคุณไปต่อ...'}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes yp-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Rejected state — ปฏิเสธแล้ว
  if (displayMode === 'rejected') {
    return (
      <div className="yp-auth yp-login-bg">
        <div className="yp-auth__inner">
          <div className="yp-auth__brand">
          <div className="yp-auth__logo yp-auth__logo--image" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </div>
            <div className="yp-auth__brand-text">
              <div className="yp-auth__brand-name">YP Work</div>
              <div className="yp-auth__brand-tag">Student Council Hub</div>
            </div>
          </div>
          <div className="yp-auth__hero">
            <span className="yp-auth__demo-badge">v3.10.0 · Status</span>
            <h1>การลงทะเบียน<br />ถูกปฏิเสธ</h1>
            <p>ผู้ดูแลระบบได้ปฏิเสธการลงทะเบียนของคุณ</p>
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
                การลงทะเบียนของ &ldquo;<strong>{session.full_name}</strong>&rdquo;
                ถูกปฏิเสธโดยผู้ดูแลระบบ
                <br />
                หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแล หรือลงทะเบียนใหม่
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/register" className="yp-btn yp-btn--primary">
                  ลงทะเบียนใหม่
                </Link>
                <Link href="/login" className="yp-btn yp-btn--ghost">
                  กลับหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </div>
          </div>
          <div className="yp-auth__footer">
            © 2026 YP Work · แพลตฟอร์มจัดการรายการสภานักเรียน · เชื่อมต่อ Supabase
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
          <div className="yp-auth__logo yp-auth__logo--image" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </div>
            <div className="yp-auth__brand-text">
              <div className="yp-auth__brand-name">YP Work</div>
              <div className="yp-auth__brand-tag">Student Council Hub</div>
            </div>
          </div>
          <div className="yp-auth__hero">
            <span className="yp-auth__demo-badge">v3.10.0 · Status</span>
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
                ระบบไม่สามารถตรวจสอบสถานะการลงทะเบียนของคุณได้อัตโนมัติ
                <br />
                กรุณา login ด้วยตัวเอง — ถ้าการลงทะเบียนได้รับการอนุมัติ คุณจะเข้าสู่ระบบได้ปกติ
                <br />
                ถ้าการลงทะเบียนถูกปฏิเสธ ระบบจะแจ้งให้ทราบ
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/login" className="yp-btn yp-btn--primary">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className="yp-btn yp-btn--ghost">
                  ลงทะเบียนใหม่
                </Link>
              </div>
            </div>
          </div>
          <div className="yp-auth__footer">
            © 2026 YP Work · แพลตฟอร์มจัดการรายการสภานักเรียน · เชื่อมต่อ Supabase
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
          <div className="yp-auth__logo yp-auth__logo--image" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </div>
          <div className="yp-auth__brand-text">
            <div className="yp-auth__brand-name">YP Work</div>
            <div className="yp-auth__brand-tag">Student Council Hub</div>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="yp-auth__hero">
          <span className="yp-auth__demo-badge">v3.10.0 · Pending Status</span>
          <h1>
            รอผู้ดูแล
            <br />
            อนุมัติ
          </h1>
          <p>การลงทะเบียนของคุณเสร็จสมบูรณ์ — หน้านี้จะอัพเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง</p>
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
              ข้อมูลการลงทะเบียน
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
            เมื่อผู้ดูแลอนุมัติการลงทะเบียน ระบบจะพาคุณเข้าสู่ระบบโดยอัตโนมัติ
            หากการลงทะเบียนถูกปฏิเสธ ระบบจะแจ้งให้ทราบทันที
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
          © 2026 YP Work · แพลตฟอร์มจัดการรายการสภานักเรียน · เชื่อมต่อ Supabase
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
        // v2.1.0: ใช้ flex-wrap เพื่อให้ value ที่ยาว (เช่นวันที่เต็ม) ขึ้นบรรทัดใหม่ได้บนจอแคบ
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '6px 12px',
        padding: '8px 0',
        fontSize: '13px',
        borderBottom: '1px solid var(--yp-border-subtle, #F3F4F6)',
      }}
    >
      <span style={{ color: 'var(--yp-text-muted)', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: 'var(--yp-text-body)',
          fontWeight: 500,
          textAlign: 'right',
          flex: 1,
          minWidth: 0,
          // v2.1.0: อนุญาตให้ word-wrap สำหรับข้อความยาว (วันที่/ชื่อเต็ม)
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
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
