-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Database Update Script for v1.8
-- (รันบน Supabase project เดียวกันกับ YP Labs — แชร์ council_users)
-- ═══════════════════════════════════════════════════════════════
-- เป้าหมาย v1.8:
--   1. แก้บั๊ก "ส่งคำขอสมัครสำเร็จ แต่ใน Supabase ไม่มีข้อมูล"
--      → เพิ่ม RLS INSERT policy บน council_join_requests ให้ anon/authenticated
--        สามารถ insert ได้ (ก่อนหน้านี้ไม่มี policy นี้ → RLS บล็อกโดยเงียบ ๆ
--        แล้ว frontend swallow error แสดง success ทั้งที่จริงล้มเหลว)
--
--   2. ยืนยันว่า council_users และ council_join_requests มี department_id
--      (re-affirm จาก v1.7 — idempotent, รันซ้ำก็ปลอดภัย)
--
--   3. เปิด Realtime ทั่วทั้งเว็บ:
--      เพิ่ม council_users, council_join_requests, ypwork_activity_log
--      เข้า supabase_realtime publication พร้อม REPLICA IDENTITY FULL
--      (ก่อนหน้านี้มีแค่ ypwork_events, ypwork_tasks, ypwork_task_assignees,
--       ypwork_event_members, departments)
--
--   4. ปลอดภัยต่อการรันซ้ำ (idempotent)
--
-- วิธีใช้: คัดลอก SQL ทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด Run
-- ═══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- PART 1 · ยืนยัน department_id บน council_users (idempotent)
--          (re-affirm จาก v1.7 PART 6 — ถ้ารัน v1.7 แล้วจะข้ามไปเลย)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_users
  ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT NULL
  REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_council_users_department_id
  ON public.council_users(department_id);


-- ────────────────────────────────────────────────────────────────
-- PART 2 · ยืนยัน department_id บน council_join_requests (idempotent)
--          (re-affirm จาก v1.7 PART 7)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.council_join_requests
  ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT NULL
  REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_council_join_requests_department_id
  ON public.council_join_requests(department_id);


-- ────────────────────────────────────────────────────────────────
-- PART 3 · ★ FIX BUG ★ — RLS INSERT policy บน council_join_requests
--          เป็น root cause ของ "ส่งคำขอสำเร็จ แต่ Supabase ไม่มีข้อมูล"
--          เพราะก่อนหน้านี้ไม่มี policy นี้ → anon INSERT ถูกบล็อกโดยเงียบ ๆ
--          แล้ว frontend ก็ fallback เป็น success state
-- ────────────────────────────────────────────────────────────────

-- ตรวจสอบว่าตาราง council_join_requests มี RLS เปิดอยู่ไหม
-- ถ้ายังไม่เปิด → เปิดให้ แล้วค่อยสร้าง policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'council_join_requests'
  ) THEN
    -- ตรวจว่า RLS ยังไม่เปิด
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'council_join_requests'
        AND c.relrowsecurity = true
    ) THEN
      ALTER TABLE public.council_join_requests ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE 'Enabled RLS on council_join_requests';
    END IF;
  ELSE
    RAISE NOTICE 'Table council_join_requests not found — create it in YP Labs first';
  END IF;
END
$$;

-- ให้ anon และ authenticated สามารถ INSERT คำขอสมัครได้โดยไม่ต้อง login
-- (แต่อ่าน/แก้ไขไม่ได้ — เฉพาะ admin ผ่าน YP Labs เท่านั้นที่อ่านได้)
DO $$ BEGIN
  CREATE POLICY council_join_requests_insert_anyone
    ON public.council_join_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NOTE: ถ้ามี policy INSERT เดิมที่ชื่อซ้ำแต่ condition ต่างกัน ให้ drop ก่อน
-- (ตัวอย่างเช่นถ้า YP Labs เคยสร้างไว้แล้วแต่ WITH CHECK (false))
DROP POLICY IF EXISTS anyone_can_insert_join_request ON public.council_join_requests;
DROP POLICY IF EXISTS council_join_requests_insert    ON public.council_join_requests;


