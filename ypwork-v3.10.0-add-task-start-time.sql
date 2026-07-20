-- ═══════════════════════════════════════════════════════════════
-- YP WORK · v3.10.0 — Add start_time column to ypwork_tasks
-- ═══════════════════════════════════════════════════════════════
-- ★ v3.10.0: เปลี่ยน concept จาก "กำหนดส่ง" (deadline) → "เวลาเริ่มทำ" (start time)
--
-- การเปลี่ยนแปลง:
--   1. เพิ่ม column `start_time` (type: text, nullable) ในตาราง ypwork_tasks
--      - เก็บเวลาในรูปแบบ HH:MM (เช่น "14:30", "09:00")
--      - null = ไม่ระบุเวลาเริ่ม
--   2. คง `due_date` เดิมไว้ (เพื่อ backward compatibility)
--      - แต่ UI จะเปลี่ยนจาก "กำหนดส่ง" → "เวลาเริ่มทำ"
--      - และใช้ `start_time` สำหรับแยกช่วงเช้า/บ่าย แทน due_date
--
-- การใช้งาน:
--   - เช้า = start_time ก่อน 13:00 (เช่น "09:00", "12:30")
--   - บ่าย = start_time ตั้งแต่ 13:00 ขึ้นไป (เช่น "13:00", "14:30", "18:00")
--   - ถ้าไม่มี start_time → แสดงในกลุ่ม "ไม่ระบุเวลา"
--
-- หมายเหตุ:
--   - ใช้ `text` type แทน `time` เพื่อความยืดหยุ่น (เหมือน event.time)
--   - ไม่ต้อง backfill ข้อมูลเดิม — task เดิมจะมี start_time = null
--     ซึ่ง UI จะแสดงเป็น "ไม่ระบุเวลา"
-- ═══════════════════════════════════════════════════════════════

-- เพิ่ม column start_time ใน ypwork_tasks
ALTER TABLE ypwork_tasks
  ADD COLUMN IF NOT EXISTS start_time text;

-- Comment สำหรับ documentation
COMMENT ON COLUMN ypwork_tasks.start_time IS
  'v3.10.0: เวลาเริ่มทำ task (HH:MM format). null = ไม่ระบุ. ใช้แยกช่วงเช้า/บ่าย';

-- ═══════════════════════════════════════════════════════════════
-- สำหรับ Supabase Realtime — ไม่ต้องเพิ่ม trigger ใหม่เพราะ
-- ypwork_tasks มี trigger notify_realtime อยู่แล้ว (จาก v1.8)
-- column ใหม่จะถูกส่งใน payload อัตโนมัติเมื่อมี UPDATE
-- ═══════════════════════════════════════════════════════════════
