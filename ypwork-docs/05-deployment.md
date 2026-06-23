# 05 — Deployment Guide

> คู่มือ deploy ypwork ขึ้น Vercel + เชื่อม Supabase

## สรุปสั้น ๆ

1. Push โค้ดขึ้น GitHub
2. Import project บน Vercel
3. เชื่อม Supabase integration (auto-inject env vars)
4. Deploy

---

## Step 1: Push ไป GitHub

```bash
# ในโฟลเดอร์ ypwork/
git init
git add .
git commit -m "feat: ypwork initial release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ypwork.git
git push -u origin main
```

---

## Step 2: Import บน Vercel

1. ไปที่ https://vercel.com/new
2. เลือก repository `ypwork` ที่เพิ่ง push
3. Framework preset: **Next.js**
4. Root directory: `./` (default)
5. Build command: `next build` (default — Vercel ตั้งให้อัตโนมัติ)
6. Output directory: `.next` (default)
7. **อย่ากด Deploy ทันที** — ตั้งค่า env vars ก่อน (Step 3)

---

## Step 3: เชื่อม Supabase กับ Vercel

### วิธีแนะนำ — Vercel × Supabase Integration (auto-inject env vars)

1. ใน Vercel project → **Settings** → **Integrations**
2. คลิก **Browse Integrations** → หา **Supabase**
3. คลิก **Add Supabase** → เลือก Supabase project **(ตัวเดียวกับ yplabs)**
4. Vercel จะ auto-inject env vars ทั้งหมดให้โดยอัตโนมัติ:

| Name | Source |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | legacy alias (same value) |
| `SUPABASE_URL` | server alias |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (server only!) |
| `SUPABASE_ANON_KEY` | server alias |
| `SUPABASE_JWT_SECRET` | JWT secret |
| `SUPABASE_SECRET_KEY` | additional secret |
| `POSTGRES_URL` | pooled connection |
| `POSTGRES_PRISMA_URL` | pooled + pgBouncer hints |
| `POSTGRES_URL_NON_POOLING` | direct connection (for realtime) |
| `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` | direct connection details |

> **สำคัญ:** ใช้ Supabase project **ตัวเดียวกับ yplabs** ทุกประการ — เพื่อให้ auth + council_users ใช้ร่วมกันได้

### วิธี manual (ถ้าไม่ใช้ integration)

ใน Vercel project → **Settings** → **Environment Variables** → เพิ่มทีละตัว:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-ref.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ค่า anon/publishable key จาก Supabase | Production, Preview, Development |
| `SUPABASE_URL` | `https://YOUR-PROJECT-ref.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | ค่า service_role key (อย่าเปิดเผย!) | Production, Preview, Development |

ค่าทั้งหมดเอาได้จาก: `https://app.supabase.com/project/_/settings/api`

---

## Step 4: รัน Supabase migration

**สำคัญ:** ต้องรัน migration 1 ครั้งก่อนใช้งานจริง

### ผ่าน Supabase Dashboard

1. เปิด https://app.supabase.com/project/_/sql
2. คลิก **New query**
3. คัดลอกเนื้อหาจากไฟล์ `supabase/migrations/001_ypwork_tables.sql` ใน repo
4. วาง + คลิก **Run**

Migration นี้จะ:
- สร้าง 4 ตาราง: `ypwork_categories`, `ypwork_tasks`, `ypwork_assignees`, `ypwork_subtasks`
- เปิด RLS บนทุกตาราง + สร้าง policies (authenticated = full access)
- เพิ่มตาราง `ypwork_tasks`, `ypwork_subtasks`, `ypwork_assignees` เข้า `supabase_realtime` publication
- สร้าง trigger สำหรับ `updated_at` อัตโนมัติ
- Insert 8 default categories

### ผ่าน Supabase CLI

```bash
# ติดตั้ง Supabase CLI ถ้ายังไม่มี
npm install -g supabase

# Login + link project
supabase login
supabase link --project-ref YOUR-PROJECT-ref

# รัน migration
supabase db push
```

