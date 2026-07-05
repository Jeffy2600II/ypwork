# YP Work · Full Web Application

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อย
> Next.js 16 + TypeScript + React + Supabase · โฮสต์ที่ Vercel
>
> **เวอร์ชันปัจจุบัน: v1.9.3** — auto sign-in ทันทีเมื่อ admin อนุมัติคำขอสมัคร (user ไม่ต้อง login ใหม่)

---

## ภาพรวม

YP Work เว็บเต็ม — แปลงจาก demo v8.2 เป็นเว็บจริงที่ใช้งานได้ 100% พร้อมฐานข้อมูล Supabase และระบบ auth จริง

### เทคโนโลยี
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 + custom design tokens (Indigo Trust theme)
- **Database**: Supabase (PostgreSQL) — ร่วม project กับ YP Labs
- **Auth**: Supabase Auth + custom login flow (national_id + student_code หรือ email + password)
- **UI Components**: shadcn/ui (New York style) + Lucide icons
- **Hosting**: Vercel (optimized สำหรับ serverless)

### โครงสร้าง Modular
```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Protected routes (auth gate)
│   │   ├── layout.tsx            # Auth gate + AppShell wrapper
│   │   ├── today/page.tsx        # Today Dashboard
│   │   ├── calendar/page.tsx     # Calendar (month view)
│   │   ├── events/
│   │   │   ├── page.tsx          # Events list
│   │   │   ├── [id]/page.tsx     # Event detail
│   │   │   ├── create/page.tsx   # Create event
│   │   │   └── day/[date]/page.tsx  # Day view
│   │   └── profile/page.tsx      # Profile
│   ├── login/page.tsx            # Login (public, v1.9 — pending flow)
│   ├── register/page.tsx         # Register (public, v1.9 — auto-login)
│   ├── pending-status/           # v1.9 — Pending status page (public)
│   │   ├── page.tsx              # Server component shell
│   │   └── pending-status-client.tsx  # Realtime UI (subscribe council_join_requests)
│   ├── layout.tsx                # Root layout (fonts + metadata)
│   ├── page.tsx                  # Root redirect
│   └── globals.css               # Design tokens + base styles
├── modules/                      # Feature modules (แยกตาม feature)
│   ├── today/
│   ├── calendar/
│   ├── events/
│   │   ├── event-card.tsx        # Shared event card component
│   │   ├── events-list-view.tsx  # List with filters (realtime)
│   │   ├── event-detail-client.tsx  # Detail interactive (realtime)
│   │   ├── day-view-client.tsx   # Day view (v1.8 realtime)
│   │   └── create-event-form.tsx # Create/edit form
│   └── profile/
├── components/
│   ├── layout/
│   │   └── app-shell.tsx         # App shell (top-bar + nav + FAB)
│   ├── framework/
│   │   ├── avatar.tsx            # SVG avatar (copy-resistant)
│   │   └── bottom-sheet.tsx      # Bottom sheet (drag-to-dismiss)
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts         # Auth middleware
│   ├── auth/
│   │   ├── index.ts              # Auth utilities (login, getSessionUser, v1.9 — pending flow)
│   │   └── logout.ts             # Logout helper
│   ├── types/index.ts            # TypeScript types
│   ├── utils/
│   │   ├── date.ts               # Date helpers (Thai locale)
│   │   └── ...
│   ├── pending-session.ts        # v1.9 — Pending session manager (localStorage)
│   └── hooks/
│       ├── use-session-user.ts   # Client session hook
│       └── use-realtime.ts       # v1.8 — 6 hooks: events, eventById,
│                                  #         eventsForDate, departments,
│                                  #         profileStats, activityLog
│                                  # v1.9 — useRealtimePendingRequest
└── middleware.ts                 # Next.js middleware (auth guard)
```

---

## การตั้งค่า

### 1. Environment Variables

