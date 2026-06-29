-- ═══════════════════════════════════════════════════════════════
-- YP WORK · Database Schema (Supabase / PostgreSQL)
-- ═══════════════════════════════════════════════════════════════
-- วิธีใช้: คัดลอก SQL ทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด Run
--
-- หมายเหตุ:
-- - ใช้ร่วมกับ YP Labs project (แชร์ council_users table)
-- - ตารางใหม่ทั้งหมดใช้ prefix ypwork_ เพื่อกันชนกับ YP Labs
-- - council_users ใช้ตารางเดิมของ YP Labs (เก็บข้อมูลผู้ใช้)
-- - ypwork_events เก็บข้อมูลงาน (group/single)
-- - ypwork_tasks เก็บ task ย่อยของกลุ่มงาน
-- - ypwork_departments เก็บฝ่ายงาน
-- - ypwork_event_members เก็บสมาชิกของแต่ละงาน
-- - ypwork_task_assignees เก็บผู้รับผิดชอบ task
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. ypwork_departments — ฝ่ายงาน
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ypwork_departments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#4F46E5',
  icon        TEXT NOT NULL DEFAULT '◎',
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 2. ypwork_events — งาน (group/single)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ypwork_events (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type          TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('group', 'task')),
  title         TEXT NOT NULL,
  date          DATE NOT NULL,
  end_date      DATE,
  time          TEXT DEFAULT '',
  location      TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  department_id TEXT REFERENCES public.ypwork_departments(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('planning', 'todo', 'ongoing', 'done')),
  color         TEXT NOT NULL DEFAULT '#4F46E5',
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ypwork_events_date ON public.ypwork_events(date);
CREATE INDEX IF NOT EXISTS idx_ypwork_events_department_id ON public.ypwork_events(department_id);
CREATE INDEX IF NOT EXISTS idx_ypwork_events_status ON public.ypwork_events(status);
CREATE INDEX IF NOT EXISTS idx_ypwork_events_type ON public.ypwork_events(type);

-- ────────────────────────────────────────────────────────────────
-- 3. ypwork_tasks — task ย่อยของกลุ่มงาน
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ypwork_tasks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  event_id      TEXT NOT NULL REFERENCES public.ypwork_events(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'ongoing', 'done')),
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  estimated_time TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  tags          JSONB NOT NULL DEFAULT '[]'::JSONB,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_event_id ON public.ypwork_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_status ON public.ypwork_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ypwork_tasks_due_date ON public.ypwork_tasks(due_date);

-- ────────────────────────────────────────────────────────────────
-- 4. ypwork_task_assignees — ผู้รับผิดชอบ task (many-to-many)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ypwork_task_assignees (
  task_id      TEXT NOT NULL REFERENCES public.ypwork_tasks(id) ON DELETE CASCADE,
  user_auth_uid TEXT NOT NULL,
  PRIMARY KEY (task_id, user_auth_uid)
);

CREATE INDEX IF NOT EXISTS idx_ypwork_task_assignees_user ON public.ypwork_task_assignees(user_auth_uid);

-- ────────────────────────────────────────────────────────────────
-- 5. ypwork_event_members — สมาชิกของแต่ละงาน (many-to-many)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ypwork_event_members (
  event_id     TEXT NOT NULL REFERENCES public.ypwork_events(id) ON DELETE CASCADE,
  user_auth_uid TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  PRIMARY KEY (event_id, user_auth_uid)
);

CREATE INDEX IF NOT EXISTS idx_ypwork_event_members_user ON public.ypwork_event_members(user_auth_uid);

-- ────────────────────────────────────────────────────────────────
-- 6. ypwork_activity_log — log การเปลี่ยนแปลง (optional)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ypwork_activity_log (
  id            BIGSERIAL PRIMARY KEY,
  event_id      TEXT REFERENCES public.ypwork_events(id) ON DELETE CASCADE,
  task_id       TEXT REFERENCES public.ypwork_tasks(id) ON DELETE CASCADE,
  user_auth_uid TEXT NOT NULL,
  action        TEXT NOT NULL,
  detail        JSONB DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ypwork_activity_log_event ON public.ypwork_activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_ypwork_activity_log_user ON public.ypwork_activity_log(user_auth_uid);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.ypwork_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ypwork_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ypwork_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ypwork_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ypwork_event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ypwork_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ypwork_departments_select_authenticated" ON public.ypwork_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ypwork_events_select_authenticated" ON public.ypwork_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "ypwork_tasks_select_authenticated" ON public.ypwork_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ypwork_task_assignees_select_authenticated" ON public.ypwork_task_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "ypwork_event_members_select_authenticated" ON public.ypwork_event_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "ypwork_activity_log_select_authenticated" ON public.ypwork_activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "ypwork_departments_write_authenticated" ON public.ypwork_departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ypwork_events_write_authenticated" ON public.ypwork_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ypwork_tasks_write_authenticated" ON public.ypwork_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ypwork_task_assignees_write_authenticated" ON public.ypwork_task_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ypwork_event_members_write_authenticated" ON public.ypwork_event_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ypwork_activity_log_write_authenticated" ON public.ypwork_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.ypwork_departments (id, name, color, icon, description) VALUES
  ('d1', 'ฝ่ายบริหาร', '#4F46E5', '👥', 'ประธาน รองประธาน และเลขานุการสภานักเรียน — ดูแลภาพรวมและประสานงานระหว่างฝ่าย'),
  ('d2', 'ฝ่ายกิจกรรม', '#14B8A6', '🎨', 'ดูแลกิจกรรมวันสำคัญ พิธีการ การแสดง และการจัดงานของโรงเรียน'),
  ('d3', 'ฝ่ายวิชาการ', '#10B981', '📚', 'ดูแลการแข่งขันทางวิชาการ การส่งเสริมความรู้ และร่วมมือกับครูที่ปรึกษาวิชาการ'),
  ('d4', 'ฝ่ายทำเนียบ', '#F59E0B', '📋', 'ดูแลเอกสาร การประชุม การเก็บบันทึก และระเบียบต่าง ๆ ของสภานักเรียน'),
  ('d5', 'ฝ่ายการเงิน', '#EC4899', '💰', 'ดูแลงบประมาณ การเบิกจ่าย การรับบริจาค และการระดมทุนของสภานักเรียน'),
  ('d6', 'ฝ่ายประชาสัมพันธ์', '#D946EF', '📢', 'ดูแลการประชาสัมพันธ์ โซเชียลมีเดีย ป้ายประกาศ และการติดต่อกับภายนอก')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ypwork_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ypwork_departments_updated_at ON public.ypwork_departments;
CREATE TRIGGER trg_ypwork_departments_updated_at BEFORE UPDATE ON public.ypwork_departments FOR EACH ROW EXECUTE FUNCTION public.ypwork_set_updated_at();

DROP TRIGGER IF EXISTS trg_ypwork_events_updated_at ON public.ypwork_events;
CREATE TRIGGER trg_ypwork_events_updated_at BEFORE UPDATE ON public.ypwork_events FOR EACH ROW EXECUTE FUNCTION public.ypwork_set_updated_at();

DROP TRIGGER IF EXISTS trg_ypwork_tasks_updated_at ON public.ypwork_tasks;
CREATE TRIGGER trg_ypwork_tasks_updated_at BEFORE UPDATE ON public.ypwork_tasks FOR EACH ROW EXECUTE FUNCTION public.ypwork_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.ypwork_events REPLICA IDENTITY FULL;
ALTER TABLE public.ypwork_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.ypwork_task_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.ypwork_event_members REPLICA IDENTITY FULL;
