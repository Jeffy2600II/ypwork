# YP Work

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางรายการ ชุดรายการ ฝ่ายงาน และรายการย่อย
>
> **เวอร์ชันปัจจุบัน: v3.10.0** (เบต้า — อยู่ระหว่างพัฒนา)

## เกี่ยวกับโครงการ

YP Work เป็นแพลตฟอร์มสำหรับช่วยบริหารจัดการรายการและติดตามภารกิจของสภานักเรียน
พัฒนาขึ้นจากประสบการณ์การทำงานจริงภายในสภานักเรียน เพื่อแก้ไขปัญหาการลืมรายการ
การติดตามความคืบหน้า และการประสานงานระหว่างสมาชิกให้มีประสิทธิภาพมากขึ้น

โครงการนี้เริ่มต้นจากแนวคิดของ **นายนนทกร นนท์สุราช**
ซึ่งดำรงตำแหน่งประธานนักเรียน ประจำปีการศึกษา 2569

## ผู้พัฒนา

**พัฒนาโดย นายนนทกร นนท์สุราช ร่วมกับ Rowingsco**

## เทคโนโลยี

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, Supabase (PostgreSQL)
- Vercel, Realtime WebSocket

## การติดตั้ง

```bash
npm install
npm run dev    # พัฒนา
npm run build  # build production
npm start      # รัน production
```

## โครงสร้างโปรเจกต์ — Modular Architecture (r50)

โครงสร้างนี้ออกแบบตามหลักการของซอฟต์แวร์อวกาศ (NASA/SpaceX style) เพื่อให้:
- เพิ่มฟังก์ชันใหม่ได้ง่าย (ปอกกล้วยเข้าปาก)
- แก้ไข/ดีบั๊กได้รวดเร็ว — รู้ทันทีว่าปัญหาอยู่ที่ module ไหน
- เสถียร — module หนึ่งล้มเหลว ไม่ทำลายทั้งระบบ
- แต่ละไฟล์มีขนาดพอเหมาะ ไม่ยาวเกินไป

```
src/
├── app/                          # Next.js App Router (routes only)
│   ├── (app)/                    # protected routes
│   ├── login/ register/ pending-status/
│   └── api/                      # API routes
│
├── modules/                      # Feature modules (space stations)
│   ├── _shared/                  # shared UI primitives
│   ├── today/                    # Station: Today
│   ├── events/                   # Station: Events
│   ├── calendar/                 # Station: Calendar
│   └── profile/                  # Station: Profile
│
├── components/
│   ├── framework/                # ★ r50: Framework แยกตามหน้าที่
│   │   ├── shared/               # shared utilities (overlay stack, scroll lock, timing)
│   │   │   ├── overlay-stack.ts          # Zustand store สำหรับ overlay stack
│   │   │   ├── scroll-lock.ts            # No-warp scroll lock (count-based)
│   │   │   ├── use-overlay-state.ts      # Reactive overlay state hooks
│   │   │   ├── timing-constants.ts       # Single source of truth สำหรับ timing
│   │   │   └── index.ts                  # Public airlock
│   │   │
│   │   ├── sheet/                # ★ r50: Mobile bottom sheet (separate system)
│   │   │   ├── bottom-sheet.tsx          # Mobile-only bottom sheet component
│   │   │   ├── use-sheet-drag.ts         # Drag-to-dismiss hook
│   │   │   └── index.ts                  # Public airlock
│   │   │
│   │   ├── popup/                # ★ r50: Desktop popup (separate system)
│   │   │   ├── dialog.tsx                # Desktop centered modal
│   │   │   ├── side-panel.tsx            # Desktop slide-in side panel
│   │   │   ├── fullscreen-overlay.tsx    # Full-page overlay
│   │   │   └── index.ts                  # Public airlock
│   │   │
│   │   ├── adaptive/             # ★ r50: Smart wrapper (picks sheet or popup)
│   │   │   ├── adaptive-overlay.tsx      # AdaptiveOverlay component
│   │   │   ├── use-viewport.ts           # Viewport size hook
│   │   │   └── index.ts                  # Public airlock
│   │   │
│   │   ├── fab/                  # ★ r50: FAB system (separate module)
│   │   │   ├── fab-context.tsx           # FAB context provider
│   │   │   ├── use-scroll-direction.ts   # Scroll-based show/hide
│   │   │   └── index.ts                  # Public airlock
│   │   │
│   │   ├── avatar.tsx            # Avatar component
│   │   ├── network-status-banner.tsx
│   │   ├── bottom-sheet.tsx      # ★ r50: Backward compat re-export
│   │   ├── window.tsx            # ★ r50: DEPRECATED — re-export from new modules
│   │   └── index.ts              # Top-level barrel
│   │
│   ├── layout/
│   │   └── app-shell.tsx         # ★ r50: ใช้ระบบ framework ใหม่
│   └── ui/                       # shadcn/ui
│
├── lib/                          # Cross-cutting infrastructure
│   ├── core/                     # Central Hub (r50: most files re-export from framework/)
│   │   ├── sheet-timing.ts       # ← re-export from framework/shared
│   │   ├── fab-context.tsx       # ← re-export from framework/fab
│   │   ├── scroll-lock.ts        # ← re-export from framework/shared
│   │   ├── window-open-state.ts  # ← re-export from framework/shared
│   │   ├── toast-context.tsx     # inline toast helper
│   │   ├── pending-delete-retry.ts # self-healing retry
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-scroll-direction.ts # ← r50: re-export from framework/fab
│   │   ├── use-realtime/
│   │   ├── use-tutorial.ts
│   │   └── use-typing-pulse.ts
│   ├── auth/ security/ supabase/ db/ api/ utils/ types/
│   ├── window-stack.ts           # ← r50: re-export from framework/shared
│   └── pending-session.ts
│
└── middleware.ts
```