สร้างไฟล์ `.env.local` ใน root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # สำหรับ server-side admin operations
```

หรือตั้งใน Vercel Dashboard → Settings → Environment Variables

> **v1.8.3**: รองรับทั้ง `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy) และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vercel × Supabase integration ใช้ชื่อนี้) — สามารถตั้งอันใดอันหนึ่งหรือทั้งสองได้ (PUBLISHABLE_KEY จะถูกใช้ก่อน)

### 2. Database Setup

คัดลอก SQL จาก `supabase/migrations/ypwork_schema.sql` ไปวางใน Supabase SQL Editor แล้วกด Run

สิ่งที่ SQL นี้สร้าง:
- ตาราง `departments` (ฝ่ายงาน — v1.7: rename จาก `ypwork_departments`)
- ตาราง `ypwork_events` (งาน)
- ตาราง `ypwork_tasks` (task ย่อย)
- ตาราง `ypwork_task_assignees` (ผู้รับผิดชอบ task)
- ตาราง `ypwork_event_members` (สมาชิกงาน)
- ตาราง `ypwork_activity_log` (log)
- เพิ่ม column `department_id` ใน `council_users` (FK → departments)
- เพิ่ม column `department_id` ใน `council_join_requests` (FK → departments)
- Row Level Security policies (รวม policy สำหรับ anon อ่าน departments ได้)
- Triggers (auto-update updated_at)
- Realtime สำหรับ live updates
- Seed data สำหรับ 6 ฝ่ายงาน

**หมายเหตุ**: ใช้ร่วมกับ YP Labs — แชร์ตาราง `council_users` และ `council_join_requests`

#### สำหรับอัปเกรดจาก v1.9.2 → v1.9.3 (Frontend-only — ไม่ต้องรัน SQL)

อัปเกรดนี้เป็น frontend-only — **ไม่ต้องรัน SQL เพิ่ม** และ **ไม่ต้องแก้ฐานข้อมูลใด ๆ**

การแก้ไขใน v1.9.3:

1. **★ แก้บั๊กสำคัญ ★ — auto sign-in ทันทีเมื่อ admin อนุมัติคำขอสมัคร:**
   - **อาการก่อนหน้านี้:** เมื่อ admin อนุมัติคำขอสมัคร ระบบเด้งกลับไปหน้า `/login` ทั้งที่ user รออยู่ตั้งแต่แรก ต้อง login ใหม่อีกครั้ง
   - **สาเหตุ:** pending-status-client เพียงแค่ `router.replace('/today')` หลังตรวจพบ `status='approved'` — แต่ user ยังไม่ได้ sign-in กับ Supabase Auth จริง (pending session เป็นเพียง localStorage state) → middleware ตรวจพบ `!user` → redirect กลับไป `/login`
   - **การแก้ไข:** เมื่อ `useRealtimePendingRequest` ตรวจพบ `status='approved'` ระบบจะ **sign-in กับ Supabase Auth อัตโนมัติ** ก่อน redirect ไป `/today` — user ใช้งานระบบได้ทันทีโดยไม่ต้อง login ใหม่

2. **การคำนวณ credentials สำหรับ auto sign-in:**
   - **นักเรียน:** email = `synthesizeEmail(student_id)` (`student_<code>@yplabs.internal`), password = `student_id` (เหมือน flow login ปกติ)
   - **ครู/อื่นๆ:** email = `session.email`, password = `session.password` (เก็บใน pending session ตอนส่งคำขอ)

3. **Race condition protection:**
   - เพิ่ม retry สูงสุด 6 ครั้ง (delays: 0ms, 600ms, 800ms, 1000ms, 1500ms, 2000ms — รวมระยะเวลา ~6 วินาที)
   - รอให้ auth account พร้อมหลัง admin approve — ป้องกันการ sign-in ล้มเหลวจาก delay ระหว่างการ insert `council_users` กับการที่ auth account พร้อมใช้งาน
   - มี guard `signingInRef` ป้องกันการ sign-in ซ้ำซ้อนจาก realtime events ที่มาพร้อมกัน

