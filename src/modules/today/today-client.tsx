'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Today Dashboard (v3.10.0-r40 — Pure White Card Redesign)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 40: Redesign การ์ดทั้งหมดใน 3 section ของหน้า Today
//   โดยเน้น "ความขาวสะอาด" (pure white) เป็นหลัก — ลด visual noise
//   ทุกชนิดออกจากการ์ด เพื่อให้การ์ดดูสะอาดตา มีพื้นที่ว่างมากขึ้น
//   แต่ไม่มากเกินไป ผู้ใช้รู้สึกดีเมื่อใช้งานจริง
//
//   หลักการออกแบบ (วิจัยเพื่อให้เข้ากับแพลตฟอร์มของเรา ไม่ก็อปปี้
//   แพลตฟอร์มอื่น 100%):
//
//   1. "ความขาว" เป็น hero ของการ์ด — พื้นหลัง pure white (var(--yp-bg-card))
//      ไม่มี radial accent wash, ไม่มี accent blob, ไม่มี accent bar
//      เพราะสิ่งเหล่านี้เป็น "decoration" ที่เพิ่ม visual noise ไม่ได้
//      ช่วยให้ผู้ใช้เข้าใจเนื้อหา — ตรงข้ามกับหลักการ "สะอาดตา" ที่
//      ผู้ใช้ต้องการ แพลตฟอร์มใหญ่ๆ อย่าง Apple Reminders, Things 3,
//      Notion ใช้ pure white เป็นพื้นหลังการ์ดเป็นหลัก
//
//   2. "รายการย่อย" ไม่มีขอบ ไม่มีเส้นนำ ไม่มี accent tint
//      เพราะข้อความ "รายการย่อย" badge ก็บอกอยู่แล้ว — ไม่ต้องเพิ่ม
//      สิ่งอื่นใดนอกเหนือจากนั้น การ์ดรายการย่อยดูเหมือนการ์ดธรรมดา
//      ทุกประการ แค่มี badge เล็กๆ บอกว่าเป็นรายการย่อย
//
//   3. "เวลา" ย้ายไปที่มุมบน-ขวาของการ์ด (top-right corner)
//      ไม่อยู่ใน meta row แบบเดิม — ทำให้ meta row โล่งขึ้น และเวลา
//      อยู่ที่ตำแหน่งที่สามารถมองเห็นได้ทันที (มุมบน-ขวาเป็นจุดที่ตา
//      สแกนไปถึงเร็วที่สุดในการ์ด) — เหมือน Things 3 ที่เวลาอยู่ที่
//      ขวาสุดของ title row
//
//   4. "Typography" ใช้ --yp-text-xs (12px) ทุกที่ในการ์ด
//      ไม่ใช้ค่า 11px หรือ 10px แบบ custom อีกต่อไป — เพื่อให้
//      เป็นไปในทิศทางเดียวกับแพลตฟอร์มของเรา (ที่ใช้ --yp-text-xs
//      เป็นหลัก) การ์ดจะได้ไม่รู้สึกเหมือน "คนละแพลตฟอร์ม" กับ
//      ส่วนอื่นๆ ของแอป
//
//   5. "Hover" ใช้ subtle gray tint (var(--yp-bg-card-soft))
//      ไม่ใช้ accent-tinted hover — เพราะ accent-tinted hover ทำให้
//      การ์ด "กระโดด" สีเกินไปเวลา hover ดูไม่สะอาดตา สำหรับ
//      ระบบเราที่เน้น pure white เป็นหลัก hover ควรเป็น subtle gray
//      เหมือน Apple Reminders ที่ hover แค่เปลี่ยนเป็น gray นุ่นๆ
//
//   6. "Shadow" ลดเหลือ subtle shadow ชั้นเดียว
//      ไม่ใช้ 2-layer shadow แบบเดิม เพราะ 2-layer ทำให้การ์ดดู
//      "ยกขึ้น" เกินไป สำหรับ pure white card แบบเรา shadow เดียว
//      บางๆ พอ — การ์ดดู "วางอยู่" บนพื้นผิว ไม่ใช่ "ลอย" อยู่
//
//   สรุป: การ์ดใน 3 section ของหน้า Today จะดูสะอาด โล่ง สบายตา
//   เป็นไปในทิศทางเดียวกับแพลตฟอร์มของเรา — เน้น "ขาว" เป็นหลัก
//   ลด decoration ทุกชนิด ใช้ typography มาตรฐานของระบบ
//   ผู้ใช้รู้สึกดีเมื่อใช้งานจริง
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 39: Card Redesign + Chip Cleanup (World-Class Polish)
//   ให้สะอาด ละมุน และเป็นมืออาชีพระดับโลก โดยใช้งานวิจัยจาก
//   แพลตฟอร์มใหญ่ๆ (Linear, Notion, Things 3, Todoist, Apple Reminders,
//   Asana, Trello) เป็นแรงบันดาลใจ — แต่ยังคงไว้ซึ่งเอกลักษณ์
//   การออกแบบเดิม (indigo→violet, accent system, hero cohesion)
//
//   ปัญหาเดิม:
//   1. "ขอบด้านซ้ายของการ์ดรายการย่อย" — ใช้ border-left 3px solid
//      accent ทึบ ๆ หนา ๆ เวลาหลาย ๆ การ์ดซ้อนกันในกลุ่ม ขอบนี้
//      จะรวมกันเป็นแถบสียาว ๆ ขัดตามาก ดูหยาบ ไม่ละมุน
//   2. ชิป (chip) เยอะเกินไป — มีถึง 6-7 ชิปต่อการ์ด (status, priority,
//      assignee, time, est, location, due, from) แต่ละชิปมี label
//      "เวลาเริ่ม", "ใช้เวลา", "กำหนด" ซ้ำกับ icon ทำให้รกและดูไม่เป็น
//      มืออาชีพ
//   3. Subtag "รายการย่อย" badge — ใหญ่และเด่นเกินไป แย่งความสนใจ
//      จาก title ของงานจริง ๆ
//   4. การจัดวางรวม ๆ — ดูเหมือนออกแบบส่ง ๆ ไม่ได้ใส่ใจรายละเอียด
//
//   การแก้ (CSS เท่านั้น ไม่เปลี่ยน class):
//   1. ลบ border-left 3px solid ของ .is-subitem แล้วแทนด้วย:
//      - พื้นหลังสี accent อ่อนมาก (1.5% alpha) เพื่อบอกว่า "เป็น
//        รายการย่อย" แบบนุ่ม ๆ ไม่ใช้ขอบหนา
//      - เส้นนำ accent บาง ๆ (2px, 35% opacity) สั้นกว่าความสูง
//        การ์ด (top: 12px, bottom: 12px) คล้าย "tab marker" ของ
//        Linear/Notion ไม่ใช่ "ขอบเต็ม"
//      - เวลา hover เส้นนำจะขยายเต็มความสูงและเข้มขึ้น slightly
//      ผล: ยังรู้ว่าเป็นรายการย่อย แต่ไม่ขัดตา ดูละมุน
//
//   2. ลด noise ของชิป:
//      - ซ่อน label "เวลาเริ่ม/ใช้เวลา/กำหนด/เริ่ม" — icon ก็บอกอยู่แล้ว
//        ว่าเป็นข้อมูลอะไร (clock = เวลา, calendar = วันที่, alert = เลยกำหนด)
//      - ลด padding ชิปจาก 4px 10px → 3px 8px (กระชับขึ้น)
//      - ลด font-size จาก text-xs (12px) → 11px (เล็กลง)
//      - ลด gap ระหว่างชิปจาก 8px → 6px
//      - ชิป "secondary" (assignee, location, est, from) ใช้สไตล์
//        "ghost" (ไม่มี background, ไม่มี border) เป็นแค่ text + icon
//        สี muted ลด visual weight ลง
//      - ชิป "primary" (status, priority, due-overdue) ยังเป็น pill
//        solid เพื่อให้ดูเด่นเป็นสถานะหลัก
//      ผล: ลดจาก 6-7 ชิปรก ๆ เป็น 2 ชิปเด่น + metadata text บาง ๆ
//
//   3. ลด visual weight ของ subtag badge "รายการย่อย":
//      - ลด background opacity จาก 10% → 5%
//      - ลด border opacity จาก 18% → 10%
//      - เปลี่ยน font-weight จาก bold → semibold
//      - ลด padding จาก 1px 8px → 1px 7px
//      - ปรับ color ให้ blend กับ text-muted (ไม่เด่นเกินไป)
//      ผล: ยังเห็นว่าเป็น "รายการย่อย" แต่ไม่แย่งความสนใจจาก title
//
//   4. ปรับรายละเอียดเล็ก ๆ ที่ทำให้ดูเป็นมืออาชีพ:
//      - Title เพิ่ม letter-spacing -0.005em (subtle refinement)
//      - ลด margin-top ของ meta จาก 8px → 6px (ใกล้ title มากขึ้น)
//      - ลด margin-bottom ของ subtag จาก 8px → 4px (subtag ใกล้ title)
//      - ลด opacity ของ ::before accent bar ของ non-subitem จาก
//        0.75 → 0.6 (ลด visual weight ของ accent bar)
//      - ลด opacity ของ ::after accent blob จาก 0.05 → 0.04 (subtler)
//      ผล: การ์ดดูสะอาดตา สมดุล ไม่มีอะไรโดดเด่นเกินไป
//
//   หลังปรับ: การ์ดใน 3 section ของหน้า Today ดูสะอาด ละมุน เป็น
//   มืออาชีพ — ลด noise ลด chunky ลด visual weight ที่ไม่จำเป็น
//   แต่ยังรักษาเอกลักษณ์การออกแบบเดิม (accent bar, layered wash,
//   indigo→violet cohesion กับ hero)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 38: แก้ปัญหา 2 อย่างที่ทำให้ผู้ใช้เข้าใจผิด
//
//   1. แก้การแบ่ง section ของรายการตาม "วันเริ่ม + วันกำหนดส่ง"
//      ก่อนหน้านี้: ใช้ e.date (วันกำหนดส่ง) เป็นหลักในการแบ่ง
//        - รายการที่เริ่มแล้ว แต่ยังไม่ถึงวันกำหนดส่ง → ไปอยู่ใน
//          "กำลังจะถึง" ทั้งๆ ที่เริ่มทำแล้ว → ผิด!
//      แก้แล้ว: แบ่งตาม effectiveStart และ effectiveDue ของแต่ละรายการ
//        - effectiveDue < วันนี้ และยังไม่เสร็จ → "เลยกำหนด"
//        - effectiveStart ≤ วันนี้ ≤ effectiveDue → "วันนี้"
//          (รวมรายการที่เริ่มแล้วแต่ยังไม่ถึงวันส่ง)
//        - effectiveStart > วันนี้ → "กำลังจะถึง"
//      โดย effectiveStart = start_date || due_date (ถ้าไม่ระบุ start_date
//      ระบบถือว่าเริ่มวันเดียวกับกำหนดส่ง) และ effectiveDue = due_date
//
//   2. ออกแบบ sub-header (yp-today-time-section__head สำหรับแยกช่วง
//      เช้า/บ่าย/ไม่ระบุเวลา และแยกตามวันที่) ใหม่ทั้งหมด
//      ปัญหา: sub-header เดิมโดดเด่นเกินไป มี icon box ใหญ่ มี count
//      chip มี label ตัวหนา — ทำให้ผู้ใช้เข้าใจผิดว่าเป็น "หัวข้อใหม่"
//      หรือ "section ใหม่" ทั้งที่จริงแล้วเป็นแค่ "จุดขั้น" คั่นการ์ด
//      ภายใน section เดียวกัน
//      แก้: ปรับ CSS (ไม่เปลี่ยน class) ให้ sub-header ดูเป็น "divider"
//      ที่บอกแค่ "ตั้งแต่การ์ดนี้ไปเป็นของช่วงเช้า/วันที่ X" ไม่ใช่หัวข้อใหม่
//      - ลบ icon box (เหลือแค่ icon เล็กๆ inline)
//      - ลดขนาด label/caption ให้เล็กและจางลง
//      - ลบ count chip (ให้เป็นตัวเลขเล็กๆ inline)
//      - ใช้เส้นประบางๆ ใต้หัวข้อแทนเส้นทึบ
//      ความรู้สึกหลังปรับ: "อ๋อ มันแค่คั่นการ์ดเฉยๆ" ไม่ใช่ "อ๋อ section ใหม่"
//      (ใช้กับทั้งหน้า today และหน้ารายละเอียดงาน)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 37: ปรับปรุงการออกแบบให้ทั้งหน้า Today เข้ากันมากขึ้น
//   1. ลบข้อความ "แตะรายการเพื่อเปลี่ยนสถานะ" ออกทั้งหมด
//      (ไม่ต้องการ hint ซ้ำซ้อน — ผู้ใช้เข้าใจจากการโต้ตอบได้เอง)
//   2. เพิ่มระยะห่างระหว่าง section ทั้งหมด (hero, overdue, today,
//      upcoming, department overview) ให้เห็นชัดว่า section ไหนจบที่ไหน
//   3. ปรับการ์ดงาน (yp-today-item-card) ให้เข้ากับ hero มากขึ้น
//      โดยใช้ต้นแบบจาก yp-event-card (layered accent wash, accent
//      bar, premium hover) — ไม่เปลี่ยน class แค่ปรับ CSS
//   4. ปรับ yp-today-time-section และ yp-today-section__head ให้มี
//      accent-tinted icon และ count chip ที่ลงตัวกับ hero มากขึ้น
//      ทำให้ทุก section ดูเชื่อมโยงกันแทนแปลกแยก
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 36: ย้อนกลับการเปลี่ยนแปลงของรอบที่ 35 ทั้งหมด
//   (พื้นหลังขาว มุมโค้ง เต็มขอบจอ) กลับไปเหมือนรอบที่ 33
//   คงไว้แค่อย่างเดียว: ระยะห่างระหว่าง 3 section หลัก
//   (เลยกำหนด / วันนี้ / กำลังจะถึง) ที่เพิ่มขึ้นจากรอบที่ 35
//   class "yp-today-section--panel" ยังคงอยู่ในหน้านี้ (ใช้เป็นตัวช่วย
//   เลือก selector สำหรับระยะห่างเท่านั้น ไม่มีผลด้าน background อีกต่อไป)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 33: ปรับปรุงครั้งใหญ่
//
//   ปัญหารอบที่ 32:
//   1. รายการย่อยในกลุ่มแสดงเป็น list แบบธรรมดา (compact)
//      → ไม่สวยเท่าการ์ดในหน้ารายละเอียดกลุ่มรายการ
//   2. มีกรอบใหญ่ (yp-today-group) ครอบกลุ่มรายการ → รก ซ้ำซ้อน
//   3. รายการย่อยที่คนละวันเริ่ม แต่อยู่กลุ่มเดียวกัน → ถูกรวม
//      อยู่วันที่เดียวกันในส่วน "กำลังจะถึง"
//   4. ไม่ชัดเจนพอว่าอันไหนคือรายการย่อย vs รายการธรรมดา
//
//   สิ่งที่เปลี่ยนรอบที่ 33:
//   - ลบ SmartGroupCard / yp-today-group ทิ้งทั้งหมด
//   - ทุกรายการเป็นการ์ดเดี่ยว (เหมือน TaskRow ในหน้ารายละเอียด)
//     มี border, shadow, pill chips, 2-line layout
//   - รายการย่อยมีตัวบอก "รายการย่อย" + ชื่อกลุ่มที่คลิกได้
//   - แยกตาม start_date อย่างเคร่งครัด — งานที่คนละวันเริ่ม
//     ต้องอยู่คนละวัน/คนละ section อย่างเด็ดขาด
//   - คลิกชื่อกลุ่มรายการ → ไปหน้ารายละเอียดงาน
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import {
  getTimeGreeting,
  getLocalTodayStr,
  getThailandTodayParts,
  resolveEventStatus,
  THAI_DAYS,
  THAI_MONTHS,
  relativeDay,
  statusLabel,
  statusChipClass,
} from '@/lib/utils/date';
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalIcon,
  Flag,
  Check,
  Clock,
  Layers,
  Sunrise,
  Sunset,
  CircleDashed,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import type { YPEvent, Department, UserProfile, SessionUser, Task, TaskStatus, EventStatus } from '@/lib/types';
