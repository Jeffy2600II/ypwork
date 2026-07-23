-- ═══════════════════════════════════════════════════════════════
-- YP WORK · v3.10.0 รอบที่ 29 — เพิ่ม column start_date
-- ═══════════════════════════════════════════════════════════════
-- การปรับปรุงครั้งนี้เพิ่ม field "วันที่เริ่มลงมือทำ" (start_date) ให้กับ
-- ทั้ง ypwork_events และ ypwork_tasks เพื่อแยกชัดเจนระหว่าง:
--   - start_date = "จะเริ่มลงมือทำตอนไหน"
--   - date / due_date = "กำหนดส่งภายในเมื่อไหร่" (deadline)
--
-- ก่อนหน้านี้ระบบมีแค่ deadline (date สำหรับ event, due_date สำหรับ task)
-- ทำให้ผู้ใช้มองเห็นแค่ "ส่งเมื่อไหร่" ไม่เห็น "จะเริ่มตอนไหน"
-- การเพิ่ม start_date ช่วยให้ระบบอ้างอิงจากจุดเริ่มต้นได้ ลดความกดดัน
-- จากคำว่า "กำหนดส่ง" ที่ดูแข็งกระด้างเกินไป
--
-- Script นี้ idempotent — รันซ้ำกี่ครั้งก็ได้ ไม่ทำลายข้อมูลเดิม
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. ypwork_events — เพิ่ม column start_date (DATE, nullable)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.ypwork_events
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- Index สำหรับ query ตามช่วงเวลาเริ่มต้น (เผื่อใช้ในอนาคต เช่น dashboard "งานที่กำลังเริ่ม")
CREATE INDEX IF NOT EXISTS idx_ypwork_events_start_date
  ON public.ypwork_events(start_date);

-- ────────────────────────────────────────────────────────────────
-- 2. ypwork_tasks — เพิ่ม column start_date (DATE, nullable)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.ypwork_tasks
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- Index สำหรับ query รายการย่อยตามวันเริ่มต้น
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_start_date
  ON public.ypwork_tasks(start_date);

-- ────────────────────────────────────────────────────────────────
-- 3. Backfill ข้อมูลเดิม — ถ้า start_date เป็น NULL ให้ใช้ค่าจาก
--    date (สำหรับ event) หรือ due_date (สำหรับ task) แบบย้อนหลัง
--    เพื่อให้ระบบมีจุดอ้างอิงเริ่มต้นสำหรับรายการที่สร้างมาก่อนรอบ 29
--    ผู้ใช้สามารถแก้ไขภายหลังได้ ไม่ได้บังคับ
-- ────────────────────────────────────────────────────────────────
UPDATE public.ypwork_events
  SET start_date = date
  WHERE start_date IS NULL;

UPDATE public.ypwork_tasks
  SET start_date = due_date
  WHERE start_date IS NULL AND due_date IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- หมายเหตุ:
--   ไม่จำเป็นต้องเปลี่ยน RLS policy เพราะ start_date เป็นแค่ column ใหม่
--   ภายในตารางเดิม ยังใช้ policy เดิมที่ให้ authenticated เข้าถึงได้ทั้งหมด
--
--   ไม่จำเป็นต้องเพิ่ม trigger ใหม่ เพราะ updated_at trigger มีอยู่แล้ว
--   ครอบคลุมการ update ทุก column รวมถึง start_date
-- ═══════════════════════════════════════════════════════════════
