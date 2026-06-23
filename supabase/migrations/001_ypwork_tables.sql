-- ════════════════════════════════════════════════════════════════
-- ypwork — Database Schema Migration
-- ════════════════════════════════════════════════════════════════
-- ypwork shares the SAME Supabase project as yplabs.
-- This migration creates new tables prefixed with `ypwork_` so they
-- do not collide with yplabs' `council_*` tables.
--
-- Tables created:
--   ypwork_categories  — หมวดหมู่ของงาน (custom + 8 defaults)
--   ypwork_tasks       — งาน (checklist หรือ activity)
--   ypwork_assignees   — ผู้รับผิดชอบ (many-to-many ระหว่าง task และ user)
--   ypwork_subtasks    — งานย่อย (เฉพาะ activity)
--
-- Security:
--   - RLS enabled on every table
--   - All authenticated council members can SELECT/INSERT/UPDATE/DELETE
--     (ทุกคนมีสิทธิ์เท่ากัน — ไม่มี admin/user แยก ตามแผน ypwork)
--   - service_role has full access (used by server-side API routes)
--
-- Realtime:
--   - ypwork_tasks, ypwork_subtasks, ypwork_assignees added to
--     supabase_realtime publication
-- ════════════════════════════════════════════════════════════════

-- ─── ypwork_categories ────────────────────────────────────────────
-- หมวดหมู่ของงาน — ผู้ใช้สร้าง/แก้ไข/ลบได้
-- มี 8 default categories ที่จะถูก insert ท้ายไฟล์

CREATE TABLE IF NOT EXISTS ypwork_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '⚙️',
  color       TEXT NOT NULL DEFAULT '#6B7280',
  sort_order  INT  NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ypwork_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ypwork_categories"
  ON ypwork_categories FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read ypwork_categories"
  ON ypwork_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert ypwork_categories"
  ON ypwork_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update ypwork_categories"
  ON ypwork_categories FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete ypwork_categories"
  ON ypwork_categories FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ypwork_categories_sort ON ypwork_categories(sort_order);

-- ─── ypwork_tasks ─────────────────────────────────────────────────
-- งานหลัก — เป็นได้ 2 ประเภท: checklist (งานเดี่ยว) หรือ activity (งานใหญ่มี subtasks)

CREATE TABLE IF NOT EXISTS ypwork_tasks (
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

ALTER TABLE ypwork_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ypwork_tasks"
  ON ypwork_tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read ypwork_tasks"
  ON ypwork_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert ypwork_tasks"
  ON ypwork_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update ypwork_tasks"
  ON ypwork_tasks FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete ypwork_tasks"
  ON ypwork_tasks FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_start_date ON ypwork_tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_deadline   ON ypwork_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_status     ON ypwork_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_category   ON ypwork_tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_created_by ON ypwork_tasks(created_by);

-- ─── ypwork_assignees ─────────────────────────────────────────────
-- ผู้รับผิดชอบของงาน — many-to-many ระหว่าง task และ user
-- หนึ่งงานมีได้หลายผู้รับผิดชอบ

CREATE TABLE IF NOT EXISTS ypwork_assignees (
  task_id  UUID NOT NULL REFERENCES ypwork_tasks(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

ALTER TABLE ypwork_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ypwork_assignees"
  ON ypwork_assignees FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read ypwork_assignees"
  ON ypwork_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert ypwork_assignees"
  ON ypwork_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete ypwork_assignees"
  ON ypwork_assignees FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ypwork_assignees_user ON ypwork_assignees(user_id);

-- ─── ypwork_subtasks ──────────────────────────────────────────────
-- งานย่อย — ใช้เฉพาะกับ task.type = 'activity'

CREATE TABLE IF NOT EXISTS ypwork_subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES ypwork_tasks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  assignee_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  deadline     DATE,
  sort_order   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ypwork_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ypwork_subtasks"
  ON ypwork_subtasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read ypwork_subtasks"
  ON ypwork_subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert ypwork_subtasks"
  ON ypwork_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update ypwork_subtasks"
  ON ypwork_subtasks FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete ypwork_subtasks"
  ON ypwork_subtasks FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ypwork_subtasks_task ON ypwork_subtasks(task_id, sort_order);

-- ─── updated_at trigger ───────────────────────────────────────────
-- อัปเดต updated_at อัตโนมัติเมื่อมีการ update ypwork_tasks

CREATE OR REPLACE FUNCTION ypwork_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ypwork_tasks_updated_at ON ypwork_tasks;
CREATE TRIGGER trg_ypwork_tasks_updated_at
  BEFORE UPDATE ON ypwork_tasks
  FOR EACH ROW
  EXECUTE FUNCTION ypwork_set_updated_at();

-- ─── Enable Realtime ──────────────────────────────────────────────
-- เพิ่มตารางเข้า supabase_realtime publication
-- เพื่อให้ frontend subscribe การเปลี่ยนแปลงแบบ realtime ได้

ALTER PUBLICATION supabase_realtime ADD TABLE ypwork_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE ypwork_subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE ypwork_assignees;

-- ─── Default categories ───────────────────────────────────────────
-- 8 default categories ตามแผน ypwork หัวข้อ 13
-- created_by = NULL (system default — ไม่ผูกกับ user ใด)

INSERT INTO ypwork_categories (name, icon, color, sort_order, created_by)
VALUES
  ('งานประชุม',          '🏫', '#3B82F6', 1, NULL),
  ('งานเอกสาร',          '📋', '#8B5CF6', 2, NULL),
  ('งานจัดงาน/กิจกรรม',    '🎉', '#F59E0B', 3, NULL),
  ('งานประชาสัมพันธ์',     '📢', '#22C55E', 4, NULL),
  ('งานดูแลความสะอาด',    '🧹', '#6B7280', 5, NULL),
  ('งานการเงิน',          '💰', '#EF4444', 6, NULL),
  ('งานวิชาการ',          '📚', '#06B6D4', 7, NULL),
  ('อื่นๆ',               '⚙️', '#6B7280', 8, NULL)
ON CONFLICT DO NOTHING;
