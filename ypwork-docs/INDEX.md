# ypwork-docs — ดัชนีเอกสาร

> **หลักการ:** เอกสารแยกเป็นไฟล์ตามหน้าที่ของแต่ละส่วน (เรียนรู้จาก Fantrove ที่ใช้โครงสร้าง `fantrove-docs/`)
> ไม่รวมทุกอย่างไว้ในไฟล์เดียว เพื่อให้แก้ไขสะดวก ไม่ชนกันใน git และ AI agent อ่านเฉพาะที่เกี่ยวข้องได้

## โครงสร้างเอกสาร

| ไฟล์ | หัวข้อ | สำหรับใคร |
|------|-------|----------|
| [`00-overview.md`](00-overview.md) | ภาพรวมโปรเจค + แนวคิดหลัก + UX Research | ทุกคน (อ่านก่อนไฟล์อื่น) |
| [`01-design-system.md`](01-design-system.md) | Design System v9.1 (CSS variables, components, animations) | Frontend dev, UI designer |
| [`02-views.md`](02-views.md) | 4 Views (Month / Week / Day / Kanban) + interactions | Frontend dev |
| [`03-database.md`](03-database.md) | Database schema, RLS, Realtime | Backend dev, DBA |
| [`04-modules.md`](04-modules.md) | 6 Core Modules architecture + communication protocol | Architect, AI agent |
| [`05-deployment.md`](05-deployment.md) | Vercel + Supabase deployment guide | DevOps, maintainer |

## ลำดับการอ่านแนะนำ

1. **ครั้งแรก:** `00-overview.md` → เข้าใจภาพรวม
2. **เริ่มพัฒนา:** `04-modules.md` → เข้าใจสถาปัตยกรรม
3. **เขียน UI:** `01-design-system.md` + `02-views.md`
4. **ตั้งค่า DB:** `03-database.md`
5. **Deploy:** `05-deployment.md`

## หลักการอัปเดตเอกสาร

- เปลี่ยนโค้ด → อัปเดตเอกสารในส่วนนั้นทันที
- เปลี่ยน feature ไหน → แก้ไฟล์ที่เกี่ยวข้องกับ feature นั้น
- เพิ่ม feature ใหม่ → เพิ่มเนื้อหาในไฟล์ที่เหมาะสม (หรือสร้างไฟล์ใหม่ถ้าเป็นโดเมนใหม่)

## สิ่งที่ AI Agent ต้องทำก่อนเขียนโค้ด

1. เปิดไฟล์นี้ (INDEX.md) ก่อน — เข้าใจโครงสร้างเอกสาร
2. อ่านเอกสารที่เกี่ยวข้องกับ task ที่จะทำเท่านั้น
3. ทำตามมาตรฐานที่กำหนด — ไม่ skip ไม่ละเลย
4. อัปเดตเอกสาร — commit โค้ด + เอกสารพร้อมกันเสมอ
