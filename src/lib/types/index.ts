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
  date: string; // YYYY-MM-DD
  end_date: string | null;
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

/** Task ย่อย */
export interface Task {
  id: string;
  event_id: string;
  title: string;
  due_date: string | null;
  /** ★ v3.10.0: เวลาเริ่มทำ (HH:MM format, e.g. "14:30")
   *   ใช้แทน "กำหนดส่ง" เดิม — เปลี่ยน concept จาก deadline → start time
   *   ใช้สำหรับ:
   *     - แยก task ออกเป็นช่วงเช้า (ก่อน 13:00) / ช่วงบ่าย (13:00 ขึ้นไป)
   *     - แสดงเวลาที่ควรเริ่มทำ task นั้น
   *   ถ้าเป็น null = ไม่ระบุเวลาเริ่ม */
  start_time: string | null;
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