import { useRealtimeEvents, useRealtimeDepartments, useRealtimeDeptMembers, useRealtimeSessionUser } from '@/lib/hooks/use-realtime';

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number; done: number; ongoing: number; overdue: number };
}

// ★ v3.10.0: STATUS_META — เหมือน event-detail-client.tsx
const STATUS_META: Record<
  TaskStatus | EventStatus,
  { color: string; label: string; desc: string }
> = {
  planning: { color: '#A78BFA', label: 'วางแผน', desc: 'ยังอยู่ในขั้นวางแผน' },
  todo: { color: '#F59E0B', label: 'รอเริ่ม', desc: 'ยังไม่ได้เริ่มทำ' },
  ongoing: { color: '#6366F1', label: 'กำลังดำเนินการ', desc: 'กำลังดำเนินการอยู่' },
  done: { color: '#10B981', label: 'เสร็จสมบูรณ์', desc: 'ทำเสร็จเรียบร้อยแล้ว' },
};

const PRIORITY_LBL: Record<string, string> = {
  high: 'เร่งด่วน',
  medium: 'ปกติ',
  low: 'ไม่เร่ง',
};

// ═══════════════════════════════════════════════════════════════
// TYPE: TimelineItem — รายการที่จะแสดงใน timeline
// ═══════════════════════════════════════════════════════════════
interface TimelineItem {
  id: string;
  startTime: string | null;
  title: string;
  status: TaskStatus | EventStatus;
  accent: string;
  parentEvent: YPEvent | null;
  task: Task | null;
  event: YPEvent | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string | null;
  dueDate: string | null;
  location: string | null;
  eventTime: string | null;
  /** วันที่ที่รายการนี้อยู่ (สำหรับจัดกลุ่มแสดงผล) */
  dateContext: string;
  /** ★ v3.10.0 รอบที่ 33: วันที่เริ่มจริงของรายการ (สำหรับแยกกลุ่มตามวันที่) */
  itemDate: string;
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 38: การแบ่ง section ตาม effectiveStart / effectiveDue
//   ก่อนหน้านี้ระบบใช้ e.date (วันกำหนดส่ง) เป็นหลักในการแบ่งว่า
//   รายการจะอยู่ใน section ไหน (เลยกำหนด / วันนี้ / กำลังจะถึง)
//   ทำให้รายการที่เริ่มทำแล้วแต่ยังไม่ถึงวันกำหนดส่ง ไปอยู่ใน "กำลังจะถึง"
//   ทั้งที่จริงๆ ผู้ใช้กำลังทำอยู่แล้ว — ผิดจากความตั้งใจของผู้ใช้
//
//   รอบที่ 38 แก้: แบ่งตาม effectiveStart และ effectiveDue ของแต่ละรายการ
//     - "เลยกำหนด": effectiveDue < วันนี้ และยังไม่เสร็จ
//     - "วันนี้":     effectiveStart ≤ วันนี้ ≤ effectiveDue
//     - "กำลังจะถึง": effectiveStart > วันนี้ (ยังไม่เริ่ม)
//
//   กรณีพิเศษ:
//     - ถ้า status === 'done' และ effectiveDue < วันนี้ → ไม่แสดง
//       (ทำเสร็จแล้วและเลยวันกำหนด ไม่ต้องแสดงใน "เลยกำหนด")
//     - ถ้า status === 'done' และ effectiveStart > วันนี้ → ไม่แสดง
//       (ทำเสร็จก่อนวันเริ่ม — กรณีแปลกๆ ไม่ต้องแสดง)
//     - ถ้า status === 'done' และ effectiveStart ≤ วันนี้ ≤ effectiveDue
//       → แสดงใน "วันนี้" (ทำเสร็จแล้วแต่ยังอยู่ในช่วงเวลาที่กำหนด)
// ═══════════════════════════════════════════════════════════════
type ItemDateContext = 'overdue' | 'today' | 'upcoming';

function categorizeByDates(
  effectiveStart: string,
  effectiveDue: string,
  todayStr: string,
  isDone: boolean
): ItemDateContext | null {
  // ถ้าเลยกำหนดส่งและยังไม่เสร็จ → "เลยกำหนด"
  if (effectiveDue < todayStr && !isDone) return 'overdue';

  // ถ้าเริ่มไปแล้วและยังไม่เลยกำหนด → "วันนี้"
  // (รวม done ที่อยู่ในช่วงเวลาที่กำหนดด้วย)
  if (effectiveStart <= todayStr && effectiveDue >= todayStr) return 'today';

  // ถ้ายังไม่เริ่ม → "กำลังจะถึง" (เฉพาะที่ยังไม่เสร็จ)
  if (effectiveStart > todayStr && !isDone) return 'upcoming';

  // กรณีที่เหลือ: done ในอดีต หรือ done ในอนาคต → ไม่แสดง
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Helper: สร้าง TimelineItem จาก standalone event
//   (group ที่ไม่มี task หรือ event ประเภท task)
// ═══════════════════════════════════════════════════════════════
function buildStandaloneEventItem(ev: YPEvent, dateContext: ItemDateContext): TimelineItem {
  return {
    id: `ev-${ev.id}`,
    startTime: ev.time || null,
    title: ev.title,
    status: ev.type === 'group' ? resolveEventStatus(ev) : ev.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev.type === 'group' ? ev : null,
    task: null,
    event: ev.type === 'group' ? null : ev,
    assigneeName: null,
    assigneeColor: null,
    priority: 'medium',
    estimatedTime: null,
    dueDate: ev.date,
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    itemDate: ev.start_date || ev.date,
  };
}

// ═══════════════════════════════════════════════════════════════
// Helper: สร้าง TimelineItem จาก task ในกลุ่ม
//   effectiveStart/effectiveDue คำนวณจาก task ก่อน ถ้าไม่มี fallback ไป event
// ═══════════════════════════════════════════════════════════════
function buildTaskItem(ev: YPEvent, t: Task, dateContext: ItemDateContext): TimelineItem {
  return {
    id: `task-${t.id}`,
    startTime: t.start_time || ev.time || null,
    title: t.title,
    status: t.status,
    accent: ev.color || '#4F46E5',
    parentEvent: ev,
    task: t,
    event: null,
    assigneeName: t.assignees?.[0]?.full_name?.split(' ')[0] || null,
    assigneeColor: t.assignees?.[0]?.color || null,
    priority: t.priority || 'medium',
    estimatedTime: t.estimated_time || null,
    dueDate: t.due_date || ev.date,
    location: ev.location || null,
    eventTime: ev.time || null,
    dateContext,
    // ★ itemDate ใช้ start_date เป็นหลัก สำหรับจัดกลุ่มแสดงผล
    itemDate: t.start_date || ev.start_date || ev.date,
  };
}

// ═══════════════════════════════════════════════════════════════
// Helper: เรียงลำดับ items — priority → time → title
// ═══════════════════════════════════════════════════════════════
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriorityTimeTitle(a: TimelineItem, b: TimelineItem): number {
  const pa = PRIORITY_ORDER[a.priority] ?? 3;
  const pb = PRIORITY_ORDER[b.priority] ?? 3;
  if (pa !== pb) return pa - pb;
  const sa = a.startTime || '';
  const sb = b.startTime || '';
  if (sa && sb && sa !== sb) return sa.localeCompare(sb);
  if (sa && !sb) return -1;
  if (!sa && sb) return 1;
  return a.title.localeCompare(b.title, 'th');
}

function sortByDatePriorityTimeTitle(a: TimelineItem, b: TimelineItem): number {
  const da = a.itemDate;
  const db = b.itemDate;
  if (da && db && da !== db) return da.localeCompare(db);
  return sortByPriorityTimeTitle(a, b);
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 33: DateCluster — จัดกลุ่ม items ตาม itemDate
//   ใช้แทน SmartGroup + UpcomingDateCluster เดิม
//   แยกตาม itemDate (start_date เป็นหลัก) อย่างเคร่งครัด
//   งานที่คนละวันเริ่ม จะอยู่คนละ cluster อย่างเด็ดขาด
// ═══════════════════════════════════════════════════════════════
interface DateCluster {
  dateKey: string;
  items: TimelineItem[];
  itemCount: number;
}

function buildDateClusters(items: TimelineItem[]): DateCluster[] {
  const clusters: DateCluster[] = [];
  for (const item of items) {
    const dateKey = item.itemDate;
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster && lastCluster.dateKey === dateKey) {
      lastCluster.items.push(item);
      lastCluster.itemCount++;
    } else {
      clusters.push({ dateKey, items: [item], itemCount: 1 });
    }
  }
  return clusters;
}

/** แคปชั่นวันที่เต็ม สำหรับแถบคั่น */
function formatFullDateCaption(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = THAI_DAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `วัน${weekday}ที่ ${day} ${month} ${yearBE}`;
}

// ═══════════════════════════════════════════════════════════════
// Helper: จัดกลุ่ม timeline items ตามช่วงเวลา
// ═══════════════════════════════════════════════════════════════
function buildTimeGroups(items: TimelineItem[]) {
  const morning: TimelineItem[] = [];
  const afternoon: TimelineItem[] = [];
  const unscheduled: TimelineItem[] = [];

  for (const item of items) {
    if (!item.startTime) {
      unscheduled.push(item);
      continue;
    }
    const hour = parseInt(item.startTime.split(':')[0] || '', 10);
    if (!Number.isNaN(hour) && hour < 12) {
      morning.push(item);
    } else {
      afternoon.push(item);
    }
  }
  return { morning, afternoon, unscheduled };
}

export function TodayClient({
  initialEvents,
  user: initialUser,
  dept: initialDept,
  deptMembers: initialDeptMembers,
  deptStats: initialDeptStats,
}: TodayClientProps) {
  const { events, patchEvent, patchTask } = useRealtimeEvents(initialEvents);
  const { user } = useRealtimeSessionUser(initialUser);
  const { departments: liveDepartments } = useRealtimeDepartments(initialDept ? [initialDept] : []);
  const liveDept = user.department_id ? liveDepartments.find((d) => d.id === user.department_id) ?? null : null;
  const { members: liveDeptMembers } = useRealtimeDeptMembers(user.department_id, initialDeptMembers);

  const dept = liveDept ?? initialDept;
  const deptMembers = liveDeptMembers;

  const todayParts = getThailandTodayParts();
  const greeting = getTimeGreeting();
  const dayName = THAI_DAYS[todayParts.weekday];
  const dayNum = todayParts.day;
  const monthName = THAI_MONTHS[todayParts.month];
  const yearBE = todayParts.year + 543;
  const todayLong = `${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
  const todayStr = getLocalTodayStr();

  // ═══════════════════════════════════════════════════════════════
  // ★ v3.10.0 รอบที่ 38: สร้าง timeline items แยกตาม dateContext
  //   โดยใช้ effectiveStart / effectiveDue ของแต่ละรายการ
  //
  //   ก่อนหน้านี้ (รอบที่ 33-37): แบ่ง section ตาม e.date (วันกำหนดส่ง)
  //     - รายการที่เริ่มแล้ว แต่ยังไม่ถึงวันกำหนดส่ง → ไป "กำลังจะถึง"
  //       ทั้งที่จริงๆ ผู้ใช้กำลังทำอยู่แล้ว → ผิด!
  //
  //   รอบที่ 38: แบ่งตาม effectiveStart / effectiveDue ของแต่ละรายการ
  //     - "เลยกำหนด": effectiveDue < วันนี้ และยังไม่เสร็จ
  //     - "วันนี้":     effectiveStart ≤ วันนี้ ≤ effectiveDue
  //     - "กำลังจะถึง": effectiveStart > วันนี้
  //
  //   แต่ละ task ในกลุ่มจะถูกแบ่งด้วยวันที่ของตัวเอง (ถ้ามี) ไม่ใช่
  //   ของ parent event ทั้งกลุ่ม → ทำให้ task ที่เริ่มแล้วในกลุ่มที่ยัง
  //   ไม่ถึงวันส่ง จะไปอยู่ใน "วันนี้" ของผู้ใช้ ไม่ใช่ "กำลังจะถึง"
  // ═══════════════════════════════════════════════════════════════
  const categorizedItems = React.useMemo(() => {
    const overdue: TimelineItem[] = [];
    const today: TimelineItem[] = [];
    const upcoming: TimelineItem[] = [];

    for (const ev of events) {
      if (ev.type === 'group') {
        const tasks = ev.tasks || [];
        if (tasks.length === 0) {
          // Empty group → ใช้วันที่ของ event เอง
          const effectiveStart = ev.start_date || ev.date;
          const effectiveDue = ev.date;
          const isDone = resolveEventStatus(ev) === 'done';
          const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr, isDone);
          if (!ctx) continue;
          const item = buildStandaloneEventItem(ev, ctx);
          if (ctx === 'overdue') overdue.push(item);
          else if (ctx === 'today') today.push(item);
          else upcoming.push(item);
        } else {
          // แต่ละ task แบ่ง section ตามวันที่ของตัวเอง (fallback ไป event)
          for (const t of tasks) {
            const effectiveStart = t.start_date || ev.start_date || ev.date;
            const effectiveDue = t.due_date || ev.date;
            const isDone = t.status === 'done';
            const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr, isDone);
            if (!ctx) continue;
            const item = buildTaskItem(ev, t, ctx);
            if (ctx === 'overdue') overdue.push(item);
            else if (ctx === 'today') today.push(item);
            else upcoming.push(item);
          }
        }
      } else {
        // Standalone task event
        const effectiveStart = ev.start_date || ev.date;
        const effectiveDue = ev.date;
        const isDone = ev.status === 'done';
        const ctx = categorizeByDates(effectiveStart, effectiveDue, todayStr, isDone);
        if (!ctx) continue;
        const item = buildStandaloneEventItem(ev, ctx);
        if (ctx === 'overdue') overdue.push(item);
        else if (ctx === 'today') today.push(item);
        else upcoming.push(item);
      }
    }

    // เรียงลำดับ: overdue/upcoming ใช้ date → priority → time → title
    // today ใช้ priority → time → title (ทุกรายการอยู่ในวันเดียวกัน)
    overdue.sort(sortByDatePriorityTimeTitle);
    today.sort(sortByPriorityTimeTitle);
    upcoming.sort(sortByDatePriorityTimeTitle);

    return { overdue, today, upcoming };
  }, [events, todayStr]);

  const overdueTimelineItems = categorizedItems.overdue;
  const todayTimelineItems = categorizedItems.today;
  const upcomingTimelineItems = categorizedItems.upcoming;

  const timeGroups = React.useMemo(
    () => buildTimeGroups(todayTimelineItems),
    [todayTimelineItems]
  );

  // ★ v3.10.0 รอบที่ 33: ใช้ buildDateClusters แทน buildSmartGroups
  //   แยกตาม itemDate อย่างเคร่งครัด
  const overdueDateClusters = React.useMemo(
    () => buildDateClusters(overdueTimelineItems),
    [overdueTimelineItems]
  );

  const upcomingDateClusters = React.useMemo(
    () => buildDateClusters(upcomingTimelineItems),
    [upcomingTimelineItems]
  );

  const todayTotalCount = todayTimelineItems.length;
  const overdueCount = overdueTimelineItems.length;
  const upcomingCount = upcomingTimelineItems.length;

  const deptStats = React.useMemo(() => {
    if (!dept) return initialDeptStats;
    const deptEvents = events.filter((e) => e.department_id === dept.id);
    return {
      total: deptEvents.length,
      done: deptEvents.filter((e) => resolveEventStatus(e) === 'done').length,
      ongoing: deptEvents.filter((e) => { const s = resolveEventStatus(e); return s === 'ongoing' || s === 'planning'; }).length,
      overdue: deptEvents.filter((e) => e.date < todayStr && resolveEventStatus(e) !== 'done').length,
    };
  }, [events, dept, todayStr, initialDeptStats]);

  // ═══════════════════════════════════════════════════════════════
  // STATUS PICKER
  // ═══════════════════════════════════════════════════════════════
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<TimelineItem | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleOpenStatusPicker = (item: TimelineItem) => {
    setActiveItem(item);
    setStatusPickerOpen(true);
  };

  const handleStatusChange = async (newStatus: TaskStatus | EventStatus) => {
    if (!activeItem) return;
    const item = activeItem;
    const oldStatus = item.status;
    const isTask = !!item.task;
    const isEvent = !!item.event;

    if (isTask && item.task) patchTask(item.task.id, { status: newStatus as TaskStatus });
    else if (isEvent && item.event) patchEvent(item.event.id, { status: newStatus as EventStatus });

    setStatusPickerOpen(false);
    setActiveItem(null);

    try {
      if (isTask && item.task) {
        const res = await fetch(`/api/tasks/${item.task.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
      } else if (isEvent && item.event) {
        const res = await fetch(`/api/events/${item.event.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'unknown error');
      }
      setToast({ msg: `เปลี่ยนสถานะ "${item.title}" เป็น ${statusLabel(newStatus)}`, type: 'success' });
    } catch (e: any) {
      if (isTask && item.task) patchTask(item.task.id, { status: oldStatus as TaskStatus });
      else if (isEvent && item.event) patchEvent(item.event.id, { status: oldStatus as EventStatus });
      setToast({ msg: `ไม่สามารถเปลี่ยนสถานะ: ${e.message || 'unknown'}`, type: 'error' });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // ★ รอบที่ 33: render การ์ดแต่ละใบ
  //   ★ รอบที่ 37: ลบ hint "แตะรายการเพื่อเปลี่ยนสถานะ" ออกทั้งหมด
  //     เพราะผู้ใช้เข้าใจการโต้ตอบได้เองจากการแตะ ไม่ต้องการ hint ซ้ำ
  const renderCardList = (items: TimelineItem[]) => (
    <div className="yp-today-card-list">
      {items.map((item) => (
        <TodayItemCard
          key={item.id}
          item={item}
          onOpenStatusPicker={handleOpenStatusPicker}
          todayStr={todayStr}
        />
      ))}
    </div>
  );

  // ★ รอบที่ 33: render date cluster (สำหรับ overdue และ upcoming)
  //   แยกตาม itemDate อย่างชัดเจน แต่ละวันมีแถบคั่นของตัวเอง
  const renderDateClusterSection = (
    clusters: DateCluster[],
    icon: React.ReactNode,
    getLabel: (dateKey: string) => string,
    isOverdue = false
  ) => (
    <>
      {clusters.map((cluster) => (
        <div className="yp-today-time-section" key={cluster.dateKey || 'no-date'}>
          <div className="yp-today-time-section__head">
            <span className="yp-today-time-section__icon" aria-hidden="true">
              {icon}
            </span>
            <div className="yp-today-time-section__text">
              <div className="yp-today-time-section__label">
                {cluster.dateKey ? getLabel(cluster.dateKey) : 'ไม่ระบุวันที่'}
              </div>
              <div className="yp-today-time-section__caption">
                {cluster.dateKey ? formatFullDateCaption(cluster.dateKey) : 'ยังไม่ได้กำหนดวันที่'}
              </div>
            </div>
            <span className="yp-today-time-section__count">{cluster.itemCount}</span>
          </div>
          {renderCardList(cluster.items)}
        </div>
      ))}
    </>
  );

  const renderOverdueSection = () => {
    if (overdueCount === 0) return null;
    return (
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title yp-today-section__title--overdue">
            รายการที่เลยกำหนด
          </h2>
          <span className="yp-today-section__count yp-today-section__count--overdue">{overdueCount} รายการ</span>
        </div>
        {/* ★ รอบที่ 33: แยกตามวันที่ด้วย date cluster */}
        {overdueDateClusters.length <= 1 ? (
          renderCardList(overdueTimelineItems)
        ) : (
          renderDateClusterSection(overdueDateClusters, <AlertTriangle width={16} height={16} strokeWidth={2} />, (dk) => relativeDay(dk), true)
        )}
      </section>
    );
  };

  const renderTimeSection = (
    label: string,
    caption: string,
    icon: React.ReactNode,
    items: TimelineItem[],
    sectionKey: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="yp-today-time-section">
        <div className="yp-today-time-section__head">
          <span className="yp-today-time-section__icon" aria-hidden="true">{icon}</span>
          <div className="yp-today-time-section__text">
            <div className="yp-today-time-section__label">{label}</div>
            <div className="yp-today-time-section__caption">{caption}</div>
          </div>
          <span className="yp-today-time-section__count">{items.length}</span>
        </div>
        {renderCardList(items)}
      </div>
    );
  };

  return (
    <div className="yp-page yp-page-enter">
      {/* ── HERO ── */}
      <div className="yp-today-hero yp-hero-enter">
        <div className="yp-today-hero__content">
          <div className="yp-today-hero__greeting">{greeting}</div>
          <div className="yp-today-hero__name">{user.full_name}</div>
          <div className="yp-today-hero__date">{todayLong}</div>
          <div className="yp-today-hero__stats">
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{todayTotalCount}</div>
              <div className="yp-today-hero__stat-label">รายการวันนี้</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{upcomingCount}</div>
              <div className="yp-today-hero__stat-label">กำลังจะถึง</div>
            </div>
            <div className="yp-today-hero__stat">
              <div className="yp-today-hero__stat-value">{overdueCount}</div>
              <div className="yp-today-hero__stat-label">เลยกำหนด</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── OVERDUE ── */}
      {renderOverdueSection()}

      {/* ── TODAY ── */}
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">รายการวันนี้</h2>
          <span className="yp-today-section__count">{todayTotalCount} รายการ</span>
        </div>
        {todayTotalCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true"><span role="img" aria-label="ว่าง">🌤️</span></div>
            <div className="yp-empty__title">ไม่มีรายการวันนี้</div>
            <div className="yp-empty__desc">ว่าง ๆ ลองดูรายการที่กำลังจะถึงด้านล่าง</div>
          </div>
        ) : (
          <>
            {renderTimeSection('ช่วงเช้า', 'เริ่มก่อน 12:00 น.', <Sunrise width={16} height={16} strokeWidth={2} />, timeGroups.morning, 'morning')}
            {renderTimeSection('ช่วงบ่าย', 'เริ่มตั้งแต่ 12:00 น. เป็นต้นไป', <Sunset width={16} height={16} strokeWidth={2} />, timeGroups.afternoon, 'afternoon')}
            {renderTimeSection('ไม่ระบุเวลา', 'ยังไม่ได้กำหนดเวลาเริ่ม', <CircleDashed width={16} height={16} strokeWidth={2} />, timeGroups.unscheduled, 'unscheduled')}
          </>
        )}
      </section>

      {/* ── UPCOMING ── */}
      <section className="yp-today-section yp-today-section--panel">
        <div className="yp-today-section__head">
          <h2 className="yp-today-section__title">กำลังจะถึง</h2>
          <span className="yp-today-section__count">{upcomingCount} รายการ</span>
        </div>
        {upcomingCount === 0 ? (
          <div className="yp-empty">
            <div className="yp-empty__icon" aria-hidden="true"><span role="img" aria-label="ว่าง">📅</span></div>
            <div className="yp-empty__title">ยังไม่มีรายการที่กำลังจะถึง</div>
            <div className="yp-empty__desc">กดปุ่ม + เพื่อสร้างรายการใหม่</div>
          </div>
        ) : (
          /* ★ v3.10.0 รอบที่ 33: แยกตาม itemDate (start_date) อย่างเคร่งครัด
             รายการย่อยที่คนละวันเริ่ม จะอยู่คนละแถบคั่นวันที่อย่างเด็ดขาด */
          renderDateClusterSection(
            upcomingDateClusters,
            <CalIcon width={16} height={16} strokeWidth={2} />,
            (dk) => relativeDay(dk),
            false
          )
        )}
      </section>

      {/* ── DEPARTMENT OVERVIEW ── */}
      {dept ? (
        <section className="yp-today-section">
          <div className="yp-today-section__head">
            <h2 className="yp-today-section__title">{dept.icon || '◎'} ภาพรวม{dept.name}</h2>
          </div>
          <div className="yp-stat-grid">
            <div className="yp-stat" style={{ ['--accent' as string]: dept.color }}>
              <div className="yp-stat__icon"><Flag width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.total}</div>
              <div className="yp-stat__label">รายการทั้งหมด</div>
            </div>
            <div className="yp-stat" style={{ ['--accent' as string]: '#10B981' }}>
              <div className="yp-stat__icon"><Check width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.done}</div>
              <div className="yp-stat__label">เสร็จสมบูรณ์</div>
            </div>
            <div className="yp-stat" style={{ ['--accent' as string]: dept.color }}>
              <div className="yp-stat__icon"><Clock width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.ongoing}</div>
              <div className="yp-stat__label">กำลังดำเนินการ</div>
            </div>
            <div className="yp-stat" style={{ ['--accent' as string]: '#F43F5E' }}>
              <div className="yp-stat__icon"><AlertCircle width={18} height={18} /></div>
              <div className="yp-stat__value">{deptStats.overdue}</div>
              <div className="yp-stat__label">เลยกำหนด</div>
            </div>
          </div>
          <div className="yp-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div className="yp-avatar-group">
                {deptMembers.slice(0, 6).map((m) => (
                  <span key={m.auth_uid} className="yp-avatar" style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 'var(--yp-radius-pill)', overflow: 'hidden', boxShadow: 'var(--yp-shadow-xs)', border: '2px solid white' }} title={m.full_name}>
                    <Avatar name={m.full_name} color={m.color} size={28} />
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 'var(--yp-text-xs)', color: 'var(--yp-text-muted)' }}>สมาชิก {deptMembers.length} คน</div>
            </div>
            {dept.description ? (
              <div style={{ fontSize: 'var(--yp-text-xs)', color: 'var(--yp-text-body)', lineHeight: 1.5 }}>{dept.description}</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── STATUS PICKER SHEET ── */}
      <BottomSheet
        open={statusPickerOpen}
        onClose={() => { setStatusPickerOpen(false); setActiveItem(null); }}
        title="สถานะของรายการ"
        description={activeItem?.title}
      >
        <div className="yp-status-picker">
          {activeItem ? (
            (activeItem.task
              ? (['todo', 'ongoing', 'done'] as TaskStatus[])
              : (['todo', 'ongoing', 'done'] as EventStatus[])
            ).map((s) => {
              const meta = STATUS_META[s];
              const isCurrent = activeItem.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  className={`yp-status-picker__option${isCurrent ? ' is-current' : ''}`}
                  style={{ ['--status-color' as string]: meta.color }}
                  onClick={() => handleStatusChange(s)}
                >
                  <div className="yp-status-picker__icon">
                    {s === 'done' ? <Check width={16} height={16} /> : s === 'ongoing' ? <RefreshCw width={14} height={14} /> : <Clock width={14} height={14} />}
                  </div>
                  <div className="yp-status-picker__text">
                    <div className="yp-status-picker__label">{meta.label}</div>
                    <div className="yp-status-picker__desc">{meta.desc}</div>
                  </div>
                  {isCurrent ? <div className="yp-status-picker__check"><Check width={18} height={18} /></div> : null}
                </button>
              );
            })
          ) : null}
        </div>
      </BottomSheet>

      {/* ── Toast ── */}
      {toast ? <div className={`yp-toast yp-toast--${toast.type || 'info'}`}>{toast.msg}</div> : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 33: TodayItemCard — การ์ดเดี่ยวสำหรับทุกรายการ
//
//   การออกแบบ:
//   - เหมือน TaskRow ในหน้ารายละเอียดกลุ่มรายการ (border, shadow,
//     pill chips, 2-line layout)
//   - รายการย่อย: มีแถบบอก "รายการย่อย" + ชื่อกลุ่มที่คลิกได้
//     (Link ไปหน้ารายละเอียดกลุ่มรายการ)
//   - รายการธรรมดา: ไม่มีแถบรายการย่อย
//   - แตะที่การ์ด → เปลี่ยนสถานะ
//   - กดลูกศร → ไปหน้ารายละเอียด
// ═══════════════════════════════════════════════════════════════
function TodayItemCard({
  item,
  onOpenStatusPicker,
  todayStr,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
}) {
  const accent = item.accent;
  const detailHref = item.event ? `/events/${item.event.id}` : (item.parentEvent ? `/events/${item.parentEvent.id}` : '#');
  const isOverdue = item.dateContext === 'overdue';
  const isUpcoming = item.dateContext === 'upcoming';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';
  // ★ รอบที่ 33: ระบุว่าเป็นรายการย่อยหรือไม่
  const isSubItem = !!item.parentEvent && !!item.task;

  return (
    <div
      className={`yp-today-item-card${item.status === 'done' ? ' is-done' : ''}${isSubItem ? ' is-subitem' : ''}`}
      style={{
        ['--accent' as string]: accent,
        // ★ v3.10.0 รอบที่ 40: ส่ง --has-time ให้ CSS เพื่อ reserve พื้นที่
        //   ที่มุมบน-ขวาของการ์ดสำหรับ time chip — ถ้าไม่มีเวลา ก็ไม่ต้อง
        //   reserve พื้นที่ (title ใช้พื้นที่เต็มได้)
        ['--has-time' as string]: item.startTime ? '1' : '0',
      }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStatusPicker(item); } }}
      aria-label={`${item.title}${isSubItem ? ' (รายการย่อย)' : ''} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* ── Status dot ── */}
      <button
        type="button"
        className={`yp-today-item-card__dot yp-today-item-card__dot--${item.status}`}
        aria-label={`เลือกสถานะ — ${statusLabel(item.status)}`}
        onClick={(e) => { e.stopPropagation(); onOpenStatusPicker(item); }}
        style={{ border: '2px solid', background: 'transparent', cursor: 'pointer', padding: 0 }}
      />

      {/* ── Body (title + chips — ไม่มี time chip แล้ว) ── */}
      <div className="yp-today-item-card__body">
        {/* ★ รอบที่ 33: แถบบอก "รายการย่อย" + ชื่อกลุ่มที่คลิกได้
           ★ v3.10.0 รอบที่ 40: badge เล็กลง ไม่เด่น เพราะแค่บอกว่าเป็น
             รายการย่อย ไม่ต้องเพิ่ม decoration อื่นๆ (ขอบ เส้นนำ ฯลฯ) */}
        {isSubItem && item.parentEvent ? (
          <div className="yp-today-item-card__subtag">
            <span className="yp-today-item-card__subtag-badge">
              <Layers width={11} height={11} />
              รายการย่อย
            </span>
            <Link
              href={`/events/${item.parentEvent.id}`}
              className="yp-today-item-card__subtag-group"
              onClick={(e) => e.stopPropagation()}
              aria-label={`ดูกลุ่มรายการ: ${item.parentEvent.title}`}
            >
              จากกลุ่ม: {item.parentEvent.title}
              <ArrowUpRight width={10} height={10} className="yp-today-item-card__subtag-arrow" />
            </Link>
          </div>
        ) : null}

        <div className="yp-today-item-card__title">{item.title}</div>
        <div className="yp-today-item-card__meta">
          {/* Status chip */}
          <span className={`yp-today-item-card__chip yp-today-item-card__status yp-today-item-card__status--${item.status}`}>
            {item.status === 'done' ? <Check width={11} height={11} /> : item.status === 'ongoing' ? <RefreshCw width={11} height={11} /> : <Clock width={11} height={11} />}
            {statusLabel(item.status)}
          </span>

          {/* Priority chip */}
          {priority !== 'medium' ? (
            <span className={`yp-today-item-card__chip yp-today-item-card__priority is-priority-${priority}`}>
              {priorityLbl}
            </span>
          ) : null}

          {/* Assignee chip */}
          {item.assigneeName ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--assignee">
              {item.assigneeColor ? <Avatar name={item.assigneeName} color={item.assigneeColor} size={16} /> : null}
              {item.assigneeName}
            </span>
          ) : null}

          {/* ★ v3.10.0 รอบที่ 40: Time chip ย้ายออกจาก meta ไปอยู่ที่มุม
             บน-ขวาของการ์ดแทน — ทำให้ meta row โล่งขึ้น และเวลาอยู่ที่
             ตำแหน่งที่มองเห็นได้ทันที */}

          {/* Est time chip */}
          {item.estimatedTime ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--est">
              <Clock width={11} height={11} />
              <span className="yp-today-item-card__chip-label">ใช้เวลา</span>
              {item.estimatedTime}
            </span>
          ) : null}

          {/* Location chip */}
          {item.location ? (
            <span className="yp-today-item-card__chip">{item.location}</span>
          ) : null}

          {/* ★ รอบที่ 33: Date chip for overdue — ใช้ itemDate (start_date) */}
          {isOverdue && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due is-overdue">
              <AlertTriangle width={11} height={11} />
              <span className="yp-today-item-card__chip-label">กำหนด</span>
              {relativeDay(item.itemDate)}
            </span>
          ) : null}

