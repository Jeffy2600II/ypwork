'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · App Shell (r50)
// ═══════════════════════════════════════════════════════════════
// ★ r50: ปรับปรุงครั้งใหญ่
//   1. ใช้ระบบ framework ใหม่ (modular sheet/popup/fab)
//   2. แก้บั๊ก FAB ไม่ซ่อนตอนเปิด sheet
//      สาเหตุเดิม: พึ่ง CSS body.yp-window-open .fab เพียงอย่างเดียว
//      วิธีแก้: ใช้ useIsSheetOpen() เป็น reactive source of truth ใน React
//              และซ่อน FAB ผ่าน prop แทน CSS class ที่ตอบสนองช้า
//   3. แก้บั๊ก FAB flash ตอน sheet ปิด
//      สาเหตุเดิม: หน่วงเวลาของ CSS class กับ useScrollDirection re-evaluation
//      วิธีแก้: ใช้ useIsSheetOpen() ร่วมกับ useScrollDirection()
//              ถ้า sheet เปิดอยู่ → FAB ซ่อนแน่นอน (regardless of scroll)
//              ถ้า sheet ปิด → FAB ตาม scroll direction
//   4. แยก FAB logic ออกเป็น component ย่อย AppShellFAB
//      เพื่อรวม state logic ที่เกี่ยวข้องไว้ที่เดียว
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  CalendarDays,
  ListTodo,
  User as UserIcon,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { Avatar } from '@/components/framework/avatar';
import { useRealtimeSessionUser } from '@/lib/hooks/use-realtime';
// ★ r50: import จาก framework ใหม่ (modular)
import {
  useScrollDirection,
  useFabAction,
  FabProvider,
  useIsSheetOpen,
} from '@/components/framework';
import { usePendingDeleteRetry } from '@/lib/core/pending-delete-retry';

export type AppShellActiveNav = 'today' | 'calendar' | 'events' | 'profile';

export interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  activeNav?: AppShellActiveNav;
  showBack?: boolean;
  showFAB?: boolean;
  /** แสดง bottom-nav? (default: true) — ซ่อนบนหน้า detail/create */
  showBottomNav?: boolean;
  title?: string;
  /** accent color (เช่น event color) — ใช้ set --yp-top-* CSS vars */
  accent?: string;
}

interface NavItem {
  key: AppShellActiveNav;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'today',    label: 'หน้าแรก',   href: '/today',    icon: Home },
  { key: 'calendar', label: 'ปฏิทิน',    href: '/calendar', icon: CalendarDays },
  { key: 'events',   label: 'รายการ',     href: '/events',   icon: ListTodo },
  { key: 'profile',  label: 'โปรไฟล์',   href: '/profile',  icon: UserIcon },
];

/**
 * คำนวณ accent-driven gradient stops จาก accent color
 */
function computeTitleVars(accent?: string): {
  from: string;
  to: string;
  accentVar: string;
} {
  if (!accent) {
    return { from: '#4F46E5', to: '#7C3AED', accentVar: '#4F46E5' };
  }
  return { from: accent, to: '#7C3AED', accentVar: accent };
}

export function AppShell(props: AppShellProps) {
  return (
    <FabProvider>
      <AppShellInner {...props} />
    </FabProvider>
  );
}

