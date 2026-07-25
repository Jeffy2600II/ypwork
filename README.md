# YP Work

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางรายการ ชุดรายการ ฝ่ายงาน และรายการย่อย
>
> **เวอร์ชันปัจจุบัน: v3.10.0** (เบต้า — อยู่ระหว่างพัฒนา)

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

## โครงสร้างโปรเจกต์ — Modular Architecture

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
│   │   └── index.ts              #   barrel export (public airlock)
│   ├── today/                    # Station: Today
│   │   ├── today-types.ts        #   shared types (TimelineItem, DateCluster, etc.)
│   │   ├── today-helpers.ts      #   item builders + categorization
│   │   ├── today-sorting.ts      #   sort functions
│   │   ├── today-format.ts       #   schedule label + card time formatters
│   │   ├── today-item-card.tsx   #   TodayItemCard component
│   │   ├── today-client.tsx      #   main orchestrator
│   │   └── index.ts              #   barrel export
│   ├── events/                   # Station: Events
│   │   ├── event-detail-types.ts #   shared types (TaskPayload, EventPatch, PRIORITY_META, ...)
│   │   ├── task-row.tsx          #   TaskRow component
│   │   ├── task-time-group.tsx   #   TaskTimeGroup component
│   │   ├── add-task-sheet.tsx    #   AddTaskSheet component
│   │   ├── edit-task-sheet.tsx   #   EditTaskSheet component
│   │   ├── edit-event-sheet.tsx  #   EditEventSheet component
│   │   ├── event-detail-client.tsx # main orchestrator
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
│   │   └── index.ts              #   barrel export
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   └── index.ts
│   └── ui/                       # shadcn/ui (unchanged)
│
├── lib/                          # Cross-cutting infrastructure
│   ├── core/                     # Central Hub — shared infrastructure
│   │   ├── sheet-timing.ts       #   timing constants (must match CSS)
│   │   ├── fab-context.tsx       #   FAB context-aware (let pages override + button)
│   │   ├── toast-context.tsx     #   inline toast helper
│   │   ├── pending-delete-retry.ts # self-healing — retry failed deletes
│   │   ├── window-open-state.ts  #   reactive view of window-open state
│   │   ├── scroll-lock.ts        #   no-warp scroll lock (overflow:hidden, no body shift)
│   │   └── index.ts              #   barrel export
│   ├── hooks/
│   │   ├── use-realtime/         # split into focused hook files
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
│   │   │   └── index.ts          #   barrel export (public airlock)
│   │   ├── use-scroll-direction.ts
│   │   ├── use-tutorial.ts
│   │   └── use-typing-pulse.ts
│   ├── auth/                     # split by auth flow
│   │   ├── types.ts              #   LoginStatus, PendingRequestInfo, ServerStatusResult
│   │   ├── validation.ts         #   synthesizeEmail, validateNationalId, etc.
│   │   ├── check-status.ts       #   checkStatusViaServerApi (client-side)
│   │   ├── login-student.ts      #   loginStudent (student auth flow)
│   │   ├── login-other.ts        #   loginOther (teacher/other auth flow)
│   │   ├── session.ts            #   getSessionUser, profileToSessionUser, profileToUserProfile
│   │   ├── user-guard.ts         #   requireUser (server-side route guard)
│   │   ├── api-guard.ts          #   requireAdmin (server-side admin guard)
│   │   ├── logout.ts
│   │   └── index.ts              #   barrel export (client-safe, NO server-only guards)
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

## สถาปัตยกรรม — NASA/SpaceX Modular Pattern

โครงสร้างนี้ออกแบบตามหลักการของซอฟต์แวร์อวกาศ เพื่อให้:
- เพิ่มฟังก์ชันใหม่ได้ง่าย (ปอกกล้วยเข้าปาก)
- แก้ไข/ดีบั๊กได้รวดเร็ว — รู้ทันทีว่าปัญหาอยู่ที่ module ไหน
- เสถียร — module หนึ่งล้มเหลว ไม่ทำลายทั้งระบบ
- แต่ละไฟล์มีขนาดพอเหมาะ ไม่ยาวเกินไป

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
// Correct — import ผ่าน barrel
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';
import { TodayClient } from '@/modules/today';
import { getSessionUser } from '@/lib/auth';

// Wrong — import internal file directly (except server-only guards)
import { useRealtimeEvents } from '@/lib/hooks/use-realtime/use-realtime-events';
```

**ข้อยกเว้น:** Server-only modules (`user-guard`, `api-guard`) ไม่ถูก re-export ผ่าน barrel เพื่อกัน client bundle ได้ `next/headers` และทำให้ build พัง ให้ import ตรง:
```ts
// Server-side consumer (API route, server page):
import { requireUser } from '@/lib/auth/user-guard';
import { requireAdmin } from '@/lib/auth/api-guard';
```

### Scroll Lock — No-Warp Pattern

`lib/core/scroll-lock.ts` ใช้วิธี `overflow:hidden` บน `<html>` เท่านั้น ไม่ย้าย `body` ไป `position:fixed`
ทำให้ตอน sheet ปิด scroll position ค้างที่เดิม — ไม่มี "วาร์ป" ที่มองเห็น
รองรับ nested windows ผ่าน count-based lock

### Window Open State — Reactive View

`lib/core/window-open-state.ts` เป็น reactive view ของ window stack:
- `useIsWindowOpen()` — reactive hook สำหรับ React components
- `isWindowOpenRightNow()` — sync function สำหรับ event handlers
- `onWindowOpenChange(callback)` — subscribe สำหรับ non-React modules

ใช้ป้องกัน FAB flash ตอน sheet ปิด — `useScrollDirection` sync `fabHidden` ทันทีที่ window stack ว่าง

### Module Boundaries (Barrel Exports)

ทุก module มี `index.ts` เป็น barrel export บังคับใช้ "public airlock" pattern:
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

## หมายเหตุ

ตั้งแต่ v3.9.8 เป็นต้นไป หน้า About จะไม่แสดงประวัติการอัพเดท (changelog) อีกต่อไป
หากต้องการดูประวัติการเปลี่ยนแปลงของแต่ละเวอร์ชัน ให้ดูใน git commit history
