# YP Work

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางรายการ ชุดรายการ ฝ่ายงาน และรายการย่อย
>
> **เวอร์ชันปัจจุบัน: v3.10.0-r48**

## เกี่ยวกับโครงการ

YP Work เป็นแพลตฟอร์มสำหรับช่วยบริหารจัดการรายการและติดตามภารกิจของสภานักเรียน
พัฒนาขึ้นจากประสบการณ์การทำงานจริงภายในสภานักเรียน เพื่อแก้ไขปัญหาการลืมรายการ
การติดตามความคืบหน้า และการประสานงานระหว่างสมาชิกให้มีประสิทธิภาพมากขึ่ง

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

## โครงสร้างโปรเจกต์ (r48 — NASA/SpaceX Modular Architecture)

```
src/
├── app/              # Next.js App Router (routes only — no business logic)
│   ├── (app)/        # protected routes (today, calendar, events, profile, about)
│   ├── login/        # หน้า login
│   ├── register/     # หน้าลงทะเบียน
│   ├── pending-status/  # หน้าสถานะการลงทะเบียน
│   └── api/          # API routes
│
├── modules/                      # Feature modules (space stations)
│   ├── _shared/                  # shared UI primitives between modules
│   │   ├── status-meta.ts        #   STATUS_META + TASK_STATUS_ORDER + EVENT_STATUS_ORDER
│   │   ├── status-picker-sheet.tsx
│   │   └── index.ts              # ★ barrel export (public airlock)
│   ├── today/                    # Station: Today
│   │   ├── today-types.ts        #   shared types (TimelineItem, DateCluster, etc.)
│   │   ├── today-helpers.ts      #   item builders + categorization
│   │   ├── today-sorting.ts      #   sort functions
│   │   ├── today-format.ts       #   schedule label + card time formatters
│   │   ├── today-item-card.tsx   #   TodayItemCard component
│   │   ├── today-client.tsx      #   ★ main orchestrator (908 lines, was 1462)
│   │   └── index.ts              #   barrel export
│   ├── events/                   # Station: Events
│   │   ├── event-detail-types.ts #   shared types (TaskPayload, EventPatch, PRIORITY_META, ...)
│   │   ├── task-row.tsx          #   TaskRow component
│   │   ├── task-time-group.tsx   #   TaskTimeGroup component
│   │   ├── add-task-sheet.tsx    #   AddTaskSheet component
│   │   ├── edit-task-sheet.tsx   #   EditTaskSheet component
│   │   ├── edit-event-sheet.tsx  #   EditEventSheet component
│   │   ├── event-detail-client.tsx # ★ main orchestrator (1256 lines, was 2500)
│   │   ├── create-event-form.tsx
│   │   ├── event-card.tsx
│   │   ├── events-list-view.tsx
│   │   ├── day-view-client.tsx
│   │   └── index.ts              #   barrel export
│   ├── calendar/                 # Station: Calendar
│   │   ├── calendar-view.tsx
│   │   └── index.ts
│   └── profile/                  # Station: Profile
│       ├── profile-view.tsx
│       └── index.ts
│
├── components/                   # Cross-cutting UI components
│   ├── framework/                # Window/Sheet framework (docking infrastructure)
│   │   ├── window.tsx            #   main window component (sheet/modal/fullscreen/sidepanel)
│   │   ├── avatar.tsx
│   │   ├── network-status-banner.tsx
│   │   ├── bottom-sheet.tsx      #   backward compat re-export
│   │   └── index.ts              # ★ barrel export
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   └── index.ts
│   └── ui/                       # shadcn/ui (unchanged)
│
├── lib/                          # Cross-cutting infrastructure
│   ├── core/                     # ★ Central Hub — shared infrastructure
│   │   ├── sheet-timing.ts       #   timing constants (must match CSS)
│   │   ├── fab-context.tsx       #   FAB context-aware (let pages override + button)
│   │   ├── toast-context.tsx     #   inline toast helper
│   │   ├── pending-delete-retry.ts # self-healing — retry failed deletes
│   │   ├── window-open-state.ts  # ★ r48 NEW: reactive view of window-open state
│   │   └── index.ts              # ★ barrel export
│   ├── hooks/
│   │   ├── use-realtime/         # ★ r48 SPLIT (was 1700 lines, now 14 files)
│   │   │   ├── client.ts         #   Supabase client singleton + useUniqueChannelName
│   │   │   ├── normalize.ts      #   normalizeEvent, normalizeTask, EVENT_FIELDS
│   │   │   ├── fetch.ts          #   fetchEvents, fetchEventById
│   │   │   ├── use-realtime-events.ts
│   │   │   ├── use-realtime-event-by-id.ts
│   │   │   ├── use-realtime-events-for-date.ts
│   │   │   ├── use-realtime-departments.ts
│   │   │   ├── use-realtime-profile-stats.ts
│   │   │   ├── use-realtime-activity-log.ts
│   │   │   ├── use-realtime-years.ts
│   │   │   ├── use-realtime-dept-members.ts
│   │   │   ├── use-realtime-session-user.ts
│   │   │   ├── use-realtime-pending-request.ts
│   │   │   └── index.ts          #   ★ barrel export (public airlock)
│   │   ├── use-scroll-direction.ts
│   │   ├── use-tutorial.ts
│   │   └── use-typing-pulse.ts
│   ├── auth/                     # ★ r48 SPLIT (was 852 lines, now 9 files)
│   │   ├── types.ts              #   LoginStatus, PendingRequestInfo, ServerStatusResult
│   │   ├── validation.ts         #   synthesizeEmail, validateNationalId, etc.
│   │   ├── check-status.ts       #   checkStatusViaServerApi (client-side)
│   │   ├── login-student.ts      #   loginStudent (student auth flow)
│   │   ├── login-other.ts        #   loginOther (teacher/other auth flow)
│   │   ├── session.ts            #   getSessionUser, profileToSessionUser, profileToUserProfile
│   │   ├── user-guard.ts         #   requireUser (server-side route guard)
│   │   ├── api-guard.ts          #   requireAdmin (server-side admin guard)
│   │   ├── logout.ts
│   │   └── index.ts              #   ★ barrel export (client-safe, NO server-only guards)
│   ├── security/                 # CSRF, rate-limit, audit-log, validation
│   ├── supabase/                 # supabase client (server + client + middleware)
│   ├── db/                       # event-loader, pending-requests
│   ├── api/                      # cache utility
│   ├── utils/                    # date, id, fetch-retry, user-color, session-cache
│   ├── types/                    # TypeScript types
│   ├── window-stack.ts           # Zustand store สำหรับ window stack
│   └── pending-session.ts
│
└── middleware.ts
```