4. **เพิ่ม field `password` ใน `PendingSession` interface:**
   - ใช้สำหรับเก็บ password ของครู/อื่นๆ (นักเรียนไม่ต้องเก็บ เพราะคำนวณได้จาก `student_id`)
   - password ถูกล้างทันทีหลัง sign-in สำเร็จผ่าน `clearPendingSessionPassword()` (ไม่ค้างใน localStorage)

5. **Visual state ใหม่:**
   - เพิ่ม state `approved_signing_in` — แสดง spinner ขณะกำลัง sign-in เพื่อให้ user รู้ว่าระบบกำลังทำงาน (ไม่ใช่ค้าง)
   - เมื่อ sign-in สำเร็จ → แสดง CheckCircle2 + ข้อความ "เข้าสู่ระบบสำเร็จ! กำลังพาคุณไปต่อ..." แล้ว redirect ไป `/today`
   - เมื่อ sign-in ล้มเหลวหลัง retry ครบ → fallback ไป `/login` พร้อม toast แจ้ง (กรณี edge case)

6. **ไฟล์ที่แก้ไข:**
   - `src/lib/pending-session.ts` — เพิ่ม `password` field ใน PendingSession + `clearPendingSessionPassword()` helper
   - `src/app/pending-status/pending-status-client.tsx` — เพิ่ม `performAutoSignIn()` + retry logic + signing-in visual state
   - `src/app/register/register-form.tsx` — เก็บ password ของครู/อื่นๆ ใน pending session
   - `src/app/login/page.tsx` — เก็บ password ของครู/อื่นๆ ใน pending session (เมื่อ user login แล้วยัง pending)
   - `src/app/(app)/about/page.tsx` — เพิ่ม changelog สำหรับ v1.9.3 + อัปเดต version string

7. **การไหลของข้อมูล (Data flow) ใหม่:**
   ```
   ┌─────────────────┐              ┌──────────────────┐
   │ /pending-status │ ◄──────────  │  admin approves  │
   │ (realtime UI)   │   realtime   │  คำขอสมัคร       │
   └─────────────────┘              └──────────────────┘
            │                                 │
            │ status='approved'               │
            ▼                                 │
   ┌──────────────────────┐                   │
   │ 1. auto sign-in      │                   │
   │    Supabase Auth     │                   │
   │    (retry 6x)        │                   │
   └──────────────────────┘                   │
            │                                 │
            │ sign-in สำเร็จ                  │
            ▼                                 │
   ┌──────────────────────┐                   │
   │ 2. clear pending     │                   │
   │    session           │                   │
   └──────────────────────┘                   │
            │                                 │
            ▼                                 │
   ┌──────────────────────┐                   │
   │ 3. redirect to /today│ ← user ใช้งานได้   │
   │    (full access)     │   ทันที!           │
   └──────────────────────┘                   │
                                              │
            ถ้า sign-in ล้มเหลวหลัง retry:    │
            ┌──────────────────────┐           │
            │ fallback to /login   │           │
            │ (พร้อม toast แจ้ง)   │           │
            └──────────────────────┘           │
   ```

8. **ความปลอดภัย:**
   - password ของครู/อื่นๆ ถูกเก็บใน localStorage ฝั่ง client เท่านั้น (เหมือนเดิม — pending session)
   - password ถูกล้างทันทีหลัง sign-in สำเร็จผ่าน `clearPendingSessionPassword()`
   - ไม่ส่ง password ไปที่ server ใด ๆ — ใช้เฉพาะ `supabase.auth.signInWithPassword()` ฝั่ง client

#### สำหรับอัปเกรดจาก v1.8.3 → v1.9.0 (Frontend-only — ไม่ต้องรัน SQL)

