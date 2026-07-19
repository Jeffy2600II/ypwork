-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Database Update Script for v1.7
-- (รันบน Supabase project เดียวกันกับ YP Labs — แชร์ council_users)
-- ═══════════════════════════════════════════════════════════════
-- เป้าหมาย v1.7:
--   1. เปลี่ยนชื่อตาราง ypwork_departments → departments
--      พร้อมย้าย PK, indexes, RLS policies, triggers และ FK ใน ypwork_events
--      ให้ชี้ไปยังชื่อใหม่ (idempotent — รันซ้ำได้ ไม่ error)
--
--   2. เพิ่มคอลัมน์ department_id ลงใน council_users
--      (เก็บ ID ของฝ่าย — ไม่ใช่ชื่อฝ่าย — อ้างอิง departments.id)
--
--   3. เพิ่มคอลัมน์ department_id ลงใน council_join_requests
--      (ตาราง "รอยืนยัน" — ส่งคำขอสมัครเข้ามาพร้อมระบุฝ่ายที่จะสังกัด)
--
--   4. เพิ่ม departments เข้าไปใน supabase_realtime publication
--      (เพื่อให้ frontend subscribe การเปลี่ยนแปลงฝ่ายได้แบบ push)
--
--   5. ปลอดภัยต่อการรันซ้ำ (idempotent):
--      - ADD COLUMN ใช้ IF NOT EXISTS
--      - RENAME ตรวจสอบก่อนว่าชื่อเดิมยังอยู่
--      - DROP ใช้ IF EXISTS
--      - INSERT ... ON CONFLICT DO UPDATE
--
-- วิธีใช้: คัดลอก SQL ทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด Run
-- ═══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- PART 1 · RENAME ypwork_departments → departments
--          (idempotent — ถ้ายังไม่ได้ rename จะ rename ให้; ถ้า rename แล้วจะข้ามไป)
-- ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ypwork_departments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'departments'
  ) THEN
    ALTER TABLE public.ypwork_departments RENAME TO departments;
    RAISE NOTICE 'Renamed ypwork_departments → departments';
  ELSE
    RAISE NOTICE 'Skip rename: ypwork_departments already gone or departments already exists';
  END IF;
END
$$;

-- ย้าย PK constraint ให้เป็น departments_pkey (rename อัตโนมัติอยู่แล้ว แต่เช็คเผื่อ)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'departments'
      AND constraint_name = 'ypwork_departments_pkey'
  ) THEN
    ALTER TABLE public.departments RENAME CONSTRAINT ypwork_departments_pkey TO departments_pkey;
  END IF;
END
$$;

-- สร้าง departments table เผื่อกรณีติดตั้งใหม่ที่ยังไม่มีเลย
CREATE TABLE IF NOT EXISTS public.departments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#4F46E5',
  icon        TEXT NOT NULL DEFAULT '◎',
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────────
-- PART 2 · แก้ FK ใน ypwork_events ให้ชี้ไป departments
--          (drop constraint เดิมที่ชี้ ypwork_departments แล้วสร้างใหม่)
-- ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.ypwork_events'::regclass
    AND contype = 'f'
    AND (
      conname LIKE 'ypwork_events_department_id_fkey'
      OR conname LIKE '%department%_fkey'
    )
    AND connamespace = 'public'::regnamespace
  LIMIT 1;

  -- drop เฉพาะ FK ที่อ้างอิง ypwork_departments เดิม ถ้ายังอยู่
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ypwork_events DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;
END
$$;

-- สร้าง FK ใหม่ที่ชี้ไป departments (ใช้ DO block เพราะ ADD CONSTRAINT ไม่มี IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ypwork_events'::regclass
      AND conname = 'ypwork_events_department_id_fkey'
  ) THEN
    ALTER TABLE public.ypwork_events
      ADD CONSTRAINT ypwork_events_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES public.departments(id)
      ON DELETE SET NULL;
  END IF;
END
$$;


-- ────────────────────────────────────────────────────────────────
-- PART 3 · RLS policies บน departments (drop ของเดิม + สร้างใหม่)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- drop policies เดิมที่ชื่อ ypwork_departments_*
DROP POLICY IF EXISTS ypwork_departments_select_authenticated ON public.departments;
DROP POLICY IF EXISTS ypwork_departments_write_authenticated ON public.departments;

DO $$ BEGIN
  CREATE POLICY departments_select_authenticated
    ON public.departments FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ฝ่ายเป็นข้อมูล public — anon ก็อ่านได้ (สำหรับหน้า register ที่ยังไม่ได้ login)
