'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · App Shell (port จาก demo v8.2) — v1.4
// ═══════════════════════════════════════════════════════════════
// Client component ที่ทำหน้าที่เป็น app shell:
// - top-bar (fixed): back button + accent-driven title + avatar link
// - main content slot (children)
// - FAB (floating action button) — แสดงเฉพาะหน้าที่สร้างงานได้
// - bottom-nav (4 ไอเทม) — mobile เท่านั้น, desktop ≥900px เป็น left-rail
//
// v1.4 แก้ไข:
// - เพิ่ม showBottomNav prop — ควบคุมการแสดง bottom-nav (ใช้ is-hidden class)
// - ย้าย yp-page-enter จาก shell div → main content wrapper
//   เพื่อแก้ปัญหา transform สร้าง containing block ใหม่
//   ที่ทำให้ position: fixed (FAB, bottom-nav) ไม่ล็อกกับ viewport
// - auto showBack เมื่อ showBottomNav=false
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
  user,
  children,
  activeNav,
  showBack = false,
  showFAB = false,
  showBottomNav = true,
  title = 'YP Work',
  accent,
}: AppShellProps) {
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

  return (
    <div className="app-shell" style={shellStyle}>
      {/* ── TOP BAR (fixed) ── */}
      <header className="top-bar" role="banner">
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
      {showFAB ? (
        <button
          type="button"
          className="fab"
          aria-label="สร้างงานใหม่"
          onClick={() => router.push('/events/create')}
        >
          <Plus className="size-5" strokeWidth={2.2} />
        </button>
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
              className={`bottom-nav__item${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <span className="bottom-nav__icon">
                <Icon
                  className="size-5"
                  strokeWidth={1.7}
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