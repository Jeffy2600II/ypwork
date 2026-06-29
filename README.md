# YP Work · Full Web Application

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อย
> Next.js 16 + TypeScript + React + Supabase · โฮสต์ที่ Vercel

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
│   │   ├── events-list-view.tsx  # List with filters
│   │   ├── event-detail-client.tsx  # Detail interactive
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
│       └── use-session-user.ts   # Client session hook
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
- ตาราง `ypwork_departments` (ฝ่ายงาน)
- ตาราง `ypwork_events` (งาน)
- ตาราง `ypwork_tasks` (task ย่อย)
- ตาราง `ypwork_task_assignees` (ผู้รับผิดชอบ task)
- ตาราง `ypwork_event_members` (สมาชิกงาน)
- ตาราง `ypwork_activity_log` (log)
- Row Level Security policies
- Triggers (auto-update updated_at)
- Realtime สำหรับ live updates
- Seed data สำหรับ 6 ฝ่ายงาน

**หมายเหตุ**: ใช้ร่วมกับ YP Labs — แชร์ตาราง `council_users` สำหรับข้อมูลผู้ใช้

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

### Register Flow (demo)

ส่งคำขอสมัคร — ในเวอร์ชั่นนี้เป็น demo (แสดง success state แต่ยังไม่สร้าง user จริง) การสร้าง user จริงต้องใช้ service role key ที่ server-side ซึ่งจะทำในเวอร์ชั่นถัดไป

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

### Profile (`/profile`)
- Hero gradient + avatar 96px
- สถิติ 4 ตัว
- ข้อมูลบัญชี (masked IDs)
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
