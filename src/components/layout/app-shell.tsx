'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · App Shell — v3.10.0 รอบที่ 2
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 2: Task Cards Redesign + Sub-tasks in Today/Upcoming
//   - ไม่มีการเปลี่ยนแปลงที่ AppShell component โดยตรง
//   - การเปลี่ยนแปลงอยู่ใน:
//     - src/modules/events/event-detail-client.tsx (TaskRow v2 layout + labels)
//     - src/modules/today/today-client.tsx (sub-tasks ใน today + upcoming)
//     - src/app/globals.css (.yp-task-row--v2 CSS)
//
// ★ v3.10.0 รอบที่ 1 (เดิม): Task Cards Redesign + Morning/Afternoon Grouping
//   - เพิ่ม start_time field + แยก task list เป็นช่วงเช้า/บ่าย
//   - ไม่มีการเปลี่ยนแปลงที่ AppShell component โดยตรง
//
// ★ v3.9.4: Calendar Redesign + Thailand TZ + Relaxed Patterns
//   - ไม่มีการเปลี่ยนแปลงที่ AppShell โดยตรง — การแก้ timezone และ
//     การออกแบบปฏิทินใหม่อยู่ใน src/lib/utils/date.ts และ
//     src/modules/calendar/calendar-view.tsx
//
// ★ v3.9.3: Premium Polish & Patterned Surfaces
//   - FAB: ยกเลิก hover effect ทั้งหมด (transform + shadow กลับเป็น default)
//     ให้ feedback เฉพาะ active (press) state เท่านั้น
//   - ค่า radii ทั้งหมดเพิ่มขึ้น (more rounded curves)
//   - Page padding เพิ่มขึ้น (ระยะจากขอบซ้าย-ขวา)
//   - Hero blocks ทั้งหมดถูกยกเครื่องใหม่ด้วย Telegram-style patterns
//
// ★ v3.9.2: Native Platform Polish
//   - FAB: Material 3 Extended FAB (state layer + halo glow + spring press)
//   - Bottom Nav: Material 3 Navigation Bar (pill indicator behind active icon)
//   - Top Bar: Apple HIG translucency (saturate 200% + blur 20px)
//   - Show/Hide: velocity-aware + visibility-hidden when collapsed
//   - Top Bar scroll state: .is-scrolled class for refined edge shadow
//
// ★ v3.9.2 (history): แยกระบบ "แสดง/ซ่อน" (scroll-based, มี animation)
//   ออกจาก "ปิด/เปิด" (programmatic, ไม่มี animation) อย่างชัดเจน
//
//   1. "แสดง/ซ่อน" — useScrollDirection hook + .is-hidden-by-scroll class
//      → มี animation (scale + fade) ทั้งขาเข้าและขาออก
//      → เลื่อนลงผ่าน 120px → ซ่อน, เลื่อนขึ้น → แสดง
//
//   2. "ปิด/เปิด" — body.yp-window-open .fab (ใน globals.css)
//      → ไม่มี animation ปิด/เปิดทันที (instant)
//      → ใช้เมื่อเปิด bottom sheet/window เพื่อกัน user กด FAB ซ้อน
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
// ★ v3.9.2: useScrollDirection สำหรับระบบ "แสดง/ซ่อน" (มี animation + velocity-aware)
import { useScrollDirection } from '@/lib/hooks/use-scroll-direction';

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
  { key: 'events',   label: 'งาน',       href: '/events',   icon: ListTodo },
  { key: 'profile',  label: 'โปรไฟล์',   href: '/profile',  icon: UserIcon },
];

/**
 * คำนวณ accent-driven gradient stops จาก accent color
 * หากไม่มี accent → default brand indigo → violet
 * หากมี accent → accent + violet mix (เหมือน demo v8.2 event detail)
 */
function computeTitleVars(accent?: string): {
  from: string;
  to: string;
  accentVar: string;
} {
  if (!accent) {
    return { from: '#4F46E5', to: '#7C3AED', accentVar: '#4F46E5' };
  }
  // ใช้ accent สำหรับ from + mix กับ violet สำหรับ to (เหมือน demo)
  return { from: accent, to: '#7C3AED', accentVar: accent };
}

export function AppShell({
  user: initialUser,
  children,
  activeNav,
  showBack = false,
  showFAB = false,
  showBottomNav = true,
  title = 'YP Work',
  accent,
}: AppShellProps) {
  // v1.8.2: subscribe realtime — ชื่อ/สี/ฝ่าย ของ user เปลี่ยน → avatar และ
  //   top-bar อัพเดตทันที (admin เปลี่ยนชื่อ, ย้ายฝ่าย, เปลี่ยนสี)
  const { user } = useRealtimeSessionUser(initialUser);
  const router = useRouter();
  const { from, to, accentVar } = computeTitleVars(accent);

  // v1.4: auto showBack เมื่อซ่อน bottom-nav (เหมือน demo route-meta logic)
  const effectiveShowBack = showBack || !showBottomNav;

  const shellStyle: React.CSSProperties = {
    '--yp-top-from': from,
    '--yp-top-to': to,
    '--yp-top-accent': accentVar,
  } as React.CSSProperties;

  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  // ★ v3.9.2: ระบบ "แสดง/ซ่อน" (scroll-based) — velocity-aware + visibility-hidden
  //   เลื่อนลงผ่าน 120px → ซ่อน (scale 0.4 + fade out + visibility hidden)
  //   เลื่อนขึ้น → แสดง (scale 1 + fade in, spring-like with tiny overshoot)
  //   ใกล้บน 40px → แสดงเสมอ
  //   หมายเหตุ: นี่แยกจาก "ปิด/เปิด" (body.yp-window-open) ที่ไม่มี animation
  const { hidden: fabHidden, isScrolled: topBarScrolled } = useScrollDirection({
    enabled: showFAB,
    hideThreshold: 120,
    showAtTop: 40,
    scrollStateThreshold: 8,
  });

  return (
    <div className="app-shell" style={shellStyle}>
      {/* ── TOP BAR (fixed) ── */}
      <header
        className={`top-bar${topBarScrolled ? ' is-scrolled' : ''}`}
        role="banner"
      >
        <div className="top-bar__left">
          {effectiveShowBack ? (
            <button
              type="button"
              className="top-bar__back"
              onClick={handleBack}
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

      {/* ── MAIN CONTENT ── */}
      <main className="app-main" id="app-main">
        {/* v1.4: animation wrapper อยู่ข้างใน main ไม่ใช่ shell
            เพื่อไม่ให้ transform บน shell ทำลาย position:fixed ของ FAB/bottom-nav */}
        <div className="yp-shell-content-enter">
          {children}
        </div>
      </main>

      {/* ── FAB ── */}
      {/* ★ v3.9.2: Material 3 Extended FAB — state layer + halo glow + spring press
          .is-hidden-by-scroll → CSS จะ animate scale 0.4 + fade + visibility hidden
          ส่วน "ปิด/เปิด" (body.yp-window-open) จัดการใน CSS แยก — ไม่มี animation */}
      {showFAB ? (
        <Link
          href="/events/create"
          prefetch={true}
          aria-label="สร้างงานใหม่"
          className={`fab${fabHidden ? ' is-hidden-by-scroll' : ''}`}
        >
          <Plus className="size-5" strokeWidth={2.4} />
        </Link>
      ) : null}

      {/* ── BOTTOM NAV / LEFT-RAIL ── */}
      <nav
        className={`bottom-nav${showBottomNav ? '' : ' is-hidden'}`}
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
    </div>
  );
}
