-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Migration · v3.10.0-r51 · Allow NULL date for group events
-- ═══════════════════════════════════════════════════════════════
-- ★ r51 business rule change:
--   กลุ่มรายการ (type = 'group') ไม่บังคับให้มี "กำหนดส่ง" (date)
--   เหตุผล: group สามารถมีรายการย่อยได้หลายอัน แต่ละอันมี due_date ของตัวเอง
--   การตั้ง deadline ระดับ group จึงไม่สื่อความหมาย
--
--   สำหรับ type = 'task' → date ยังบังคับเหมือนเดิม (ในระดับ application logic)
--   แต่ในระดับ DB constraint เราไม่ได้บังคับ NOT NULL ตาม type เพราะ
--   PostgreSQL CHECK constraint แบบ conditional จะซับซ้อนเกินไป
--   และทำให้สลับ type ระหว่าง group/task ลำบาก
--   ดังนั้น application layer (validation) จะเป็นคน enforce แทน
--
-- Changes:
--   1. ALTER COLUMN date DROP NOT NULL
--   2. เพิ่ม comment อธิบาย business rule ใน column
--   3. ไม่ต้อง backfill — group events เดิมที่มี date อยู่แล้วจะยังเก็บค่านั้น
--      (แต่จะไม่ถูกบังคับใช้ใน form ใหม่ — ผู้ใช้สามารถล้างค่าได้ตอนแก้ไข)
-- ═══════════════════════════════════════════════════════════════

-- Step 1: ยกเลิก NOT NULL constraint บน ypwork_events.date
ALTER TABLE ypwork_events ALTER COLUMN date DROP NOT NULL;

-- Step 2: อัพเดต column comment ให้สะท้อน business rule ใหม่
COMMENT ON COLUMN ypwork_events.date IS $$
  วันกำหนดส่ง (deadline) — YYYY-MM-DD หรือ NULL

  ★ r51 business rule:
    - type = 'group' → date อาจเป็น NULL (group ไม่บังคับมี deadline ระดับตัวเอง)
    - type = 'task'  → date ควรเป็น NOT NULL แต่ enforced ที่ application layer
      (เพื่อให้สลับ type group ⇄ task ได้โดยไม่ติด constraint)

  ดู event-validation.ts และ event-date.ts สำหรับ business rule เต็มรูปแบบ
$$;

-- Step 3: สร้าง index เสริมสำหรับ query events ที่มี date (เพื่อ performance)
-- ถ้ายังไม่มี index บน (date) อยู่ → สร้างใหม่
-- ถ้ามีแล้ว → ข้ามไป (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'ypwork_events'
    AND indexname = 'idx_ypwork_events_date'
  ) THEN
    CREATE INDEX idx_ypwork_events_date ON ypwork_events (date);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Verification (optional — run หลัง migration เพื่อตรวจสอบ)
-- ═══════════════════════════════════════════════════════════════
-- SELECT
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'ypwork_events' AND column_name = 'date';
--
-- Expected:
--   is_nullable = 'YES'
--   column_default = NULL
-- ═══════════════════════════════════════════════════════════════