อัปเกรดนี้เป็น frontend-only — **ไม่ต้องรัน SQL เพิ่ม** และ **ไม่ต้องแก้ฐานข้อมูลใด ๆ**

การแก้ไขใน v1.9.0:

1. **★ ฟีเจอร์ใหม่หลัก ★ — ระบบ login ที่รองรับผู้ใช้ pending (ส่งคำขอแล้วแต่ยังไม่อนุมัติ):**
   - เมื่อ user กรอก `national_id + student_code` (หรือ `email + password` สำหรับครู/อื่นๆ) ที่หน้า login → ระบบตรวจสอบขั้นตอนต่อไปนี้ตามลำดับ:
     1. ลอง `signInWithPassword` (เหมือนเดิม) → ถ้าสำเร็จ และ approved → เข้าระบบปกติ (flow เดิม ไม่เปลี่ยนแปลง)
     2. ถ้า signIn ล้มเหลว → ตรวจ `localStorage` ว่าเคยถูกปฏิเสธหรือไม่ → ถ้าเคย → แสดงข้อความ "คำขอถูกปฏิเสธ"
     3. ถ้าไม่เคยถูกปฏิเสธ → ตรวจ `council_join_requests` ดูมีคำขออยู่หรือไม่ → ถ้ามี → set pending session + redirect ไป `/pending-status`
     4. ถ้าไม่พบทั้งใน auth และ join_requests → แสดงข้อความ "ยังไม่มีบัญชี" + ปุ่ม "ส่งคำขอสมัคร"

2. **★ ฟีเจอร์ใหม่ ★ — Auto-login หลังส่งคำขอสมัคร:**
   - เมื่อ user กรอก form สมัครและ insert สำเร็จ → ระบบ set pending session และ redirect ไป `/pending-status` อัตโนมัติ
   - ไม่ต้องไปกด "เข้าสู่ระบบ" ด้วยตัวเอง — ลดขั้นตอนที่ยุ่งยาก

3. **★ หน้าใหม่ ★ — `/pending-status` (public route):**
   - หน้าสำหรับ user ที่ส่งคำขอแล้ว — แสดงข้อมูลคำขอ (ชื่อ, รหัสนักเรียน, วันที่ส่ง, สถานะ)
   - อัพเดตสถานะแบบ **realtime** — เมื่อ admin อนุมัติหรือปฏิเสธ ระบบตรวจพบทันทีผ่าน `useRealtimePendingRequest` hook
   - เมื่อ **อนุมัติ** → ระบบ auto-redirect ไป `/today` (เข้าระบบจริงโดยอัตโนมัติ)
   - เมื่อ **ปฏิเสธ** → ระบบ sign out + แสดงข้อความ "ถูกปฏิเสธ" + บันทึกใน localStorage (เพื่อแจ้งเตือนเมื่อกลับมา login)

4. **★ ไม่แก้ฐานข้อมูล ★** — ตาม requirement ของ user:
   - ไม่เพิ่มตาราง ไม่เพิ่ม column ไม่ต้องรัน SQL
   - ข้อมูล "การปฏิเสธ" เก็บใน `localStorage` เท่านั้น (ฝั่ง client) — ใช้สำหรับแสดงข้อความ "ถูกปฏิเสธ" เมื่อ user กลับมา login
   - เมื่อ user ส่งคำขอใหม่ → สถานะ rejected ใน localStorage ถูกเคลียร์อัตโนมัติ

5. **ไฟล์ใหม่ที่เพิ่ม:**
   - `src/lib/pending-session.ts` — manager สำหรับ pending session + rejected accounts (localStorage)
   - `src/app/pending-status/page.tsx` — server component shell
   - `src/app/pending-status/pending-status-client.tsx` — client component พร้อม realtime subscription
   - `src/components/pending-session-cleanup.tsx` — เคลียร์ pending session ที่ค้างไว้เมื่อ user approved แล้ว

