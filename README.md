# ypwork

> **ระบบจัดการงานสภานักเรียน โรงเรียนคำยางพิทยา**
> ทุกงานของสภา อยู่ในที่เดียว ดูได้ทุกมุมมอง ไม่มีงานหล่นช่อง

ypwork คือ ระบบจัดการงานของสภานักเรียน ที่ทำหน้าที่เป็น "สมองของสภา" — แก้ปัญหาหลักที่ทุกสภานักเรียนเผชิญ: ลืมงานที่ครูมอบหมาย ไม่ว่าจะเป็นงานประจำที่ต้องทำเป็นประจำ (checklist) หรือกิจกรรมใหญ่ที่มีงานย่อยต่างๆ ภายใน (กิจกรรม)

---

## ✨ ฟีเจอร์หลัก

- **4 มุมมอง** — เดือน / สัปดาห์ / รายวัน / Kanban (สลับง่าย ๆ ด้วย tab ด้านบน)
- **2 ประเภทงาน** — Checklist (งานเดี่ยว) และ Activity (งานใหญ่ + งานย่อย)
- **Filter Bar** — ค้นหา / ประเภท / สถานะ / ความสำคัญ / หมวดหมู่ / งานของฉัน
- **Drag & Drop Kanban** — ลากการ์ดเปลี่ยนสถานะ
- **Realtime Sync** — เปลี่ยนแปลงซิงค์ทุกเครื่องทันทีผ่าน Supabase Realtime
- **PWA** — ติดตั้งบนมือถือได้
- **Responsive** — Desktop (sidebar 240px) / Mobile (bottom nav 62px) ตาม yplabs breakpoint 860px
- **Design System v9.1** — ตรงกับ yplabs ทุกอย่าง (CSS variables, animations, components)

---

## 🛠 Tech Stack

| Component   | Technology                | หมายเหตุ                                      |
|-------------|---------------------------|-----------------------------------------------|
| Framework   | Next.js 14 (App Router)   | เหมือน yplabs                                 |
| Language    | TypeScript                | เหมือน yplabs                                 |
| Styling     | Custom CSS (Design System v9.1) | ไม่ใช่ Tailwind — CSS variables + custom styles |
| Database    | Supabase (PostgreSQL)     | DB เดียวกับ yplabs — ตารางใหม่ `ypwork_*`      |
| Auth        | Supabase Auth             | ใช้ระบบเดียวกับ yplabs — คนล็อกอินเดียวกัน      |
| Realtime    | Supabase Realtime         | subscribe ตาราง `ypwork_tasks` / `ypwork_subtasks` |
| PWA         | Service Worker + Manifest | ติดตั้งบนมือถือได้                              |
| Font        | Noto Sans Thai            | ฟอนต์หลักทั้งหมด                              |
| Deploy      | Vercel                    | เหมือน yplabs                                 |
| Icons       | Inline SVG + emoji        | ไอคอนต่าง ๆ ใน UI                             |

---

## 📁 โครงสร้างโปรเจค

```
ypwork/
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── icons/                # App icons
├── supabase/
│   └── migrations/
│       └── 001_ypwork_tables.sql   # 4 tables + RLS + Realtime
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout + providers
│   │   ├── page.tsx          # Entry — login or dashboard
│   │   ├── globals.css       # Design System v9.1 (ตรง yplabs)
│   │   └── api/auth/register/route.ts
│   ├── lib/
│   │   ├── env.ts            # Supabase env vars
│   │   ├── types.ts          # TypeScript domain types
│   │   ├── constants.ts      # Status/priority/category metadata
│   │   ├── dateUtils.ts      # Thai date formatting + calendar grid
│   │   ├── filterUtils.ts    # Pure filter helpers
│   │   ├── profileCache.ts   # LocalStorage profile cache
│   │   └── supabase/
│   │       ├── client.ts     # Browser singleton
│   │       └── server.ts     # Server admin client
│   ├── context/
│   │   ├── AuthContext.tsx   # Supabase auth + council_users
│   │   └── ToastContext.tsx
│   ├── modules/              # 6 Core Modules
│   │   ├── task-engine/      # CRUD + query (TaskContext)
│   │   ├── view-renderer/    # Active view state
│   │   ├── calendar-engine/  # Calendar navigation
│   │   ├── filter-system/    # Filter state
│   │   ├── category-manager/ # Categories CRUD
│   │   └── realtime-sync/    # Supabase Realtime subscription
│   └── components/
│       ├── AppShell.tsx      # Main layout
│       ├── Sidebar.tsx       # Desktop sidebar (240px)
│       ├── Topbar.tsx        # Desktop topbar (52px)
│       ├── MobileTopbar.tsx  # Mobile topbar (50px)
│       ├── BottomNav.tsx     # Mobile bottom nav (62px)
│       ├── FilterBar.tsx
│       ├── SummaryCards.tsx
│       ├── TaskModal.tsx     # Create/edit task
│       ├── DetailPanel.tsx   # Side panel detail
│       ├── CategoryModal.tsx
│       ├── LoginPage.tsx
│       ├── views/
│       │   ├── MonthView.tsx
│       │   ├── WeekView.tsx
│       │   ├── DayView.tsx
│       │   └── KanbanView.tsx
│       └── ui/
│           └── Badge.tsx
└── ypwork-docs/              # เอกสารแยกตามหลักการ Fantrove
    ├── INDEX.md
    ├── 00-overview.md
    ├── 01-design-system.md
    ├── 02-views.md
    ├── 03-database.md
    ├── 04-modules.md
    └── 05-deployment.md
```

