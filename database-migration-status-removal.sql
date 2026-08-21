-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Database Migration — Remove status columns
-- Round 10: ลบสถานะออกจากระบบทั้งหมด
-- ═══════════════════════════════════════════════════════════════
-- รันที่ Supabase Dashboard → SQL Editor
-- คำสั่งนี้ปลอดภัย — ไม่มีการลบข้อมูล แค่ลบ column ที่ไม่ใช้แล้ว
-- ═══════════════════════════════════════════════════════════════

-- 1. ลบ status column จากตาราง ypwork_events
ALTER TABLE ypwork_events DROP COLUMN IF EXISTS status;

-- 2. ลบ status column จากตาราง ypwork_tasks
ALTER TABLE ypwork_tasks DROP COLUMN IF EXISTS status;

-- ═══════════════════════════════════════════════════════════════
-- หมายเหตุ:
-- - ถ้ามี index หรือ constraint ที่อ้างอิง column status อยู่
--   PostgreSQL จะลบ index/constraint นั้นด้วยอัตโนมัติ
-- - ถ้ามี RLS policy ที่อ้างอิง status ต้องลบ policy นั้นด้วย
--   ตรวจสอบด้วย: SELECT * FROM pg_policies WHERE tablename = 'ypwork_events' AND qual LIKE '%status%';
-- ═══════════════════════════════════════════════════════════════
