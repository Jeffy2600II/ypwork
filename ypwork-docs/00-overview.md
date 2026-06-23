# 00 — Overview

> ไฟล์ภาพรวม — จุดเริ่มต้นอ่านเอกสาร ypwork

## แนวคิดหลัก (Core Concept)

ypwork คือ ระบบจัดการงานของสภานักเรียน ที่ทำหน้าที่เป็น "สมองของสภา" — แก้ปัญหาหลักที่ทุกสภานักเรียนเผชิญ: **ลืมงานที่ครูมอบหมาย**

ไม่ว่าจะเป็น:
- **งานประจำ** ที่ต้องทำเป็นประจำ (checklist)
- **กิจกรรมใหญ่** ที่มีงานย่อยต่าง ๆ ภายใน (กิจกรรม)

### ปัญหาที่แก้

| ปัญหา | สาเหตุ |
|-------|-------|
| ลืมงาน | ครูมอบหมายงาน แต่ไม่มีที่รวบรวม |
| สับสน | งานหลายอย่างพร้อมกัน ไม่รู้ต้องทำอะไรก่อน |
| ทับซ้อน | แบ่งงานให้คนในสภา แต่ไม่รู้ว่าใครทำอะไรอยู่ |
| ไม่เห็นภาพรวม | กิจกรรมใหญ่มีงานย่อยเยอะ ไม่รู้ว่าก้าวไหนแล้ว |

### Concept Statement

> **"ทุกงานของสภา อยู่ในที่เดียว ดูได้ทุกมุมมอง ไม่มีงานหล่นช่อง"**

## ผู้ใช้หลัก

- สมาชิกสภานักเรียนโรงเรียนคำยางพิทยา (คนที่ login เข้าระบบ)
- ผู้ใช้แต่ละคนมีบทบาทเหมือนกัน (**ไม่มี admin/user แยก**)
- ทุกคนสามารถสร้าง แก้ไข และจัดการงานได้ทั้งหมด

## UX Research — สิ่งที่เรียนรู้จาก 4 แอป

เราศึกษา 4 แอประดับสูง (Google Calendar, Notion, Trello, ClickUp) เพื่อดึงเทคนิค UX/UI ที่โดดเด่นมาปรับใช้

### สิ่งที่ ypwork รวมมา

| Feature | แรงบันดาลใจจาก |
|---------|----------------|
| ปฏิทินเดือน/สัปดาห์/รายวัน | Google Calendar |
| คลิกวัน → สร้างงานเลย (popover) | Google Calendar |
| Kanban board ลาก-วาง | Trello + Notion |
| งานย่อย (subtasks) ในกิจกรรม | Trello + Notion |
| Colored badge หมวดหมู่ | Notion |
| Avatar ผู้รับผิดชอบ | Trello + ClickUp |
| Priority P1/P2/P3 | ClickUp |
| Filter bar หลายตัว + chip | ClickUp |
| Multiple views สลับรวดเร็ว | ClickUp + Google Calendar |

## ความสัมพันธ์กับ yplabs

ypwork เป็น "น้อง" ของ yplabs:

- **แชร์ Supabase project เดียวกัน** — ypwork สร้างตารางใหม่ `ypwork_*` ไม่กระทบตาราง `council_*` ของ yplabs
- **แชร์ระบบ auth เดียวกัน** — ใช้ `council_users` ของ yplabs คน login คนเดียวกัน
- **แชร์ Design System v9.1** — CSS variables, components, animations เหมือนกันทุกอย่าง
- **Deploy แยก** — ypwork เป็น Vercel project ของตัวเอง

## Tech Stack

| Component | Technology | หมายเหตุ |
|-----------|-----------|---------|
| Framework | Next.js 14 (App Router) | เหมือน yplabs |
| Language | TypeScript | เหมือน yplabs |
| Styling | Custom CSS (Design System v9.1) | ไม่ใช่ Tailwind |
| Database | Supabase (PostgreSQL) | DB เดียวกับ yplabs |
| Auth | Supabase Auth | ใช้ระบบเดียวกับ yplabs |
| Realtime | Supabase Realtime | subscribe ตาราง ypwork_* |
| PWA | Service Worker + Manifest | ติดตั้งบนมือถือได้ |
| Font | Noto Sans Thai | ฟอนต์หลัก |
| Deploy | Vercel | เหมือน yplabs |

## สิ่งที่ **ไม่มี** ในระบบ

- ❌ In-web notification / push notification
- ❌ LINE notification (อนาคตอาจเพิ่ม)
- ❌ ระบบ admin/user role (ทุกคนมีสิทธิ์เท่ากัน)
- ❌ ระบบ comment / chat ในงาน
- ❌ File attachment (อนาคตอาจเพิ่ม)
- ❌ Gantt chart / timeline chart

## ขั้นตอนถัดไป

- อ่าน `01-design-system.md` เพื่อเข้าใจ CSS variables + components
- อ่าน `02-views.md` เพื่อเข้าใจ 4 Views
- อ่าน `03-database.md` เพื่อเข้าใจ schema + RLS
- อ่าน `04-modules.md` เพื่อเข้าใจ 6 Core Modules architecture
- อ่าน `05-deployment.md` เพื่อ deploy ขึ้น Vercel