---

## 🚀 เริ่มต้นใช้งาน (Local Development)

### 1. ติดตั้ง dependencies

```bash
npm install
# หรือ
bun install
```

### 2. ตั้งค่า environment variables

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่าจาก Supabase dashboard:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

ค่าทั้งหมดเอาได้จาก: `https://app.supabase.com/project/_/settings/api`

### 3. รัน Supabase migration

เปิด Supabase SQL Editor แล้วรันไฟล์:

```
supabase/migrations/001_ypwork_tables.sql
```

หรือใช้ Supabase CLI:

```bash
supabase db push
```

migration นี้จะสร้าง 4 ตาราง (`ypwork_categories`, `ypwork_tasks`, `ypwork_assignees`, `ypwork_subtasks`) พร้อม RLS, Realtime, และ default categories 8 หมวดหมู่

### 4. รัน dev server

```bash
npm run dev
```

เปิด http://localhost:3000

---

## ☁️ Deploy to Vercel

### Step 1: Push ไป GitHub

```bash
git init
git add .
git commit -m "feat: ypwork initial release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ypwork.git
git push -u origin main
```

### Step 2: Import บน Vercel

1. ไปที่ https://vercel.com/new
2. เลือก repository `ypwork` ที่เพิ่ง push
3. Framework preset: **Next.js**
4. Root directory: `./` (default)
5. Build command: `next build` (default)
6. อย่ากด Deploy ทันที — ตั้งค่า env vars ก่อน

### Step 3: เชื่อม Supabase กับ Vercel

**วิธีแนะนำ — Vercel × Supabase Integration (auto-inject env vars)**

1. ใน Vercel project → `Settings` → `Integrations`
2. คลิก `Browse Integrations` → หา `Supabase`
3. คลิก `Add Supabase` → เลือก Supabase project (ตัวเดียวกับ yplabs)
4. Vercel จะ auto-inject env vars ทั้งหมดให้โดยอัตโนมัติ:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - และอื่น ๆ (เหมือน yplabs ทุกประการ)

**วิธี manual (ถ้าไม่ใช้ integration)**

ใน Vercel project → `Settings` → `Environment Variables` → เพิ่มทีละตัว:

| Name                                  | Value                                    |
|---------------------------------------|------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`            | `https://YOUR-PROJECT-ref.supabase.co`   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| ค่า anon/publishable key จาก Supabase    |
| `SUPABASE_URL`                        | `https://YOUR-PROJECT-ref.supabase.co`   |
| `SUPABASE_SERVICE_ROLE_KEY`           | ค่า service_role key (อย่าเปิดเผย!)       |

### Step 4: Deploy

กลับไปที่หน้า `Deployments` → กด `Redeploy` หรือ push commit ใหม่ขึ้นไป

Vercel จะ build + deploy โดยอัตโนมัติ ใช้เวลาประมาณ 1-2 นาที

---

## 🔐 ข้อสำคัญเรื่อง Auth

ypwork ใช้ **Supabase project เดียวกับ yplabs** และอ่านตาราง `council_users` ของ yplabs:

- ✅ คนที่ login ได้ใน yplabs → login ได้ใน ypwork ทันที (บัญชีเดียวกัน)
- ✅ ต้องเป็น `approved = true` และ `disabled = false` ใน `council_users`
- ✅ นักเรียน login ด้วย "ชื่อ-นามสกุล + รหัสนักเรียน 5 หลัก" (password = รหัสนักเรียน)
- ✅ ครู/อื่น ๆ login ด้วย email + password

ดูรายละเอียดเพิ่มเติมได้ที่ `ypwork-docs/05-deployment.md`

---

## 📚 เอกสาร

อ่านเอกสารแยกตามหลักการ Fantrove ในโฟลเดอร์ `ypwork-docs/`:

- [`INDEX.md`](ypwork-docs/INDEX.md) — จุดเริ่มต้นอ่านเอกสาร
- [`00-overview.md`](ypwork-docs/00-overview.md) — ภาพรวมโปรเจค
- [`01-design-system.md`](ypwork-docs/01-design-system.md) — Design System v9.1
- [`02-views.md`](ypwork-docs/02-views.md) — 4 Views + interactions
- [`03-database.md`](ypwork-docs/03-database.md) — Schema + RLS + Realtime
- [`04-modules.md`](ypwork-docs/04-modules.md) — 6 Core Modules architecture
- [`05-deployment.md`](ypwork-docs/05-deployment.md) — Vercel + Supabase deployment guide

---

## 🎨 Design System

ypwork ใช้ Design System v9.1 ตรงกับ yplabs ทุกอย่าง:

- **Pure White Hierarchy** — main bg #FFFFFF, surface-2/3/4 แทบไม่ต่าง
- **Premium Rounded** — border radius สูงสุด 47px
- **Ultra-Soft Shadows** — shadow จาง ๆ
- **iOS-inspired Animations** — spring, blur, float
- **Dark Sidebar** — #09090F (near-black มี blue tint)
- **Brand Color** — #5B5BD6

ดูรายละเอียดทั้งหมดใน `ypwork-docs/01-design-system.md`

---

## 📄 License

Private project — โรงเรียนคำยางพิทยา
