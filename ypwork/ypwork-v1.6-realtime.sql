-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Realtime Publication Setup (v1.6)
-- ═══════════════════════════════════════════════════════════════
-- วิธีใช้: คัดลอก SQL ทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด Run
--
-- สคริปต์นี้เปิดใช้ Realtime (push-based updates) สำหรับตารางหลัก:
--   - ypwork_events
--   - ypwork_tasks
--   - ypwork_task_assignees
--   - ypwork_event_members
--
-- หลังรันแล้ว web client สามารถ subscribe ผ่าน WebSocket channel ได้
-- เมื่อมี INSERT / UPDATE / DELETE ในตารางเหล่านี้ Supabase จะ push
-- payload ไปยัง client ทันที — ไม่ต้องมี polling
--
-- ปลอดภัยต่อการรันซ้ำ (idempotent)
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. Ensure Realtime publication exists
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

-- ────────────────────────────────────────────────────────────────
-- 2. Add tables to Realtime publication
--    (ใช้ ALTER … ADD TABLE — safe ถ้า table อยู่ใน publication แล้ว
--     จะ error เล็กน้อย แต่เราจะใช้ DO block เพื่อข้ามไปแบบเงียบ ๆ)
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- ypwork_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ypwork_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ypwork_events;
  END IF;

  -- ypwork_tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ypwork_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ypwork_tasks;
  END IF;

  -- ypwork_task_assignees
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ypwork_task_assignees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ypwork_task_assignees;
  END IF;

  -- ypwork_event_members
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ypwork_event_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ypwork_event_members;
  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────────
-- 3. REPLICA IDENTITY FULL — ทำให้ DELETE/UPDATE events ส่ง payload
--    แบบ full row (ไม่ใช่แค่ PK) ไปยัง subscriber
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.ypwork_events REPLICA IDENTITY FULL;
ALTER TABLE public.ypwork_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.ypwork_task_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.ypwork_event_members REPLICA IDENTITY FULL;

-- ────────────────────────────────────────────────────────────────
-- 4. ตรวจสอบว่า Realtime พร้อมใช้งาน
-- ────────────────────────────────────────────────────────────────
-- รัน query นี้ใน SQL Editor เพื่อยืนยัน:
--
-- SELECT tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
--   AND schemaname = 'public'
--   AND tablename LIKE 'ypwork_%'
-- ORDER BY tablename;
--
-- ควรเห็นอย่างน้อย 4 บรรทัด:
--   ypwork_event_members
--   ypwork_events
--   ypwork_task_assignees
--   ypwork_tasks
-- ═══════════════════════════════════════════════════════════════
