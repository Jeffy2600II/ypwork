# YP Work · Full Web Application

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อย
> Next.js 16 + TypeScript + React + Supabase · โฮสต์ที่ Vercel
>
> **เวอร์ชันปัจจุบัน: v1.8.0** — แก้บั๊กส่งคำขอสมัคร + ขยาย Realtime ทั่วทั้งเว็บ

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
│   ├── login/page.tsx            # Login (public)
│   ├── register/page.tsx         # Register (public)
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
│   │   ├── index.ts              # Auth utilities (login, getSessionUser)
│   │   └── logout.ts             # Logout helper
│   ├── types/index.ts            # TypeScript types
│   ├── utils/
│   │   ├── date.ts               # Date helpers (Thai locale)
│   │   └── ...
│   └── hooks/
│       ├── use-session-user.ts   # Client session hook
│       └── use-realtime.ts       # v1.8 — 6 hooks: events, eventById,
│                                  #         eventsForDate, departments,
│                                  #         profileStats, activityLog
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
