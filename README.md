# YP Work

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางรายการ ชุดรายการ ฝ่ายงาน และรายการย่อย
>
> **เวอร์ชันปัจจุบัน: v3.10.0-r47**

## เกี่ยวกับโครงการ

YP Work เป็นแพลตฟอร์มสำหรับช่วยบริหารจัดการรายการและติดตามภารกิจของสภานักเรียน
พัฒนาขึ้นจากประสบการณ์การทำงานจริงภายในสภานักเรียน เพื่อแก้ไขปัญหาการลืมรายการ
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
│   ├── framework/    # window, bottom-sheet, avatar (docking ports มาตรฐาน)
│   ├── layout/       # app-shell (รวม FAB context)
│   └── ui/           # shadcn/ui + custom components
├── lib/
│   ├── core/         # ★ r47: Central Core — contexts และ constants ที่ใช้ร่วม
│   │   ├── fab-context.tsx         # FAB context-aware (ลูก override พฤติกรรมปุ่ม +)
│   │   ├── sheet-timing.ts         # timing constants (กัน magic numbers)
│   │   ├── toast-context.tsx       # inline toast wrapper
│   │   └── pending-delete-retry.ts # self-healing — retry failed deletes
│   ├── hooks/        # realtime hooks + scroll direction + tutorial
│   ├── auth/         # server-side auth guards
│   ├── security/     # CSRF, rate-limit, audit-log, validation
│   ├── supabase/     # supabase client (server + client + middleware)
│   ├── db/           # event-loader, pending-requests
│   ├── api/          # cache utility
│   ├── utils/        # date, id, fetch-retry, user-color, session-cache
│   ├── types/        # TypeScript types
│   └── window-stack.ts  # Zustand store สำหรับ window stack
└── modules/          # feature modules — แต่ละ module เป็น "space station"
    ├── _shared/      # ★ r47: shared module — status-meta, status-picker-sheet
    ├── today/        # Station: Today (today-client, today-task-card)
    ├── calendar/     # Station: Calendar (calendar-view)
    ├── events/       # Station: Events (event-detail, day-view, list, create, card)
    └── profile/      # Station: Profile (profile-view)
```

## สถาปัตยกรรม r47 — Space Station Pattern

รอบ 47 แนะนำแนวคิด "Space Station" — แต่ละ module เป็นสถานีอวกาศที่:
- มี "airlock" (interface) ชัดเจน — รับ/ส่งข้อมูลผ่าน typed exports
- ไม่ shared internal state กับสถานีอื่น — ใช้ message ผ่าน Central Core
- มี "life support" ของตัวเอง (realtime subscription, error handling)
- ใช้ "docking port" มาตรฐาน (lib/core/) สำหรับเชื่อมต่อ

## การปรับปรุงสำคัญในรอบ 47

### Stability Fixes
- **B2 + P1 (Critical):** FAB context-aware — ใน day-view กด + แล้วเปิด form ที่ pre-fill วันที่
- **B4 (Critical):** แก้ race condition ระหว่าง optimistic patch กับ realtime reload (grace period 300ms)
- **R4 (High):** Channel name unique ทุก hook instance — กัน subscription พังเมื่อ 2 instance mount พร้อมกัน
- **E5 (High):** แก้ silent fail ใน delete event — เพิ่ม self-healing retry ผ่าน sessionStorage

### Architecture Improvements
- **Central Core (`lib/core/`):** 4 modules ใหม่สำหรับ shared infrastructure
- **Shared Module (`modules/_shared/`):** StatusPickerSheet + STATUS_META ที่ใช้ร่วมระหว่าง today + event-detail
- **Magic numbers → Constants:** 280ms / 2400ms / 50ms → SHEET_CLOSE_DURATION / TOAST_AUTO_DISMISS / REACT_COMMIT_DURATION
- **Dead code removal:** ลบ useSessionUser + useCsrfFetch (legacy hooks ไม่ได้ใช้)

## หมายเหตุ

ตั้งแต่ v3.9.8 เป็นต้นไป หน้า About จะไม่แสดงประวัติการอัพเดท (changelog) อีกต่อไป
หากต้องการดูประวัติการเปลี่ยนแปลงของแต่ละเวอร์ชัน ให้ดูใน git commit history
