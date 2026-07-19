-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Database Update Script for v3.2.0
-- (RLS Policy Fix — แก้ปัญหา "new row violates row-level security policy")
-- ═══════════════════════════════════════════════════════════════
-- ปัญหา:
--   ผู้ใช้ที่ login แล้วไม่สามารถสร้าง/แก้ไข/ลบ events และ tasks ได้
--   เนื่องจาก RLS policy บน ypwork_events, ypwork_tasks, ypwork_task_assignees
--   อาจมี WITH CHECK clause ที่ restrictive เกินไป
--
-- วิธีแก้:
--   1. (Recommended) ใช้ API routes ใหม่ใน v3.2.0 ที่ใช้ service role key
--      — ไม่ต้องรัน SQL นี้เลย API routes จะ bypass RLS ให้อัตโนมัติ
--
--   2. (Alternative) รัน SQL นี้เพื่อปรับ RLS policies ให้ authenticated
--      users สามารถ write ได้โดยตรง (permissive policies)
--      — ใช้ได้ทั้งคู่กับ API routes หรือใช้แทนก็ได้
--
-- วิธีใช้: คัดลอก SQL ทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด Run
-- (ปลอดภัยต่อการรันซ้ำ — idempotent)
-- ═══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- PART 1 · ypwork_events — RLS policies สำหรับ authenticated users
-- ────────────────────────────────────────────────────────────────

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS ypwork_events_select_authenticated ON public.ypwork_events;
DROP POLICY IF EXISTS ypwork_events_write_authenticated ON public.ypwork_events;
DROP POLICY IF EXISTS ypwork_events_insert_authenticated ON public.ypwork_events;
DROP POLICY IF EXISTS ypwork_events_update_authenticated ON public.ypwork_events;
DROP POLICY IF EXISTS ypwork_events_delete_authenticated ON public.ypwork_events;

-- Ensure RLS is enabled
ALTER TABLE public.ypwork_events ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can see all events
CREATE POLICY ypwork_events_select_authenticated
  ON public.ypwork_events
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: authenticated users can create events
CREATE POLICY ypwork_events_insert_authenticated
  ON public.ypwork_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: authenticated users can update events
CREATE POLICY ypwork_events_update_authenticated
  ON public.ypwork_events
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: authenticated users can delete events
CREATE POLICY ypwork_events_delete_authenticated
  ON public.ypwork_events
  FOR DELETE TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────────
-- PART 2 · ypwork_tasks — RLS policies สำหรับ authenticated users
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS ypwork_tasks_select_authenticated ON public.ypwork_tasks;
DROP POLICY IF EXISTS ypwork_tasks_write_authenticated ON public.ypwork_tasks;
DROP POLICY IF EXISTS ypwork_tasks_insert_authenticated ON public.ypwork_tasks;
DROP POLICY IF EXISTS ypwork_tasks_update_authenticated ON public.ypwork_tasks;
DROP POLICY IF EXISTS ypwork_tasks_delete_authenticated ON public.ypwork_tasks;

ALTER TABLE public.ypwork_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY ypwork_tasks_select_authenticated
  ON public.ypwork_tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ypwork_tasks_insert_authenticated
  ON public.ypwork_tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY ypwork_tasks_update_authenticated
  ON public.ypwork_tasks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY ypwork_tasks_delete_authenticated
  ON public.ypwork_tasks
  FOR DELETE TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────────
-- PART 3 · ypwork_task_assignees — RLS policies
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS ypwork_task_assignees_select_authenticated ON public.ypwork_task_assignees;
DROP POLICY IF EXISTS ypwork_task_assignees_write_authenticated ON public.ypwork_task_assignees;
DROP POLICY IF EXISTS ypwork_task_assignees_insert_authenticated ON public.ypwork_task_assignees;
DROP POLICY IF EXISTS ypwork_task_assignees_update_authenticated ON public.ypwork_task_assignees;
DROP POLICY IF EXISTS ypwork_task_assignees_delete_authenticated ON public.ypwork_task_assignees;

ALTER TABLE public.ypwork_task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY ypwork_task_assignees_select_authenticated
  ON public.ypwork_task_assignees
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ypwork_task_assignees_insert_authenticated
  ON public.ypwork_task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY ypwork_task_assignees_update_authenticated
  ON public.ypwork_task_assignees
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY ypwork_task_assignees_delete_authenticated
  ON public.ypwork_task_assignees
  FOR DELETE TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────────
-- PART 4 · ypwork_event_members — RLS policies (ถ้ายังไม่มี)
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS ypwork_event_members_select_authenticated ON public.ypwork_event_members;
DROP POLICY IF EXISTS ypwork_event_members_write_authenticated ON public.ypwork_event_members;
DROP POLICY IF EXISTS ypwork_event_members_insert_authenticated ON public.ypwork_event_members;
DROP POLICY IF EXISTS ypwork_event_members_update_authenticated ON public.ypwork_event_members;
DROP POLICY IF EXISTS ypwork_event_members_delete_authenticated ON public.ypwork_event_members;

ALTER TABLE public.ypwork_event_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY ypwork_event_members_select_authenticated
  ON public.ypwork_event_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ypwork_event_members_insert_authenticated
  ON public.ypwork_event_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY ypwork_event_members_update_authenticated
  ON public.ypwork_event_members
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY ypwork_event_members_delete_authenticated
  ON public.ypwork_event_members
  FOR DELETE TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────────
-- PART 5 · ตรวจสอบผลลัพธ์
-- ────────────────────────────────────────────────────────────────
-- รัน query เหล่านี้ใน SQL Editor เพื่อยืนยัน:
--
-- 1) ดู policies ทั้งหมดบน ypwork_events:
--    SELECT polname, cmd, roles, qual, with_check
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'ypwork_events'
--    ORDER BY polname;
--    -- ควรเห็น 4 policies: select, insert, update, delete
--
-- 2) ดู policies ทั้งหมดบน ypwork_tasks:
--    SELECT polname, cmd, roles
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'ypwork_tasks'
--    ORDER BY polname;
--
-- 3) ทดสอบ insert (ต้องสำเร็จ):
--    INSERT INTO public.ypwork_events
--      (type, title, date, status, color, created_by)
--    VALUES
--      ('task', 'ทดสอบ v3.2.0', CURRENT_DATE, 'todo', '#4F46E5', auth.uid());
--    -- ถ้าสำเร็จ → RLS policy ทำงานแล้ว
--    -- (ลบทิ้งหลังทดสอบ)
--    DELETE FROM public.ypwork_events WHERE title = 'ทดสอบ v3.2.0';
-- ═══════════════════════════════════════════════════════════════