6. **ไฟล์ที่แก้ไข:**
   - `src/lib/auth/index.ts` — เพิ่ม `LoginStatus` type + ปรับ `loginStudent`/`loginOther` ให้ตรวจ pending status หลัง signIn ล้มเหลว
   - `src/lib/hooks/use-realtime.ts` — เพิ่ม `useRealtimePendingRequest` hook
   - `src/lib/supabase/middleware.ts` — อนุญาต `/pending-status` เป็น public route
   - `src/app/login/page.tsx` — จัดการ status=pending/rejected/not_found + auto-redirect จาก pending session
   - `src/app/register/register-form.tsx` — set pending session + redirect ไป `/pending-status` หลัง insert สำเร็จ
   - `src/app/(app)/layout.tsx` — เพิ่ม PendingSessionCleanup component

7. **การไหลของข้อมูล (Data flow):**
   ```
   ┌─────────────────┐    submit    ┌──────────────────┐
   │  /register      │ ──────────►  │ council_join_   │
   │  (fill form)    │              │ requests (DB)   │
   └─────────────────┘              └──────────────────┘
            │                                 ▲
            │ auto-login (set pending         │ realtime
            │ session in localStorage)        │ subscribe
            ▼                                 │
   ┌─────────────────┐              ┌──────────────────┐
   │ /pending-status │ ◄──────────  │  admin approves  │
   │ (realtime UI)   │              │  / rejects       │
   └─────────────────┘              └──────────────────┘
            │                                 │
            │ approved →                      │ rejected →
            │ redirect /today                 │ mark in localStorage
            │                                 ▼
            │                        ┌──────────────────┐
            │                        │ /login → "ถูก    │
            │                        │ ปฏิเสธ" message   │
            │                        └──────────────────┘
            ▼
   ┌─────────────────┐
   │ /today (full    │
   │  access)        │
   └─────────────────┘
   ```

8. **เงื่อนไขของระบบ:**
   - ใช้ Supabase Realtime ที่เปิดอยู่แล้วบน `council_join_requests` และ `council_users` (ตั้งแต่ v1.8)
   - ไม่กระทบระบบ login ของผู้ใช้ที่ approved แล้ว (flow เดิมยังใช้ได้ปกติ)
   - สำหรับครู/อื่นๆ: ระบบไม่สามารถ auto-redirect ไป /today ได้หลังอนุมัติ (เพราะไม่เก็บ password ใน localStorage) — ผู้ใช้ต้อง login ด้วยตัวเอง แต่ระบบจะแสดงสถานะ "อนุมัติแล้ว" ในหน้า /pending-status

#### สำหรับอัปเกรดจาก v1.8.2 → v1.8.3 (Frontend-only — ไม่ต้องรัน SQL)

อัปเกรดนี้เป็น frontend-only — **ไม่ต้องรัน SQL เพิ่ม**

การแก้ไขใน v1.8.3:

1. **★ แก้บั๊กสำคัญ ★:** หน้า **Home (Today)** และ **Profile** ขึ้น "This page couldn't load. Reload to try again, or go back." — เกิดจาก 2 hooks ใช้ชื่อ channel เดียวกัน (AppShell + page component เรียก `useRealtimeSessionUser` ทั้งคู่) เวลา cleanup ของอันนึงไปทำลาย subscription ของอีกอัน → ใช้ `useUniqueChannelName()` แก้ให้แต่ละ hook มี channel ของตัวเอง