## สถาปัตยกรรม r48 — NASA/SpaceX Modular Pattern

รอบ 48 ยกระดับ architecture ไปสู่**ระดับซอฟต์แวร์อวกาศ** ตามหลักการของ NASA และ SpaceX:

### หลักการออกแบบ (Design Principles)

1. **Single Responsibility Principle** — แต่ละไฟล์ทำงานอย่างเดียวให้ดีที่สุด
2. **Clear Interfaces (Airlock Pattern)** — แต่ละ module มี `index.ts` เป็น public interface
3. **Fault Isolation** — module ล้มเหลวไม่ทำลายทั้งระบบ (defensive coding)
4. **Single Source of Truth** — constants รวมศูนย์ที่ `lib/core/`
5. **No Magic Numbers** — ทุกตัวเลข timing ผูกกับ CSS ต้องประกาศที่ central core
6. **Backward Compatibility** — barrel exports รักษา import paths เดิม
7. **Server/Client Boundary Clarity** — server-only modules ไม่ถูก re-export ผ่าน client-safe barrel

### "Public Airlock" Pattern

ทุก module มี `index.ts` เป็น "public airlock" — code ภายนอกต้อง import ผ่าน barrel เท่านั้น:

```ts
// ✓ Correct — import ผ่าน barrel
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';
import { TodayClient } from '@/modules/today';
import { getSessionUser } from '@/lib/auth';

// ✗ Wrong — import internal file directly (except server-only guards)
import { useRealtimeEvents } from '@/lib/hooks/use-realtime/use-realtime-events';
```

**ข้อยกเว้น:** Server-only modules (`user-guard`, `api-guard`) ไม่ถูก re-export ผ่าน barrel เพื่อกัน client bundle ได้ `next/headers` และทำให้ build พัง ให้ import ตรง:
```ts
// Server-side consumer (API route, server page):
import { requireUser } from '@/lib/auth/user-guard';
import { requireAdmin } from '@/lib/auth/api-guard';
```

## การปรับปรุงสำคัญในรอบ 48

### Architecture Restructuring (ใหญ่ที่สุด)

- **use-realtime.ts (1700 → 14 ไฟล์)** — แยกตาม single responsibility:
  - `client.ts` (51 lines) — Supabase client singleton
  - `normalize.ts` (72 lines) — type normalizers
  - `fetch.ts` (33 lines) — HTTP fetch helpers
  - 11 hook files สำหรับแต่ละ entity (events, event-by-id, departments, ...)
  - `index.ts` (64 lines) — barrel export

- **event-detail-client.tsx (2500 → 1256 + 6 ไฟล์)** — แยก sub-components ออก:
  - `event-detail-types.ts` (104 lines) — shared types & constants
  - `task-row.tsx` (183 lines) — TaskRow component
  - `task-time-group.tsx` (73 lines) — TaskTimeGroup component
  - `add-task-sheet.tsx` (371 lines) — AddTaskSheet
  - `edit-task-sheet.tsx` (373 lines) — EditTaskSheet
  - `edit-event-sheet.tsx` (252 lines) — EditEventSheet
  - `event-detail-client.tsx` (1256 lines) — main orchestrator (ลด 50%)
  - `index.ts` (33 lines) — barrel export

