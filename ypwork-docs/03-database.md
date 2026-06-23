# 03 — Database Schema

> ypwork ใช้ Supabase (PostgreSQL) — สร้างตารางใหม่ `ypwork_*` ใน DB เดียวกับ yplabs

ไฟล์ migration: `supabase/migrations/001_ypwork_tables.sql`

## ตารางทั้งหมด

```
┌──────────────────────┐
│  ypwork_categories   │  หมวดหมู่ของงาน (custom + 8 defaults)
└──────────┬───────────┘
           │ 1
           │
           ▼ N
┌──────────────────────┐         ┌─────────────────────┐
│    ypwork_tasks      │◄───────│  ypwork_assignees   │  many-to-many
│  (งาน checklist/     │  N:N   │  (task_id, user_id) │  กับ auth.users
│   activity)          │       └─────────────────────┘
└──────────┬───────────┘
           │ 1
           │
           ▼ N
┌──────────────────────┐
│   ypwork_subtasks    │  งานย่อย (เฉพาะ activity)
└──────────────────────┘
```

## ypwork_categories

```sql
CREATE TABLE ypwork_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '⚙️',
  color       TEXT NOT NULL DEFAULT '#6B7280',
  sort_order  INT  NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## ypwork_tasks

```sql
CREATE TABLE ypwork_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('checklist', 'activity')),
  start_date   DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  deadline     DATE,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'pending_review', 'done', 'cancelled')),
  category_id  UUID REFERENCES ypwork_categories(id) ON DELETE SET NULL,
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_ypwork_tasks_start_date ON ypwork_tasks(start_date);
CREATE INDEX idx_ypwork_tasks_deadline   ON ypwork_tasks(deadline);
CREATE INDEX idx_ypwork_tasks_status     ON ypwork_tasks(status);
CREATE INDEX idx_ypwork_tasks_category   ON ypwork_tasks(category_id);
CREATE INDEX idx_ypwork_tasks_created_by ON ypwork_tasks(created_by);
```

### updated_at trigger

อัปเดต `updated_at` อัตโนมัติเมื่อมีการ UPDATE:

```sql
CREATE TRIGGER trg_ypwork_tasks_updated_at
  BEFORE UPDATE ON ypwork_tasks
  FOR EACH ROW
  EXECUTE FUNCTION ypwork_set_updated_at();
```

## ypwork_assignees

```sql
CREATE TABLE ypwork_assignees (
  task_id  UUID NOT NULL REFERENCES ypwork_tasks(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);
```

หนึ่งงานมีผู้รับผิดชอบได้หลายคน (many-to-many)

## ypwork_subtasks

```sql
CREATE TABLE ypwork_subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES ypwork_tasks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  assignee_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  deadline     DATE,
  sort_order   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## RLS (Row Level Security)

ทุกตารางเปิด RLS — ทุกคนในสภาเห็นได้ (ตามแผน ypwork: ไม่มี admin/user แยก):

### Policy สำหรับ ypwork_tasks (และ subtasks, assignees, categories เหมือนกัน)

```sql
-- Service role: full access (server-side API routes)
CREATE POLICY "Service role full access on ypwork_tasks"
  ON ypwork_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated: read all
CREATE POLICY "Authenticated can read ypwork_tasks"
  ON ypwork_tasks FOR SELECT TO authenticated USING (true);

-- Authenticated: insert
CREATE POLICY "Authenticated can insert ypwork_tasks"
  ON ypwork_tasks FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated: update
CREATE POLICY "Authenticated can update ypwork_tasks"
  ON ypwork_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated: delete
CREATE POLICY "Authenticated can delete ypwork_tasks"
  ON ypwork_tasks FOR DELETE TO authenticated USING (true);
```

> **หมายเหตุ:** แผน ypwork ระบุว่า "ทุกคนมีสิทธิ์เท่ากัน — ไม่มี admin/user แยก" ดังนั้น RLS policy จึงเปิดให้ authenticated ทำได้ทุกอย่าง

## Realtime

เพิ่มตารางเข้า `supabase_realtime` publication เพื่อให้ frontend subscribe การเปลี่ยนแปลงแบบ realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE ypwork_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE ypwork_subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE ypwork_assignees;
```

Frontend subscribe ผ่าน `useRealtimeSync` hook (ดู `04-modules.md`):

```ts
useRealtimeSync(() => { refetch(); });
```

## Default Categories

Migration insert 8 default categories ตามแผน ypwork หัวข้อ 13:

| หมวดหมู่ | Emoji | สี |
|---------|-------|-----|
| งานประชุม | 🏫 | `#3B82F6` (น้ำเงิน) |
| งานเอกสาร | 📋 | `#8B5CF6` (ม่วง) |
| งานจัดงาน/กิจกรรม | 🎉 | `#F59E0B` (เหลือง) |
| งานประชาสัมพันธ์ | 📢 | `#22C55E` (เขียว) |
| งานดูแลความสะอาด | 🧹 | `#6B7280` (เทา) |
| งานการเงิน | 💰 | `#EF4444` (แดง) |
| งานวิชาการ | 📚 | `#06B6D4` (cyan) |
| อื่นๆ | ⚙️ | `#6B7280` (เทา) |

`created_by = NULL` (system default — ไม่ผูกกับ user ใด)

## การรัน migration

### ผ่าน Supabase Dashboard

1. เปิด https://app.supabase.com/project/_/sql
2. คัดลอกเนื้อหาจาก `supabase/migrations/001_ypwork_tables.sql`
3. วาง + Run

### ผ่าน Supabase CLI

```bash
supabase db push
```

> **สำคัญ:** รัน migration **1 ครั้งเท่านั้น** ต่อ Supabase project ถ้ารันซ้ำจะไม่มีผลกระทบเพราะใช้ `CREATE TABLE IF NOT EXISTS` และ `ON CONFLICT DO NOTHING` สำหรับ default categories

## ความสัมพันธ์กับ yplabs

ypwork **ไม่** แตะตาราง `council_*` ของ yplabs เลย:

- ypwork สร้างตารางใหม่ prefix `ypwork_` ทั้งหมด
- ypwork **อ่าน** `council_users` ของ yplabs (เพื่อตรวจสอบ auth + ดึง profile)
- ypwork **ไม่เขียน** อะไรลง `council_users` (ยกเว้นผ่าน API register ที่สร้าง user ใหม่)
- คน login คนเดียวกันกับ yplabs → ใช้ ypwork ได้ทันที