## สถาปัตยกรรม — NASA/SpaceX Modular Pattern (r50)

### หลักการออกแบบ (Design Principles)

1. **Single Responsibility Principle** — แต่ละไฟล์ทำงานอย่างเดียวให้ดีที่สุด
2. **Clear Interfaces (Airlock Pattern)** — แต่ละ module มี `index.ts` เป็น public interface
3. **Fault Isolation** — module ล้มเหลวไม่ทำลายทั้งระบบ (defensive coding)
4. **Single Source of Truth** — constants รวมศูนย์ที่ `framework/shared/`
5. **No Magic Numbers** — ทุกตัวเลข timing ผูกกับ CSS ต้องประกาศที่ central core
6. **Backward Compatibility** — barrel exports รักษา import paths เดิม
7. **Server/Client Boundary Clarity** — server-only modules ไม่ถูก re-export ผ่าน client-safe barrel
8. **Strict Module Separation** — sheet (mobile) และ popup (desktop) เป็นคนละระบบ

### "Public Airlock" Pattern

ทุก module มี `index.ts` เป็น "public airlock" — code ภายนอกต้อง import ผ่าน barrel เท่านั้น:

```ts
// Correct — import ผ่าน barrel
import { BottomSheet, Dialog, useScrollDirection } from '@/components/framework';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';
import { TodayClient } from '@/modules/today';

// Wrong — import internal file directly
import { BottomSheet } from '@/components/framework/sheet/bottom-sheet';
```

### Overlay System — แยก Sheet (mobile) และ Popup (desktop) ★ r50

การปรับปรุงครั้งสำคัญใน r50: แยก BottomSheet (mobile) และ Dialog (desktop) ออกจากกัน
อย่างชัดเจน เพื่อลดความซับซ้อนและความเข้าใจผิดในการพัฒนา

#### โครงสร้างใหม่

```
framework/
├── shared/         → utilities ร่วม (overlay stack, scroll lock, timing)
├── sheet/          → mobile bottom sheet (slide + drag-to-dismiss)
├── popup/          → desktop centered dialog + side panel + fullscreen
├── adaptive/       → smart wrapper เลือก sheet หรือ popup ตาม viewport
└── fab/            → floating action button system
```

#### วิธีใช้

```tsx
// 1. Mobile-only bottom sheet (drag-to-dismiss)
import { BottomSheet } from '@/components/framework';
<BottomSheet open={open} onClose={close} title="Title">
  ...
</BottomSheet>

// 2. Desktop-only centered dialog
import { Dialog } from '@/components/framework';
<Dialog open={open} onClose={close} title="Title">
  ...
</Dialog>

// 3. Adaptive (auto-pick ตาม viewport) — แนะนำสำหรับ general use
import { AdaptiveOverlay } from '@/components/framework';
<AdaptiveOverlay open={open} onClose={close} title="Title">
  ...
</AdaptiveOverlay>
```

#### Bug Fixes ใน r50

1. **แก้บั๊ก bottom sheet close "jump แทน slide"**
   - สาเหตุ: CSS transition ใช้ `accelerate` easing ทำให้ motion ส่วนใหญ่เกิดท้าย duration
   - วิธีแก้: ใช้ `emphasized` easing ตลอดทั้ง open/close (consistent feel)
   - เพิ่ม `requestAnimationFrame` ระหว่าง state change เพื่อ ensure browser commit

