'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · App Shell — v3.10.0-r25
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 25: แก้ left-rail ทับเนื้อหา + ลบเบลอ + จัดปุ่มใหม่
//   (แก้ทั้งหมดใน globals.css — ไฟล์นี้ไม่มีการเปลี่ยนแปลง)
//
//   บั๊กที่ 1 — left-rail ทับเนื้อหา (สาเหตุจริง):
//   มี `:root { --yp-left-rail-width: 0px; }` ซ้ำอยู่ท้ายไฟล์ ซึ่งมาหลัง
//   @media(min-width:900px) ทุกตัวที่ตั้งค่า 96/108/120px ไว้ — เพราะ
//   custom property cascade ใช้ source order ปกติ (ไม่สนตำแหน่ง media
//   query) ตัวที่อยู่ท้ายไฟล์สุดเลยชนะเสมอ ทำให้ desktop ได้ 0px ตลอด
//   .app-main เลยไม่เว้น padding-left แต่ .bottom-nav (rail) ยังกว้าง
//   96-120px เหมือนเดิม → ทับเนื้อหา
//   แก้: ย้าย default (0px) ไปไว้บนสุดของไฟล์แทน ให้ @media ที่มาทีหลัง
//   ใน source order ชนะค่านี้ได้ตามปกติ + เพิ่ม
//   `.app-shell:has(> .bottom-nav.is-hidden) { --yp-left-rail-width: 0px }`
//   ให้เว้นพื้นที่เฉพาะหน้าที่มี rail แสดงผลจริงเท่านั้น (ตามที่ขอ)
//
//   บั๊กที่ 2 — ปุ่มใน left-rail ดู "เรียงเต็มทั่วทั้งแถบ":
//   .bottom-nav (base rule มือถือ สำหรับแถบลอยด้านล่าง) เป็น unconditional
//   rule ที่อยู่ท้ายไฟล์กว่าบล็อก desktop rail — ทำให้ justify-content:
//   space-evenly, inset, padding, border-radius, background ของมือถือ
//   หลุดมาชนะทับค่า desktop (flex-start, inset:0, ขอบเหลี่ยม ฯลฯ) เสมอ
//   แก้: ย้าย property ที่ชนกันไปตั้งในบล็อก desktop ตัวท้ายสุดของไฟล์
//   แทน (รับประกันว่ามาหลัง base rule แน่นอน) — ตอนนี้ปุ่มเรียงต่อกันจาก
//   ด้านบนแบบปกติ มีช่องว่างด้านล่างตามธรรมชาติ ไม่ยืดเต็มความสูง
//
//   ลบ backdrop-filter (เบลอ) ทั้งหมดของ .top-bar และ .bottom-nav (ทั้ง
//   แถบบนมือถือ + rail บน desktop) → พื้นหลังทึบแสงสีขาวล้วนแทน พร้อมลบ
//   ตัวแปร --yp-glass-grain ที่ไม่ได้ใช้แล้ว (เคยใช้กับเอฟเฟกต์เบลอเท่านั้น)
//
// ★ v3.10.0 รอบที่ 24: ปรับปรุง desktop left-rail + cross-device padding
//   - รอบ 23 แก้แค่มือถือ → รอบ 24 เพิ่ม desktop (≥900px)
//   - Desktop left-rail: flex column + center ให้ .bottom-nav__item
//     (เดิมใช้ค่า default ที่ไม่ stack icon+label ในแนวตั้ง)
//   - Active state: gradient indigo→violet left border + pill icon bg
//   - Responsive: icon/label/border ใหญ่ขึ้นที่ 1280px และ 1536px
//   - Cross-device padding: มือถือใช้ --yp-page-bottom-pad,
//     desktop ใช้ --yp-space-8 (เพราะไม่มี bottom-nav)
//   - แก้ใน globals.css เท่านั้น
//
// ★ v3.10.0 รอบที่ 23: ฟื้นคุณภาพแถบนำทาง + แก้เนื้อหาถูกบัง (มือถือ)
//   - รอบ 22 ลดขนาดข้อความ/icon มากเกินไป (10.5px / 48×30) ทำให้คุณภาพ
//     สู้เวอร์ชันเก่า (เช่น r10) ไม่ได้ → ฟื้นค่า r10 (11.5px / 56×42)
//   - เพิ่ม padding-bottom ให้ .yp-page / .yp-profile-page ใช้
//     --yp-page-bottom-pad แทนค่าคงที่ ป้องกันเนื้อหาถูกบัง
//
// ★ v3.10.0 รอบที่ 22: ปรับขนาดข้อความใน bottom-nav (มือถือ) ให้เล็กลง
//   และจัดกึ่งกลาง (แต่เล็กเกินไป → แก้ใน r23)
//
// ★ v3.10.0 รอบที่ 19: แก้ backdrop-filter ไม่ทำงาน + ลบ CSS ซ้ำซ้อน
//   ต้นเหตุหลักที่ทำให้ blur ไม่ขึ้น:
//     1) .top-bar มี isolation: isolate — สร้าง stacking context ใหม่ทับ backdrop-filter
//     2) .bottom-nav มี contain: paint — อาจขัดกับ backdrop-filter rendering
//     3) ขาด will-change: backdrop-filter — browser ไม่ optimize ให้
//   การแก้ไขใน globals.css:
//     - .top-bar: ลบ isolation: isolate, เพิ่ม will-change: backdrop-filter
//     - .bottom-nav: ลบ paint ออกจาก contain, เพิ่ม will-change: backdrop-filter
//     - ลบ .fab ซ้ำซ้อน 4 ชุด (old v3.9.2, v3.4.0, v3.7.9, v3.7.10)
//     - เหลือ .fab base rule ชุดเดียวที่ line ~9131 (v3.9.2 Material 3)
//
// ★ v3.10.0 รอบที่ 17 (ยกเลิก — เก็บไว้อ่านประวัติเท่านั้น): แก้ไขความเข้าใจผิดของรอบ 14-15 — การปรับแค่
//   opacity/blur px ไม่ใช่วิธีที่ถูกต้อง เพราะ backdrop-filter เบลอแค่
//   "สิ่งที่อยู่ข้างหลังจริง ๆ" เท่านั้น ถ้าตรงนั้นเป็นพื้นสีเรียบ (ไม่มี
//   ขอบ/ลาย) ต่อให้เบลอแรงแค่ไหนก็ยังได้สีเรียบเหมือนเดิม — ไม่มีทางดู
//   "เบลอ" ได้เลยไม่ว่าจะตั้งค่าเท่าไหร่ ถ้าไม่มีอะไรให้เบลอ (นี่คือจุดที่
//   ทฤษฎีเดิมผิด ไม่ใช่แค่เรื่อง opacity ตามที่เข้าใจไป)
//   วิธีแก้ที่ถูกต้อง (เทคนิคเดียวกับ frosted glass ของ Apple):
//     1) เพิ่ม grain/noise texture (SVG feTurbulence) ทับบน blur ผ่าน
//        ::after ของ .top-bar / .bottom-nav — เห็นได้เสมอไม่ว่าเนื้อหา
//        ข้างหลังจะเป็นอะไร (ดู --yp-glass-grain ใน :root)
//     2) ปรับ opacity กลับมากึ่งกลาง (top-bar 0.52/0.76 scrolled,
//        bottom-nav 0.56) — ไม่ใสจนไม่เห็นแถบ ไม่ทึบจนไม่เห็นเบลอ
//     3) เพิ่ม contrast(1.12) ใน backdrop-filter ให้สีที่เบลอออกมา
//        แยกเป็นหย่อมสีชัดเจนขึ้น
//
// ★ v3.10.0 รอบที่ 15: แก้ปัญหา backdrop เบลอรอบที่ 14 ยังมองแทบไม่เห็น —
//   ต้นเหตุคือ background opacity สูงเกินไป (0.58/0.68) บังเนื้อหาด้านหลัง
//   จนเห็นผลของ blur ไม่ชัด ไม่ใช่ที่ค่า blur px ไม่พอ — ลด opacity ลงมาก
//   (top-bar 0.58→0.32 / scrolled 0.86→0.62, bottom-nav 0.68→0.36) ให้
//   เนื้อหาด้านหลังโปร่งผ่านเห็นเป็นหมอกเบลอชัดเจน พร้อมเพิ่ม blur อีกขั้น
//   (44px→64px) และ saturate (190%→210%)
//
// ★ v3.10.0 รอบที่ 14: backdrop เบลอพรีเมียมขึ้น
//   - Top Bar / Bottom Nav (มือถือ + desktop rail): blur 28px → 44px,
//     saturate 220% → 190% (กันดูจัดจ้านเกินไป), เพิ่มเส้นไฮไลต์บาง ๆ
//     ด้านในขอบ (inset) จำลองผิวกระจกรับแสงแบบ frosted glass ของ
//     iOS/visionOS, เงานุ่มกระจายกว้างขึ้นแทนเงาแข็งบาง ๆ เดิม
//     (ดู .top-bar, .bottom-nav ใน globals.css — มีทั้งหมด 3 จุดที่ต้องแก้
//     พร้อมกัน: block หลัก + block bottom-nav บน desktop ที่มาทีหลังในไฟล์)
//
// ★ v3.10.0 รอบที่ 11: กลุ่มช่วงเวลาแสดงเสมอ + คำศัพท์ + ดีไซน์สะอาดตาขึ้น
//   - taskTimeGroups.showGroupHeadings ตอนนี้ true ทุกครั้งที่มีรายการย่อย
//     (ก่อนหน้านี้ต้องมี > 1 กลุ่มที่ไม่ว่างถึงจะโชว์ — ถ้าทั้งหมด "ไม่ระบุเวลา"
//     อย่างเดียว ผู้ใช้จะไม่เห็นข้อความบอกเลย)
//   - เพิ่มคอมโพเนนต์ TaskTimeGroup: icon chip + label + caption อธิบายสั้นๆ
//     ("เริ่มก่อน 12:00 น." ฯลฯ) แทนหัวข้อลอยๆ แบบเดิม
//   - "เสร็จแล้ว"/"ทำเสร็จ" (stat labels) → "เสร็จสมบูรณ์" ให้ตรงกับ statusLabel()
//   - การ์ดรายการย่อย (.yp-task-row): ตัดกรอบของ chip ออก ให้ผิวเรียบสะอาดตาขึ้น
//     และเพิ่มน้ำหนักตัวอักษรชื่อรายการย่อยให้เด่นขึ้น
//   - แก้ blur ของ bottom-nav บน desktop (@media min-width:900px) ที่ยังเป็นค่า
//     เดิมอยู่ — รอบที่ 10 แก้แค่ block หลัก แต่ block ใน media query desktop
//     มาทีหลังในไฟล์เลยชนะ ทำให้ desktop ยังไม่เบลอเท่าที่ตั้งใจ
//
// ★ v3.10.0 รอบที่ 10: iOS-level polish + subtask AM/PM grouping
//   - Top Bar / Bottom Nav / Left-rail: เพิ่มระดับ blur+saturate ให้ใกล้เคียง
//     iOS translucent material มากขึ้น (ดู .top-bar, .bottom-nav ใน globals.css)
//   - แก้ตำแหน่งปุ่ม (i) ในหัวข้อ "รายการย่อย" ที่เคยไปอยู่กึ่งกลางระหว่าง
//     title กับ count badge — ตอนนี้ติดกับคำว่า "รายการย่อย" แล้ว
//     (ดู src/modules/events/event-detail-client.tsx + .yp-detail-section__title-group)
//   - รายการย่อยในกลุ่มรายการ แสดงแยกช่วงเช้า/ช่วงบ่าย/ไม่ระบุเวลา อัตโนมัติ
//     เมื่อมีมากกว่า 1 กลุ่มที่ไม่ว่าง (ดู taskTimeGroups ใน event-detail-client.tsx)
//   - Active/press state ของการ์ดต่างๆ นุ่มนวลขึ้น (decelerate easing, ยืดเวลาเล็กน้อย)
//     และเพิ่มให้การ์ดรายการย่อย (.yp-task-row) มี press feedback ที่ไม่เคยมีมาก่อน
//   - คำศัพท์: "กำลังทำอยู่" → "กำลังดำเนินการ" ทั่วทั้งเว็บ (เป็นทางการขึ้น)
//     และใช้ "ณ เวลา" แทนคำว่า "เวลา" เฉยๆ ในบริบทที่หมายถึงเวลาเริ่มลงมือทำ
//
// ★ v3.9.9: Today Dashboard + Session Cache
//   - ไม่มีการเปลี่ยนแปลงที่ AppShell component โดยตรง
//   - การเปลี่ยนแปลงอยู่ใน:
//     - src/lib/utils/session-cache.ts (ใหม่ — cache utility)
//     - src/lib/hooks/use-realtime.ts (เพิ่ม cache ให้ useRealtimeEvents + useRealtimeEventById)
//     - src/modules/today/today-client.tsx (แสดง รายการย่อยที่ due_date = วันนี้)
//     - src/modules/today/today-task-card.tsx (ใหม่ — card สำหรับ รายการย่อย)
//     - src/modules/profile/profile-view.tsx (ล้าง cache ตอน logout)
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
  { key: 'events',   label: 'รายการ',     href: '/events',   icon: ListTodo },
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
          aria-label="สร้างรายการใหม่"
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