DO $$ BEGIN
  CREATE POLICY departments_select_anon
    ON public.departments FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY departments_write_authenticated
    ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- PART 4 · TRIGGERS — เปลี่ยนชื่อ trigger บน departments
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ypwork_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ypwork_departments_updated_at ON public.departments;
DROP TRIGGER IF EXISTS trg_departments_updated_at       ON public.departments;

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.ypwork_set_updated_at();


-- ────────────────────────────────────────────────────────────────
-- PART 5 · SEED DATA — ฝ่ายงาน (idempotent)
-- ────────────────────────────────────────────────────────────────

INSERT INTO public.departments (id, name, color, icon, description) VALUES
  ('d1', 'ฝ่ายบริหาร',     '#4F46E5', '👥', 'ประธาน รองประธาน และเลขานุการสภานักเรียน — ดูแลภาพรวมและประสานงานระหว่างฝ่าย'),
  ('d2', 'ฝ่ายกิจกรรม',     '#14B8A6', '🎨', 'ดูแลกิจกรรมวันสำคัญ พิธีการ การแสดง และการจัดงานของโรงเรียน'),
  ('d3', 'ฝ่ายวิชาการ',     '#10B981', '📚', 'ดูแลการแข่งขันทางวิชาการ การส่งเสริมความรู้ และร่วมมือกับครูที่ปรึกษาวิชาการ'),
  ('d4', 'ฝ่ายทำเนียบ',     '#F59E0B', '📋', 'ดูแลเอกสาร การประชุม การเก็บบันทึก และระเบียบต่าง ๆ ของสภานักเรียน'),
  ('d5', 'ฝ่ายการเงิน',     '#EC4899', '💰', 'ดูแลงบประมาณ การเบิกจ่าย การรับบริจาค และการระดมทุนของสภานักเรียน'),
  ('d6', 'ฝ่ายประชาสัมพันธ์', '#D946EF', '📢', 'ดูแลการประชาสัมพันธ์ โซเชียลมีเดีย ป้ายประกาศ และการติดต่อกับภายนอก')
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  color       = EXCLUDED.color,
  icon        = EXCLUDED.icon,
  description = EXCLUDED.description;


-- ────────────────────────────────────────────────────────────────
-- PART 6 · เพิ่ม department_id ใน council_users (บัญชีผู้ใช้)
--          เก็บ ID ของฝ่าย — ไม่ใช่ชื่อฝ่าย
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_users
  ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT NULL
  REFERENCES public.departments(id) ON DELETE SET NULL;

-- index สำหรับค้นหา user ตามฝ่าย
CREATE INDEX IF NOT EXISTS idx_council_users_department_id
  ON public.council_users(department_id);


-- ────────────────────────────────────────────────────────────────
-- PART 7 · เพิ่ม department_id ใน council_join_requests (ตารางรอยืนยัน)
--          ส่งคำขอสมัครเข้ามาพร้อมระบุฝ่ายที่จะสังกัด
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_join_requests
  ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT NULL
  REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_council_join_requests_department_id
  ON public.council_join_requests(department_id);


-- ────────────────────────────────────────────────────────────────
-- PART 8 · เพิ่ม color column ใน council_users (ถ้ายังไม่มี)
--          YP Work ใช้สีนี้แสดงผล user ในการ์ด assignee
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_users
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4F46E5';

ALTER TABLE public.council_users
  ADD COLUMN IF NOT EXISTS national_id TEXT DEFAULT '';


-- ────────────────────────────────────────────────────────────────
-- PART 9 · Realtime — เพิ่ม departments เข้า publication
-- ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'departments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
  END IF;
END
$$;

ALTER TABLE public.departments REPLICA IDENTITY FULL;


-- ────────────────────────────────────────────────────────────────
-- PART 10 · ตรวจสอบผลลัพธ์
-- ────────────────────────────────────────────────────────────────
-- รัน query เหล่านี้ใน SQL Editor เพื่อยืนยัน:
--
-- 1) ตาราง departments อยู่ + มีข้อมูล 6 ฝ่าย:
--    SELECT id, name, color, icon FROM departments ORDER BY id;
--
-- 2) council_users มี department_id:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_name = 'council_users' AND column_name = 'department_id';
--
-- 3) council_join_requests มี department_id:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_name = 'council_join_requests' AND column_name = 'department_id';
--
-- 4) ypwork_events.department_id FK ชี้ไป departments:
--    SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS ref_table
--    FROM pg_constraint
--    WHERE conrelid = 'public.ypwork_events'::regclass AND contype = 'f';
--
-- 5) ypwork_departments ไม่มีอยู่แล้ว:
--    SELECT EXISTS (
--      SELECT 1 FROM information_schema.tables
--      WHERE table_schema='public' AND table_name='ypwork_departments'
--    ) AS old_table_exists;
--    -- expected: false
-- ═══════════════════════════════════════════════════════════════