- **today-client.tsx (1462 → 908 + 5 ไฟล์)** — แยก helpers, sorting, format:
  - `today-types.ts` (54 lines) — shared types
  - `today-helpers.ts` (146 lines) — item builders + categorization
  - `today-sorting.ts` (40 lines) — sort functions
  - `today-format.ts` (97 lines) — schedule label + card time formatters
  - `today-item-card.tsx` (286 lines) — TodayItemCard
  - `today-client.tsx` (908 lines) — main orchestrator (ลด 38%)
  - `index.ts` (32 lines) — barrel export

- **auth/index.ts (852 → 9 ไฟล์)** — แยกตาม auth flow:
  - `types.ts`, `validation.ts`, `check-status.ts`
  - `login-student.ts`, `login-other.ts`
  - `session.ts` (server-side helpers)
  - `user-guard.ts`, `api-guard.ts` (server-only — ไม่ re-export ผ่าน barrel)
  - `logout.ts`
  - `index.ts` (client-safe barrel)

### Bug Fixes (Critical)

**Bug #1 — FAB flash เมื่อปิด bottom sheet**
- อาการ: ปุ่ม + ที่ซ่อนอยู่ (เลื่อนลง) จะ "แวบ" ขึ้นมาสั้นๆ เมื่อปิด bottom sheet
- ต้นเหตุ: `lockScroll()` ทำให้ `body` เป็น `position:fixed` → `window.scrollY=0` → `useScrollDirection` ตั้ง `fabHidden=false` พอ sheet ปิด → `body.yp-window-open` ถูกลบ → FAB แสดง (flash) ก่อนที่ scroll event ถัดไปจะ set `fabHidden=true` ใหม่
- แก้:
  - เพิ่ม `lib/core/window-open-state.ts` — reactive view ของ window stack
  - `useScrollDirection` เช็ค `isWindowOpenRightNow()` ก่อนประมวลผล scroll event → ข้ามไปเลย
  - subscribe `onWindowOpenChange` — เมื่อ window ปิด → re-sync `lastY` จากตำแหน่งจริง + re-evaluate hidden state

**Bug #2 — Bottom sheet "warp" close**
- อาการ: เมื่อปิด bottom sheet หน้าเว็บด้านใต้ "กระโดด" กะทันหัน (วาร์ป)
- ต้นเหตุ: `Window` component มี scroll lock effect ที่ dep `[mounted, isOpen, isClosing, popupMode]` — พอ `setIsClosing(true)` cleanup รันทันที → `unlockScroll()` ทำ body position กลับเป็น static + `window.scrollTo()` ทันที → page กระโดดกลับตำแหน่งเดิมขณะที่ sheet ยังเลื่อนลงอยู่
- แก้: เปลี่ยน dep เป็น `[mounted, popupMode]` (เอา `isClosing`, `isOpen` ออก) → scroll lock ค้างไว้จนกว่า `mounted=false` (หลัง close animation)
- พร้อมเปลี่ยน register effect dep จาก `[open, type, dismissable]` เป็น `[mounted, type, dismissable]` → `body.yp-window-open` ค้างไว้จนกว่า sheet unmount (กัน Bug #1 fix ทำงานผิด)

### New Modules

- **`lib/core/window-open-state.ts`** — "docking port" สำหรับบอกว่ามี window เปิดอยู่ไหม
  - `useIsWindowOpen()` — reactive hook สำหรับ React components
  - `isWindowOpenRightNow()` — sync function สำหรับ event handlers
  - `onWindowOpenChange(callback)` — subscribe สำหรับ non-React modules

### Module Boundaries (Barrel Exports)

เพิ่ม `index.ts` barrel export ให้ทุก module เพื่อบังคับใช้ "public airlock" pattern:
- `src/modules/_shared/index.ts`
- `src/modules/today/index.ts`
- `src/modules/events/index.ts`
- `src/modules/calendar/index.ts`
- `src/modules/profile/index.ts`
- `src/lib/core/index.ts`
- `src/lib/hooks/use-realtime/index.ts`
- `src/lib/auth/index.ts` (client-safe — ไม่ re-export server-only guards)
- `src/components/framework/index.ts`
- `src/components/layout/index.ts`

## สถาปัตยกรรม r47 (ยังคงอยู่ — ก่อนหน้า r48)

- **Central Core (`lib/core/`)** — shared infrastructure (sheet-timing, fab-context, toast-context, pending-delete-retry)
- **Space Station Pattern** — แต่ละ module เป็นสถานีอวกาศที่มี airlock ชัดเจน
- **Shared Module (`modules/_shared/`)** — StatusPickerSheet + STATUS_META ที่ใช้ร่วมกัน
- **Magic numbers → Constants** — 280ms / 2400ms / 50ms → SHEET_CLOSE_DURATION / TOAST_AUTO_DISMISS / REACT_COMMIT_DURATION

## หมายเหตุ

ตั้งแต่ v3.9.8 เป็นต้นไป หน้า About จะไม่แสดงประวัติการอัพเดท (changelog) อีกต่อไป
หากต้องการดูประวัติการเปลี่ยนแปลงของแต่ละเวอร์ชัน ให้ดูใน git commit history