function AppShellInner({
  user: initialUser,
  children,
  activeNav,
  showBack = false,
  showFAB = false,
  showBottomNav = true,
  title = 'YP Work',
  accent,
}: AppShellProps) {
  const { user } = useRealtimeSessionUser(initialUser);
  const router = useRouter();
  const { from, to, accentVar } = computeTitleVars(accent);

  usePendingDeleteRetry();

  const effectiveShowBack = showBack || !showBottomNav;

  const shellStyle: React.CSSProperties = {
    '--yp-top-from': from,
    '--yp-top-to': to,
    '--yp-top-accent': accentVar,
  } as React.CSSProperties;

  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="app-shell" style={shellStyle}>
      {/* ── TOP BAR (fixed) ── */}
      <TopBar
        title={title}
        showBack={effectiveShowBack}
        onBack={handleBack}
        user={user}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="app-main" id="app-main">
        <div className="yp-shell-content-enter">
          {children}
        </div>
      </main>

      {/* ── FAB ── */}
      <AppShellFAB showFAB={showFAB} />

      {/* ── BOTTOM NAV / LEFT-RAIL ── */}
      <BottomNav activeNav={activeNav} show={showBottomNav} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TopBar — แยกออกมาเป็น component ย่อย
// ═══════════════════════════════════════════════════════════════

function TopBar({
  title,
  showBack,
  onBack,
  user,
}: {
  title: string;
  showBack: boolean;
  onBack: () => void;
  user: { full_name: string; color: string };
}) {
  // ★ r50: scroll state สำหรับ top-bar shadow refinement
  //   ใช้ useScrollDirection แบบ enabled=true เสมอ (เพราะ top-bar แสดงทุกหน้า)
  const { isScrolled } = useScrollDirection({
    enabled: true,
    hideThreshold: 120,
    showAtTop: 40,
    scrollStateThreshold: 8,
  });

  return (
    <header
      className={`top-bar${isScrolled ? ' is-scrolled' : ''}`}
      role="banner"
    >
      <div className="top-bar__left">
        {showBack ? (
          <button
            type="button"
            className="top-bar__back"
            onClick={onBack}
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <div
        className="top-bar__title"
        title={title}
      >
        {title}
      </div>

      <div className="top-bar__right">
        <Link
          href="/profile"
          className="top-bar__avatar"
          aria-label={`โปรไฟล์ของ ${user.full_name}`}
        >
          <Avatar
            name={user.full_name}
            color={user.color}
            size={32}
            className="top-bar__avatar-img"
          />
        </Link>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// AppShellFAB — รวม logic ของ FAB ไว้ที่เดียว
// ═══════════════════════════════════════════════════════════════
// ★ r50: แยกออกมาเป็น component ย่อยเพื่อ:
//   - รวม logic ของ FAB ไว้ที่เดียว (action + scroll + sheet-open state)
//   - ลด complexity ของ AppShellInner
//   - แก้บั๊ก FAB flash ตอน sheet ปิด
//
// Logic การแสดง FAB:
//   - ถ้า sheet เปิดอยู่ → ซ่อน (priority สูงสุด — กัน user กดซ้อน)
//   - ถ้า action เป็น 'hidden' → ซ่อน (page เป็นคนตั้ง)
//   - ถ้า scroll ลง → ซ่อน (velocity-aware)
//   - ถ้า scroll ขึ้น หรืออยู่ใกล้บน → แสดง
// ═══════════════════════════════════════════════════════════════

function AppShellFAB({ showFAB }: { showFAB: boolean }) {
  const fabAction = useFabAction();

  // ★ r50: reactive source of truth — รู้ทันทีที่ sheet เปิด/ปิด
  //   ไม่ต้องรอ CSS class ตอบสนอง (กัน FAB flash ตอน sheet ปิด)
  const isSheetOpen = useIsSheetOpen();

  // ถ้า action เป็น 'hidden' → บังคับซ่อน FAB แม้ showFAB=true
  const effectiveShowFAB = showFAB && fabAction.kind !== 'hidden';

  const { hidden: fabHiddenByScroll } = useScrollDirection({
    enabled: effectiveShowFAB,
    hideThreshold: 120,
    showAtTop: 40,
    scrollStateThreshold: 8,
  });

  // ★ r50: FAB ซ่อนถ้า sheet เปิด หรือ hidden by scroll
  //   ถ้า sheet เปิด → ซ่อนแน่นอน (ยืนยันว่าไม่มี flash)
  //   ถ้า sheet ปิด → ตาม scroll direction
  const fabHidden = isSheetOpen || fabHiddenByScroll;

  if (!effectiveShowFAB) return null;

  // ★ r50: ใช้ class 'is-hidden-by-scroll' สำหรับ scroll-based hide
  //   และเพิ่ม 'is-hidden-by-overlay' สำหรับ sheet-open hide
  //   CSS จะจัดการ animation ทั้งสองกรณี
  const fabClassName = `fab${fabHidden ? ' is-hidden-by-scroll' : ''}${isSheetOpen ? ' is-hidden-by-overlay' : ''}`;

  if (fabAction.kind === 'callback') {
    return (
      <button
        type="button"
        onClick={fabAction.fn}
        aria-label="สร้างรายการใหม่"
        className={fabClassName}
      >
        <Plus className="size-5" strokeWidth={2.4} />
      </button>
    );
  }

  const href =
    fabAction.kind === 'navigate-create-with-date'
      ? `/events/create?date=${encodeURIComponent(fabAction.date)}`
      : '/events/create';

  return (
    <Link
      href={href}
      prefetch={true}
      aria-label="สร้างรายการใหม่"
      className={fabClassName}
    >
      <Plus className="size-5" strokeWidth={2.4} />
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// BottomNav — แยกออกมาเป็น component ย่อย
// ═══════════════════════════════════════════════════════════════

function BottomNav({
  activeNav,
  show,
}: {
  activeNav?: AppShellActiveNav;
  show: boolean;
}) {
  // ★ r50: reactive — ซ่อน bottom-nav ทันทีที่ sheet เปิด
  //   ไม่ต้องพึ่ง CSS body.yp-overlay-open--sheet .bottom-nav ที่ตอบสนองช้า
  const isSheetOpen = useIsSheetOpen();

  // ★ ถ้า sheet เปิดอยู่ → บังคับซ่อน bottom-nav ด้วย class
  //   CSS จะจัดการ animation (fade + slide down)
  const navClassName = `bottom-nav${show ? '' : ' is-hidden'}${isSheetOpen ? ' is-hidden-by-overlay' : ''}`;

  return (
    <nav
      className={navClassName}
      aria-label="นำทางหลัก"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeNav === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch={true}
            className={`bottom-nav__item${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="bottom-nav__icon">
              <Icon
                className="size-5"
                strokeWidth={1.8}
              />
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
