-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Database Update Script for v1.8.1
-- (รันบน Supabase project เดียวกันกับ YP Labs — แชร์ council_users)
-- ═══════════════════════════════════════════════════════════════
-- เป้าหมาย v1.8.1:
--   1. ★ FIX BUG ★ "ส่งคำขอสำเร็จ แต่เลขบัตรประชาชนหาย"
--      → เพิ่มคอลัมน์ `national_id` ลงใน `council_join_requests`
--        (ก่อนหน้านี้ frontend กรอก national_id ใน form แต่ insert payload
--         ไม่ได้ส่ง field นี้ไปเลย → ข้อมูลเลขบัตรหายไปตั้งแต่ขั้นตอน insert)
--      → เพิ่มคอลัมน์ `national_id` ลงใน `council_users` ด้วย
--        (เพื่อให้ตอน admin approve และ sync ข้อมูลจาก join_requests
--         มาที่ council_users จะได้เก็บเลขบัตรไว้ใช้ตอน login)
--
--   2. ★ FIX BUG ★ "ปีการศึกษาในฟอร์มสมัครเป็นค่า hardcoded"
--      → เปิด RLS SELECT policy บน `council_years` ให้ `anon` อ่านได้
--        (ก่อนหน้านี้มีเฉพาะ authenticated → คนที่ยังไม่ login
--         ไม่สามารถดึงรายการปีได้ → frontend ต้อง hardcode ปีแทน)
--      → เปิด Realtime บน `council_years` — เมื่อ admin เพิ่ม/ปิดปี
--        ผู้สมัครเห็นทันทีโดยไม่ต้อง refresh
--
--   3. ปลอดภัยต่อการรันซ้ำ (idempotent) — ทุก ALTER ... ADD COLUMN IF NOT EXISTS,
--      ทุก POLICY ใช้ DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL
--
-- วิธีใช้: คัดลอก SQL ทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด Run
-- ═══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- PART 1 · เพิ่มคอลัมน์ `national_id` ใน `council_join_requests`
--          → เก็บเลขบัตรประชาชน 13 หลักของผู้สมัครสมาชิกแบบนักเรียน
--          → ใช้ตอน admin ตรวจสอบและอนุมัติคำขอ
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_join_requests
  ADD COLUMN IF NOT EXISTS national_id text DEFAULT '';

-- index เพื่อค้นหาคำขอที่ซ้ำกัน (เลขบัตร + ปีการศึกษา) ได้เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_council_join_requests_national_id
  ON public.council_join_requests(national_id);


-- ────────────────────────────────────────────────────────────────
-- PART 2 · เพิ่มคอลัมน์ `national_id` ใน `council_users`
--          → เก็บเลขบัตรประชาชนของผู้ใช้ที่อนุมัติแล้ว
--          → ใช้ตอน student login: ระบบจะตรวจทั้ง student_id
--            และ national_id ให้ตรงกับที่กรอก
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_users
  ADD COLUMN IF NOT EXISTS national_id text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_council_users_national_id
  ON public.council_users(national_id);


-- ────────────────────────────────────────────────────────────────
-- PART 3 · เปิด RLS SELECT บน `council_years` ให้ `anon` อ่านได้
--          → คนที่ยังไม่ login (หน้า register) สามารถดึงรายการปี
--            ที่เปิดรับสมัครได้ โดยไม่ต้อง hardcoded ปีใน frontend
--          → YP Labs schema เดิมมี policy "Anyone can read years"
--            แต่จริง ๆ ให้แค่ `authenticated` — เราจะเพิ่ม `anon`
-- ────────────────────────────────────────────────────────────────

-- ตรวจก่อนว่ามี RLS เปิดอยู่บน council_years ถ้ายังไม่เปิดให้เปิด
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'council_years'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'council_years'
        AND c.relrowsecurity = true
    ) THEN
      ALTER TABLE public.council_years ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE 'Enabled RLS on council_years';
    END IF;
  ELSE
    RAISE NOTICE 'Table council_years not found — create it in YP Labs first';
  END IF;
END
$$;

-- ตรวจว่ามี policy SELECT สำหรับ `anon` อยู่แล้วหรือยัง — ถ้ายังให้สร้าง
-- (ใช้ชื่อ council_years_select_anyone ตั้งใจให้ต่างจากของ YP Labs
--  เพื่อไม่ให้ชนกัน)
DO $$ BEGIN
  CREATE POLICY council_years_select_anyone
    ON public.council_years
    FOR SELECT TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NOTE: policy เดิม "Anyone can read years" ของ YP Labs (TO authenticated)
-- ยังคงอยู่ — เราเพิ่ม policy ใหม่ที่รวม `anon` เข้าไปด้วย


-- ────────────────────────────────────────────────────────────────
-- PART 4 · เปิด Realtime บน `council_years`
--          → เมื่อ admin เพิ่มปีใหม่ หรือ toggle `closed` ของปีที่มีอยู่
--            หน้า register จะอัพเดตรายการปีทันทีแบบ push (ไม่ต้อง refresh)
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
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'council_years'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'council_years'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.council_years;
      RAISE NOTICE 'Added council_years to supabase_realtime';
    END IF;
    ALTER TABLE public.council_years REPLICA IDENTITY FULL;
  END IF;
END
$$;


-- ────────────────────────────────────────────────────────────────
-- PART 5 · ตรวจสอบผลลัพธ์
-- ────────────────────────────────────────────────────────────────
-- รัน query เหล่านี้ใน SQL Editor เพื่อยืนยัน:
--
-- 1) council_join_requests มี national_id:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_name = 'council_join_requests' AND column_name = 'national_id';
--
-- 2) council_users มี national_id:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_name = 'council_users' AND column_name = 'national_id';
--
-- 3) council_years มี policy SELECT สำหรับ anon:
--    SELECT polname, cmd, roles
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'council_years';
--    -- ควรเห็น policy ที่ cmd = 'SELECT' และ roles มี 'anon'
--
-- 4) council_years อยู่ใน Realtime publication:
--    SELECT tablename
--    FROM pg_publication_tables
--    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
--    ORDER BY tablename;
--    -- ควรเห็น council_years ร่วมกับตารางอื่น ๆ
--
-- 5) ทดสอบอ่านปีโดยไม่ login (ผ่าน anon key):
--    ใช้ REST API: curl หรือ browser → ควรได้ array ของ { year, closed }
--    GET https://<project>.supabase.co/rest/v1/council_years?select=year,closed
--    Header: apikey: <anon-key>
--
-- 6) ทดสอบ insert คำขอพร้อม national_id:
--    INSERT INTO public.council_join_requests
--      (full_name, student_id, national_id, year, email, account_type, department_id)
--    VALUES
--      ('ทดสอบ v1.8.1', '00001', '1234567890123', 2568,
--       'test_v181@yplabs.internal', 'student', null);
--    -- ถ้าสำเร็จ → national_id column ทำงานแล้ว
--    DELETE FROM public.council_join_requests WHERE email = 'test_v181@yplabs.internal';
-- ═══════════════════════════════════════════════════════════════