---

## Step 5: Deploy

กลับไปที่ Vercel → หน้า **Deployments** → กด **Redeploy**

หรือ push commit ใหม่ขึ้นไป — Vercel จะ build + deploy อัตโนมัติ

ใช้เวลาประมาณ 1-2 นาที

---

## Step 6: ทดสอบ

เปิด URL ที่ Vercel ให้มา (เช่น `https://ypwork.vercel.app`)

### Checklist ทดสอบ

- [ ] หน้าแรกแสดงหน้า Login (ถ้ายังไม่ได้ login)
- [ ] Login ด้วยบัญชี yplabs (ชื่อ-นามสกุล + รหัสนักเรียน 5 หลัก) ได้
- [ ] หลัง login เข้าสู่ Dashboard พร้อม Summary Cards + Month View
- [ ] สร้างงานใหม่ผ่านปุ่ม "➕ สร้างงานใหม่" ได้
- [ ] สร้าง Checklist ได้
- [ ] สร้าง Activity พร้อม subtasks ได้
- [ ] คลิกที่วันในปฏิทิน → เปิด Day View
- [ ] สลับไป Week View และ Kanban ได้
- [ ] ลากการ์ดใน Kanban เปลี่ยนสถานะได้
- [ ] คลิกการ์ด → เปิด Detail Panel
- [ ] เปลี่ยนสถานะ inline ใน Detail Panel ได้
- [ ] เพิ่ม/ลบงานย่อยใน Detail Panel ได้ (สำหรับ activity)
- [ ] ใช้ Filter Bar กรองงานได้
- [ ] สร้าง/แก้ไข/ลบหมวดหมู่ได้
- [ ] บนมือถือ — Sidebar ซ่อน, Bottom Nav แสดง, เลื่อนดูตารางได้
- [ ] ติดตั้ง PWA บนมือถือได้ (Add to Home Screen)

---

## การแก้ปัญหาที่พบบ่อย

### ❌ "Missing browser Supabase env vars"

ตรวจสอบว่า Vercel environment variables ถูกตั้งค่าครบทั้ง 4 ตัว:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### ❌ "ไม่พบข้อมูลบัญชีในระบบ"

ตรวจสอบว่า user ที่ login มี row ในตาราง `council_users` ของ yplabs และ:
- `approved = true`
- `disabled = false`

### ❌ "ระบบไม่ realtime"

1. ตรวจสอบว่า migration รันครบ — ตาราง `ypwork_tasks`, `ypwork_subtasks`, `ypwork_assignees` ต้องอยู่ใน `supabase_realtime` publication:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

2. ตรวจสอบว่า RLS เปิดอยู่บนทุกตาราง

### ❌ "Kanban ลาก-วางไม่ได้"

ตรวจสอบว่า browser รองรับ HTML5 Drag and Drop API — ส่วนใหญ่รองรับหมดแล้ว ยกเว้นบาง mobile browser อาจมีปัญหา (สามารถใช้ click เปลี่ยนสถานะผ่าน Detail Panel แทนได้)

---

## Custom Domain (Optional)

1. ใน Vercel project → **Settings** → **Domains**
2. เพิ่ม domain (เช่น `ypwork.khamyang.ac.th`)
3. ตั้งค่า DNS ตามที่ Vercel บอก (CNAME หรือ A record)
4. รอ 24-48 ชม. ให้ SSL certificate พร้อมใช้

---

## การอัปเดตระบบ

เมื่อ pull โค้ดใหม่จาก GitHub หรือ push commit ใหม่:

- Vercel auto-redeploy
- ไม่ต้องรัน migration ซ้ำ (ถ้าไม่มี migration ใหม่)
- ไม่ต้องตั้งค่า env vars ใหม่

ถ้ามี migration ใหม่ (เช่น `002_*.sql`):
1. รัน migration ใน Supabase SQL Editor ก่อน
2. แล้วค่อย deploy Vercel