2. **แก้บั๊ก FAB ไม่ซ่อนตอนเปิด sheet**
   - สาเหตุ: CSS `body.yp-window-open .fab` ตอบสนองช้า
   - วิธีแก้: ใช้ `useIsSheetOpen()` hook เป็น reactive source of truth
   - AppShell ส่ง class `is-hidden-by-overlay` ให้ FAB ทันทีที่ sheet เปิด

3. **แก้บั๊ก FAB flash ตอน sheet ปิด**
   - สาเหตุ: CSS class ถูกลบก่อนที่ useScrollDirection จะ re-evaluate
   - วิธีแก้: ใช้ reactive state แทน CSS class — ไม่มี timing gap

4. **แยก CSS namespace**
   - `.yp-sheet-*` (mobile bottom sheet) แยกจาก `.yp-popup-*` (desktop dialog)
   - ลดความสับสนในการ debug

### Overlay Stack — Single Source of Truth

`framework/shared/overlay-stack.ts` เป็น Zustand store ที่จัดการ stack ของ overlay ทั้งหมด:
- รองรับ nested overlays (sheet เปิดซ้อน sheet ได้ไม่จำกัด)
- Auto z-index — ไม่ต้องจัดการเอง
- Top-only events — ESC ส่งเฉพาะ overlay บนสุด
- Body class sync — `yp-overlay-open`, `yp-overlay-open--sheet`, `yp-overlay-open--popup`

### Reactive Overlay State — Hooks

`framework/shared/use-overlay-state.ts`:
- `useIsOverlayOpen()` — มี overlay เปิดอยู่ไหม (ทุกประเภท)
- `useIsSheetOpen()` — มี sheet/fullscreen เปิดอยู่ไหม (ซ่อน FAB + nav)
- `useIsPopupOpen()` — มี popup/sidepanel เปิดอยู่ไหม (ซ่อน FAB เท่านั้น)
- `isSheetOpenRightNow()` — sync function สำหรับ event handlers
- `onSheetOpenChange(callback)` — subscribe สำหรับ non-React modules

### Scroll Lock — No-Warp Pattern

`framework/shared/scroll-lock.ts` ใช้วิธี `overflow:hidden` บน `<html>` เท่านั้น
ไม่ย้าย `body` ไป `position:fixed` ทำให้ตอน overlay ปิด scroll position ค้างที่เดิม
ไม่มี "วาร์ป" ที่มองเห็น รองรับ nested overlays ผ่าน count-based lock

### Timing Constants — Single Source of Truth

`framework/shared/timing-constants.ts`:
- ทุก magic number ต้องประกาศที่นี่
- ทุกไฟล์ต้อง import จากที่นี่ ห้าม hardcoded ตัวเลข
- ค่าต้องตรงกับ CSS เป๊ะ
- แยกหมวดตามหน้าที่: `SHEET_TIMING`, `POPUP_TIMING`, `FAB_TIMING`, `NAV_TIMING`, etc.

### Module Boundaries (Barrel Exports)

ทุก module มี `index.ts` เป็น barrel export:
- `src/components/framework/index.ts` (top-level)
- `src/components/framework/shared/index.ts`
- `src/components/framework/sheet/index.ts`
- `src/components/framework/popup/index.ts`
- `src/components/framework/adaptive/index.ts`
- `src/components/framework/fab/index.ts`
- `src/modules/_shared/index.ts`
- `src/modules/today/index.ts`
- `src/modules/events/index.ts`
- `src/modules/calendar/index.ts`
- `src/modules/profile/index.ts`
- `src/lib/core/index.ts`
- `src/lib/hooks/use-realtime/index.ts`
- `src/lib/auth/index.ts` (client-safe — ไม่ re-export server-only guards)

## การปรับปรุงรอบที่ 50 (r50)

การปรับปรุงครั้งนี้เป็นการปรับปรุงใหญ่ที่:
1. แยกระบบ BottomSheet (mobile) และ Popup (desktop) ออกจากกัน
2. แก้บั๊ก close animation ที่ "jump แทน slide"
3. แก้บั๊ก FAB ไม่ซ่อนตอนเปิด sheet และ flash ตอนปิด
4. ปรับโครงสร้าง framework ให้เป็น modular มากขึ้น (aerospace-grade)
5. รักษา backward compatibility สำหรับ code เดิมทั้งหมด

## หมายเหตุ

ตั้งแต่ v3.9.8 เป็นต้นไป หน้า About จะไม่แสดงประวัติการอัพเดท (changelog) อีกต่อไป
หากต้องการดูประวัติการเปลี่ยนแปลงของแต่ละเวอร์ชัน ให้ดูใน git commit history