-- ────────────────────────────────────────────────────────────────
-- PART 4 · เปิด Realtime สำหรับ council_users
--          → ทำให้หน้า profile อัพเดตทันทีเมื่อ user เปลี่ยนแปลง
--            (เช่น เปลี่ยนฝ่าย, เปลี่ยนสี, เปลี่ยน role)
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
      AND tablename = 'council_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.council_users;
    RAISE NOTICE 'Added council_users to supabase_realtime';
  END IF;
END
$$;

ALTER TABLE public.council_users REPLICA IDENTITY FULL;


-- ────────────────────────────────────────────────────────────────
-- PART 5 · เปิด Realtime สำหรับ council_join_requests
--          → ทำให้ admin (ในอนาคต) เห็นคำขอใหม่ทันทีแบบ push
-- ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'council_join_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.council_join_requests;
    RAISE NOTICE 'Added council_join_requests to supabase_realtime';
  END IF;
END
$$;

ALTER TABLE public.council_join_requests REPLICA IDENTITY FULL;


-- ────────────────────────────────────────────────────────────────
-- PART 6 · เปิด Realtime สำหรับ ypwork_activity_log
--          → ทำให้ feed แสดง action ใหม่ได้ทันทีโดยไม่ต้อง refresh
--            (อาจไม่ได้ใช้ในทันที แต่เตรียมไว้สำหรับ v1.9 หรือ activity feed)
-- ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ypwork_activity_log'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'ypwork_activity_log'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ypwork_activity_log;
      RAISE NOTICE 'Added ypwork_activity_log to supabase_realtime';
    END IF;
    ALTER TABLE public.ypwork_activity_log REPLICA IDENTITY FULL;
  END IF;
END
$$;


-- ────────────────────────────────────────────────────────────────
-- PART 7 · (optional) ถ้ามี policy SELECT เดิมบน council_join_requests
--          ที่บล็อกผู้ใช้ทั่วไปจากการตรวจสอบสถานะคำขอของตัวเอง
--          ให้เปิดให้ authenticated อ่าน "คำขอของตัวเอง" ได้ (filter ด้วย email/student_id)
--          → เตรียมไว้สำหรับหน้า "ตรวจสอบสถานะคำขอ" ในอนาคต
-- ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY council_join_requests_select_own
    ON public.council_join_requests
    FOR SELECT TO authenticated
    USING (
      email = (select email from auth.users where id = auth.uid())
      OR student_id IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ────────────────────────────────────────────────────────────────
-- PART 8 · ตรวจสอบผลลัพธ์
-- ────────────────────────────────────────────────────────────────
-- รัน query เหล่านี้ใน SQL Editor เพื่อยืนยัน:
--
-- 1) council_join_requests มี INSERT policy สำหรับ anon:
--    SELECT polname, cmd, roles
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'council_join_requests';
--    -- ควรเห็น policy ที่ cmd = 'INSERT' และ roles มี 'anon'
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
-- 4) ตารางทั้งหมดที่อยู่ใน Realtime publication:
--    SELECT tablename
--    FROM pg_publication_tables
--    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
--    ORDER BY tablename;
--    -- ควรเห็นอย่างน้อย 8 ตาราง:
--    --   council_join_requests, council_users, departments,
--    --   ypwork_activity_log, ypwork_event_members, ypwork_events,
--    --   ypwork_task_assignees, ypwork_tasks
--
-- 5) ทดสอบ insert (RLS ต้องอนุญาต):
--    INSERT INTO public.council_join_requests
--      (full_name, student_id, year, email, account_type, department_id)
--    VALUES
--      ('ทดสอบ v1.8', '00001', 2568, 'test_v18@yplabs.internal', 'student', null);
--    -- ถ้าสำเร็จ → RLS policy ทำงานแล้ว
--    -- (ลบทิ้งหลังทดสอบ)
--    DELETE FROM public.council_join_requests WHERE email = 'test_v18@yplabs.internal';
-- ═══════════════════════════════════════════════════════════════