2. **★ แก้บั๊กสำคัญ ★:** รองรับ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vercel × Supabase integration ใช้ชื่อนี้) เพิ่มจาก `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy) — ก่อนหน้านี้ถ้า Vercel ตั้งแค่ PUBLISHABLE_KEY จะทำให้ `createBrowserClient` throw และ crash หน้า

3. **Defensive hooks:** `getClient()` ไม่ throw แล้ว — คืน null แล้วให้ hook ข้าม subscription (ป้องกัน crash ทั้งหน้าเวลา env var ไม่ครบ)

4. ทุก `useEffect` ที่ subscribe channel ถูกห่อด้วย try-catch — ถ้า subscribe ล้มเหลวจะแค่ log error ไม่ crash หน้า

5. ทุก cleanup `removeChannel` ห่อ try-catch — กัน throw ตอน channel ถูก remove ไปแล้ว

6. เพิ่ม `global-error.tsx` และ `error.tsx` สำหรับ (app) route group — แสดงข้อความ error จริง + ปุ่ม "ลองใหม่" / "ย้อนกลับ" แทนข้อความ generic "This page couldn't load"

7. Server-side `createClient()` และ middleware รองรับ `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` แบบ fallback ตามลำดับ

#### สำหรับอัปเกรดจาก v1.8.1 → v1.8.2 (Frontend-only — ไม่ต้องรัน SQL)

อัปเกรดนี้เป็น frontend-only — **ไม่ต้องรัน SQL เพิ่ม** เพราะตารางที่เกี่ยวข้องทั้งหมด (`ypwork_events`, `ypwork_tasks`, `ypwork_task_assignees`, `ypwork_event_members`, `departments`, `council_users`, `council_join_requests`, `ypwork_activity_log`, `council_years`) ถูกเพิ่มเข้า Realtime publication หมดแล้วตั้งแต่ v1.6/v1.7/v1.8/v1.8.1

การแก้ไขใน v1.8.2:

1. **★ แก้บั๊กสำคัญ ★:** หน้า home (Today) ไม่อัพเดตข้อมูลเมื่อย้อนกลับมาจากหน้าอื่น — เพราะ Next.js ใช้ cached RSC payload (30 วินาที) แล้ว hook ไม่ได้เรียก `reload()` ตอน mount ตอนนี้แก้แล้ว: ทุก hook เรียก `reload()` ทันทีหลัง mount เพื่อ bypass cache

2. **ขยาย realtime subscription:** ทุก hook (`useRealtimeEvents`, `useRealtimeEventById`, `useRealtimeEventsForDate`) ตอนนี้ subscribe 3 ตารางเพิ่ม:
   - `council_users` — คนเปลี่ยนชื่อ/สี/ฝ่าย → รายการ assignees / members อัพเดต
   - `departments` — admin เปลี่ยนชื่อ/ไอคอน/สีฝ่าย → ทุกหน้าอัพเดต
   - `ypwork_event_members` — คนเข้า/ออกงาน → รายการงานอัพเดต

3. **เพิ่ม hook ใหม่:**
   - `useRealtimeSessionUser` — ชื่อ/สี/ฝ่าย ของ user ตัวเองอัพเดต live (admin เปลี่ยนชื่อ, ย้ายฝ่าย, เปลี่ยนสี)
   - `useRealtimeDeptMembers` — สมาชิกในฝ่ายอัพเดต live (คนใหม่เข้าฝ่าย, คนถูก disabled)

4. **Realtime ครอบคลุม UI ทุกส่วน:**
   - **AppShell** (top-bar ทุกหน้า): avatar + name อัพเดต live
   - **Today (Home)**: hero name/color, dept overview (name/icon/description/members) ทั้งหมด live
   - **Profile**: ชื่อ/สี/ฝ่าย ของ user อัพเดต live (ก่อนหน้านี้ static)
   - **Calendar / Events list / Event detail / Day view**: reload ตอน mount + subscribe 6 ตาราง

#### สำหรับอัปเกรดจาก v1.8 → v1.8.1 (CRITICAL — ต้องรันก่อนใช้ v1.8.1)

รันไฟล์ **`ypwork-v1.8.1-national-id-and-years-from-db.sql`** บน Supabase SQL Editor (idempotent — รันซ้ำก็ปลอดภัย) สคริปต์นี้จะ:

1. **★ แก้บั๊กสำคัญ ★:** เพิ่มคอลัมน์ `national_id` ใน `council_join_requests` และ `council_users` — เพราะก่อนหน้านี้ form กรอกเลขบัตรประชาชน 13 หลัก แต่ payload ไม่ได้ส่ง field `national_id` ไปเลย (column ไม่มีอยู่ใน schema)
2. **★ เปลี่ยนปีการศึกษาจาก hardcoded → ดึงจาก DB ★:** เปิด RLS SELECT บน `council_years` ให้ `anon` อ่านได้ (ก่อนหน้านี้มีเฉพาะ `authenticated` → คนที่ยังไม่ login ไม่สามารถดึงรายการปีได้ → frontend ต้อง hardcoded ปีแทน)
3. **เพิ่ม Realtime** บน `council_years` — เมื่อ admin เพิ่ม/ปิดปี ผู้สมัครเห็นทันทีโดยไม่ต้อง refresh
4. **เพิ่ม index** บน `national_id` ของทั้งสองตาราง เพื่อค้นหาคำขอที่ซ้ำกันได้เร็วขึ้น

หลังรันแล้ว:
- ฟอร์มสมัครจะส่งเลขบัตรประชาชนไปในคำขอจริง ๆ (ไม่หายอีกต่อไป)
- รายการปีในฟอร์มสมัครดึงจากตาราง `council_years` ของ YP Labs แบบ realtime
- ปีที่ `closed=true` จะแสดงเป็น option ที่เลือกไม่ได้ พร้อม label `(ปิดรับ)`

#### สำหรับอัปเกรดจาก v1.7 → v1.8 (CRITICAL — ต้องรันก่อนใช้ v1.8)

รันไฟล์ **`ypwork-v1.8-realtime-and-rls-fix.sql`** บน Supabase SQL Editor (idempotent — รันซ้ำก็ปลอดภัย) สคริปต์นี้จะ:

1. **แก้บั๊กสำคัญ:** เพิ่ม RLS INSERT policy บน `council_join_requests` ให้ anon/authenticated สามารถส่งคำขอได้จริง (ก่อนหน้านี้ frontend แสดง "สำเร็จ" ทั้งที่จริง RLS บล็อกโดยเงียบ ๆ)
2. **ยืนยัน department_id** บน `council_users` และ `council_join_requests` (idempotent — re-affirm จาก v1.7)
3. **ขยาย Realtime ทั่วทั้งเว็บ:** เพิ่ม `council_users`, `council_join_requests`, `ypwork_activity_log` เข้า `supabase_realtime` publication พร้อม `REPLICA IDENTITY FULL`
4. **เพิ่ม RLS SELECT policy** บน `council_join_requests` ให้ user ตรวจสอบสถานะคำขอของตัวเองได้

หลังรันแล้ว:
- ฟอร์มสมัครจะแสดง **error จริง** แทน "สำเร็จปลอม" เมื่อมีปัญหา
- หน้าโปรไฟล์อัพเดต stats แบบ realtime
- หน้า Day View อัพเดต events แบบ realtime
- รายการฝ่ายในฟอร์มสมัครอัพเดตแบบ realtime เมื่อ admin เปลี่ยน

#### สำหรับอัปเกรดจาก v1.6 → v1.7

ถ้าคุณมี database v1.6 อยู่แล้ว ให้รัน `ypwork-v1.7-departments-and-user-department.sql` (idempotent — รันซ้ำก็ปลอดภัย) สคริปต์นี้จะ:
1. Rename `ypwork_departments` → `departments`
2. ย้าย FK ใน `ypwork_events` ให้ชี้ไป `departments`
3. เพิ่ม `department_id` ใน `council_users` และ `council_join_requests`
4. เพิ่ม `departments` เข้า Realtime publication

### 3. รัน Local

```bash
bun install
bun run dev
```

เปิด http://localhost:3000

### 4. Deploy ไป Vercel

1. Push โค้ดไป GitHub
2. ไป Vercel Dashboard → New Project → Import จาก GitHub
3. Framework Preset: Next.js
4. ตั้ง Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy

---

## ระบบ Auth

### Login Flow (เหมือน demo v8.2)

**นักเรียน**:
1. กรอกเลขบัตรประชาชน 13 หลัก + รหัสนักเรียน 5 หลัก
2. ระบบ query `council_users` หา profile
3. ถ้าเจอ → synthesize email (`student_<code>@yplabs.internal`) → sign in ด้วย Supabase Auth

**ครู/อื่นๆ**:
1. กรอก email + password
2. Sign in ด้วย Supabase Auth โดยตรง
3. ตรวจสอบ profile ใน `council_users`

### Register Flow (v1.8)

ส่งคำขอสมัครเข้า `council_join_requests` จริง — พร้อมการจัดการ error ที่ถูกต้อง:
1. เลือกประเภทบัญชี (นักเรียน/ครู/อื่นๆ)
2. กรอกข้อมูลให้ครบ
3. **เลือกฝ่ายได้ (optional)** — ส่ง `department_id` ไปพร้อมคำขอ (dropdown อัพเดต realtime)
4. Insert จริงเข้า `council_join_requests` ผ่าน RLS INSERT policy (anon ได้รับอนุญาต)
5. **ถ้าสำเร็จ** → แสดง success state
6. **ถ้าล้มเหลว** → แสดง error จริงใต้ปุ่ม submit พร้อมแปล error code ให้เข้าใจ
7. ผู้ดูแลตรวจสอบและ approve ผ่าน YP Labs admin

หมายเหตุ: การสร้าง Supabase Auth user จริงยังต้องใช้ service role key (ผู้ดูแลทำหลัง approve คำขอ)

---

## Features

### Today Dashboard (`/today`)
- Hero gradient + greeting + ชื่อ user + วันที่ไทย (พ.ศ.)
- สถิติ 3 ตัว (งานวันนี้/กำลังจะถึง/เลยกำหนด)
- งานวันนี้ + งานกำลังจะถึง + งานเลยกำหนด
- ภาพรวมฝ่าย (stat grid + สมาชิก)

### Calendar (`/calendar`)
- Month view ภาษาไทย (ปี พ.ศ.)
- วันนี้ highlight
- Event indicators
- กดวันที่ → ดูงานในวันนั้น

### Events (`/events`)
- List พร้อม filter 5 แบบ (ทั้งหมด/กลุ่มงาน/งานเดี่ยว/ที่ฉันมีส่วนร่วม/เลยกำหนด)
- Group by month
- Create event (group/single)
- Event detail (accent-driven theme)
- Task management (add/edit/delete/toggle status)
- Manage sheet (edit/delete event)
- **Day view (v1.8 — realtime)**: กดวันในปฏิทิน → list events ของวันนั้นอัพเดตแบบ live

### Profile (`/profile`) — v1.8 realtime
- Hero gradient + avatar 96px
- สถิติ 4 ตัว (อัพเดต realtime เมื่อ task/assignee/event เปลี่ยน)
- ข้อมูลบัญชี (masked IDs) — ฝ่ายแสดงข้อมูลล่าสุดเสมอ (realtime)
- ปุ่มออกจากระบบ

---

## Design System

ใช้ Indigo Trust theme จาก demo v8.2:
- **Colors**: Indigo #4F46E5 + Violet #7C3AED
- **Typography**: Noto Sans Thai + Inter
- **Radius**: 20/28/36/44/56/68px (premium rounded)
- **Hero gradients**: brand gradient + dust particles (นิ่ง ไม่ animate)
- **Accent-driven**: top-bar title + event detail hero เปลี่ยนสีตาม event color
- **CSS techniques**: contain, content-visibility, isolation, compositor-only transitions

---

## License

© 2026 YP Work · Student Council Hub