          {/* ★ รอบที่ 33: Date chip for upcoming — ใช้ itemDate */}
          {isUpcoming && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--due">
              <CalIcon width={11} height={11} />
              <span className="yp-today-item-card__chip-label">เริ่ม</span>
              {relativeDay(item.itemDate)}
            </span>
          ) : null}

          {/* ★ รอบที่ 33: ถ้าเป็น standalone task ที่มาจาก event อื่น
              (ไม่ใช่ sub-item แต่เป็น standalone task ที่ due_date ตรง)
              แสดง "จาก:" chip */}
          {!isSubItem && item.parentEvent && item.parentEvent.date !== todayStr && !isOverdue && !isUpcoming ? (
            <span className="yp-today-item-card__chip yp-today-item-card__chip--from">
              ↪ จาก: {item.parentEvent.title}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── ★ v3.10.0 รอบที่ 40: Time chip ที่มุมบน-ขวาของการ์ด ──
         ย้ายออกจาก meta row มาอยู่ที่ top-right corner — เหมือน Things 3
         ที่เวลาอยู่ขวาสุดของ title row ทำให้มองเห็นได้ทันทีโดยไม่ต้องสแกน
         ไปที่ meta row ด้านล่าง ใช้ absolute positioning เพื่อให้ไม่
         กระทบกับ flex layout ของ card body */}
      {item.startTime ? (
        <span
          className="yp-today-item-card__chip yp-today-item-card__chip--time"
          aria-label={`เวลาเริ่ม ${item.startTime}`}
        >
          <Clock width={12} height={12} />
          {item.startTime}
        </span>
      ) : null}

      {/* ── Detail link ── */}
      <Link
        href={detailHref}
        className="yp-today-item-card__link"
        aria-label={`ดูรายละเอียด: ${item.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronRight width={14} height={14} />
      </Link>
    </div>
  );
}
