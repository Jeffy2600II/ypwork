# YP Work

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อย
>
> **เวอร์ชันปัจจุบัน: v3.10.0**

## เกี่ยวกับโครงการ

YP Work เป็นแพลตฟอร์มสำหรับช่วยบริหารจัดการงานและติดตามภารกิจของสภานักเรียน
พัฒนาขึ้นจากประสบการณ์การทำงานจริงภายในสภานักเรียน เพื่อแก้ไขปัญหาการลืมงาน
การติดตามความคืบหน้า และการประสานงานระหว่างสมาชิกให้มีประสิทธิภาพมากยิ่งขึ้น

โครงการนี้เริ่มต้นจากแนวคิดของ **นายนนทกร นนท์สุราช**
ซึ่งดำรงตำแหน่งประธานนักเรียน ประจำปีการศึกษา 2569

## ผู้พัฒนา

**พัฒนาโดย นายนนทกร นนท์สุราช ร่วมกับ Rowingsco**

## เทคโนโลยี

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, Supabase (PostgreSQL)
- Vercel, Realtime WebSocket

## การติดตั้ง

```bash
npm install
npm run dev    # พัฒนา
npm run build  # build production
npm start      # รัน production
```

## โครงสร้างโปรเจกต์

```
src/
├── app/              # Next.js App Router
│   ├── (app)/        # protected routes (today, calendar, events, profile, about)
│   ├── login/        # หน้า login
│   ├── register/     # หน้าลงทะเบียน
│   ├── pending-status/  # หน้าสถานะการลงทะเบียน
│   └── api/          # API routes
├── components/       # shared components
├── lib/              # utilities, hooks, types
└── modules/          # feature modules (today, calendar, events, profile)
```

## หมายเหตุ

ตั้งแต่ v3.9.8 เป็นต้นไป หน้า About จะไม่แสดงประวัติการอัพเดท (changelog) อีกต่อไป
หากต้องการดูประวัติการเปลี่ยนแปลงของแต่ละเวอร์ชัน ให้ดูใน git commit history
