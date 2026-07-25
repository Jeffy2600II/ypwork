// ═══════════════════════════════════════════════════════════════
// YP WORK · Type Definitions
// ═══════════════════════════════════════════════════════════════

/** ฝ่ายงาน */
export interface Department {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

/** ประเภทงาน */
export type EventType = 'group' | 'task';

/** สถานะงาน */
export type EventStatus = 'planning' | 'todo' | 'ongoing' | 'done';

/** งาน */
export interface YPEvent {
  id: string;
  type: EventType;
  title: string;
  /** วันกำหนดส่ง (deadline) — YYYY-MM-DD
   *  ★ v3.10.0 รอบที่ 29: เปลี่ยนความหมายของ field `date` ให้เป็น "วันกำหนดส่ง"
   *    ในมุมของ UX (label บนฟอร์มคือ "กำหนดส่ง") ส่วน `start_date` คือ
   *    วันที่เริ่มลงมือทำงานนั้นจริงๆ
   *    ค่าเดิมใน DB ยังเก็บที่ column `date` เหมือนเดิม เพียงแต่ label บน
   *    ฟอร์ม/UI เปลี่ยนจาก "วันที่" → "กำหนดส่ง" เพื่อสื่อความหมายชัดเจนขึ้น
   */
  date: string; // YYYY-MM-DD (วันกำหนดส่ง)
  /** ★ v3.10.0 รอบที่ 29: วันที่เริ่มลงมือทำงาน — YYYY-MM-DD (ไม่บังคับ)
   *    ถ้าไม่ระบุ → ระบบจะใช้ `date` (วันกำหนดส่ง) เป็นจุดอ้างอิงเวลาเริ่ม
   *    แต่ถ้าระบุ → ระบบจะอ้างอิงจาก start_date + start_time แทน
   *    เพื่อให้ผู้ใช้เห็นว่า "จะเริ่มทำตอนไหน" และ "ส่งภายในเมื่อไหร่" แยกกัน */
  start_date: string | null;
  end_date: string | null;
  /** ★ v3.10.0 รอบที่ 29: เวลาที่เริ่มลงมือทำ (HH:MM) — เดิม field ชื่อ `time`
   *    ถูกใช้เป็นเวลาของวันที่จัดงาน แต่เมื่อมี `start_date` แล้ว
   *    `time` จึงถูกใช้เป็น "เวลาที่เริ่ม" อย่างชัดเจน */
  time: string;
  location: string;
  description: string;
  department_id: string | null;
  status: EventStatus;
  color: string;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  // joined fields (optional — ใช้ตอน query พร้อม department)
  department?: Department | null;
  tasks?: Task[];
  members?: EventMember[];
}

/** สถานะ task */
export type TaskStatus = 'todo' | 'ongoing' | 'done';

/** ลำดับความสำคัญ */
export type TaskPriority = 'low' | 'medium' | 'high';

/** รายการย่อย (Task) */
export interface Task {
  id: string;
  event_id: string;
  title: string;
  /** วันกำหนดส่ง (deadline) — YYYY-MM-DD (ไม่บังคับ) */
  due_date: string | null;
  /** ★ v3.10.0 รอบที่ 9: เวลาเริ่มทำ (HH:MM) — ไม่บังคับ, แยกจาก due_date (วันกำหนดส่ง) */
  start_time: string | null;
  /** ★ v3.10.0 รอบที่ 29: วันที่เริ่มลงมือทำ — YYYY-MM-DD (ไม่บังคับ)
   *    แยกจาก due_date ชัดเจน — start_date คือ "เริ่มเมื่อไหร่"
   *    due_date คือ "ส่งเมื่อไหร่" เพื่อให้ระบบอ้างอิงจากจุดเริ่มต้น
   *    แทนที่จะอ้างแค่จุดสิ้นสุด ทำให้ผู้ใช้เห็นภาพรวมของงานมากขึ้น */
  start_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_time: string;
  notes: string;
  tags: string[];
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // joined fields
  assignees?: UserProfile[];
}

/** ผู้ใช้ (จาก council_users table ของ YP Labs) */
export interface UserProfile {
  auth_uid: string;
  full_name: string;
  student_id: string | null;
  national_id: string | null;
  year: number | null;
  role: string;
  account_type: 'student' | 'teacher' | 'other';
  approved: boolean;
  disabled: boolean;
  email?: string;
  // field เพิ่มเติมสำหรับ YP Work (เก็บใน council_users หรือคำนวณ)
  department_id?: string | null;
  color?: string;
}

/** สมาชิกของงาน */
export interface EventMember {
  event_id: string;
  user_auth_uid: string;
  role: 'leader' | 'member';
  user?: UserProfile;
}

/** Session user (ข้อมูลที่เก็บใน context หลัง login) */
export interface SessionUser {
  auth_uid: string;
  full_name: string;
  student_id: string | null;
  national_id: string | null;
  year: number | null;
  role: string;
  account_type: 'student' | 'teacher' | 'other';
  email: string;
  department_id: string | null;
  color: string;
}

/** ประเภทบัญชีสำหรับ register */
export type RegisterAccountType = 'student' | 'teacher' | 'other';
