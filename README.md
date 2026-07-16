# YP Work

> **สมองของสภานักเรียน** — แพลตฟอร์มภายในสำหรับจัดตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อย
>
> **เวอร์ชันปัจจุบัน: v3.9.6** — Terminology Update: "ส่งคำขอ" → "ลงทะเบียน"

> ## What's new in v3.9.6

> ### 📝 Terminology — เปลี่ยน "ส่งคำขอ" → "ลงทะเบียน"
> - เปลี่ยนคำศัพท์ในกระบวนการสร้างบัญชีจาก "ส่งคำขอ" เป็น "ลงทะเบียน"
> - ให้ดูเป็นมืออาชีพและคุ้นเคยมากขึ้น
> - ครอบคลุมทุกหน้า: login, register, pending-status, about
> - รวมถึง toast messages, error messages, ปุ่ม, หัวข้อ, และคำอธิบาย

> ### 📄 About Page Update
> - อัปเดตเวอร์ชันเป็น 3.9.6
> - เพิ่ม changelog v3.9.6
> - เก็บ changelog v3.9.5 และเวอร์ชันก่อนหน้าไว้อ้างอิง

---

> ## เวอร์ชันก่อนหน้า

> ### 🛠 Fix — แก้ปฏิทินกริดล้นออกจากกรอบบนมือถือ
> - **อาการ**: บนหน้าจอแคบ ปฏิทินกริดมุมมองเดือนล้นออกจากกรอบ
> - **สาเหตุ**: `repeat(7, 1fr)` = `minmax(auto, 1fr)` — คอลัมน์ขยายตามเนื้อหา
> - **วิธีแก้**: เปลี่ยนเป็น `repeat(7, minmax(0, 1fr))` + `min-width: 0` + `overflow: hidden`

> ### 🎨 Design — ปรับขนาดบนมือถือให้กะทัดรัดขึ้น
> - ลด horizontal padding ของ container บนมือถือ (0.75rem → 0.5rem)
> - ลด min-height ของ cell บนมือถือ (50px → 44px)
> - ลดขนาด dots บนมือถือ (6px → 5px)
> - ลด scale hover ของ today cell (1.02 → 1.01) กัน visual overflow

> ### 📄 About Page Update
> - อัปเดตเวอร์ชันเป็น 3.9.5
> - เพิ่ม changelog v3.9.5
> - เก็บ changelog v3.9.4 และเวอร์ชันก่อนหน้าไว้อ้างอิง

---

> ## เวอร์ชันก่อนหน้า

> ### 🛠 Fix — แก้ timezone ปฏิทิน/วันที่ ให้ตรงเวลาไทย
> - ก่อนหน้านี้ user เปิดเว็บจากต่างประเทศ "วันนี้" อาจไม่ตรงกับไทย
> - ใช้ `Intl.DateTimeFormat` กับ `timeZone: 'Asia/Bangkok'` สำหรับทุกการคำนวณ
> - แม่นยำเสมอ แม้ user อยู่ timezone อื่น

> ### 🎨 Design — ลดความหนาแน่นของ SVG patterns
> - tile size ใหญ่ขึ้น 2-3x (32px → 64px, 40px → 80px, 60px → 120px)
> - opacity ลดลง 40-50% (10% → 5%, 5% → 2-3%)
> - สบายตาขึ้น ไม่แน่นจนรบกวนการอ่าน

> ### 🎨 Design — ออกแบบปฏิทินใหม่ทั้ง 2 มุมมอง
> - อ้างอิง Apple Calendar, Google Calendar, Notion Calendar
> - Container ยังคงความโค้งมนสูง (เอกลักษณ์ YP Work)
> - Cells ภายในใช้รัศมี 10px (ตามมาตรฐาน calendar)
> - สัดส่วนสมดุลด้วย aspect-ratio 1/1
> - Today cell แบบ Apple Calendar (gradient + white text + shadow)
> - เพิ่ม legend อธิบายสี + month summary ใน list view
> - Day header แบบ card + Today badge + status dot ในแต่ละ event

> ### 📄 About Page Update
> - อัปเดตเวอร์ชันเป็น 3.9.4
> - เพิ่ม changelog v3.9.4
> - เก็บ changelog v3.9.3 และเวอร์ชันก่อนหน้าไว้อ้างอิง

---

> ## เวอร์ชันก่อนหน้า

> ### 🎨 Design — โค้งมนมากขึ้นทุกที่
> - ปรับเพิ่ม `--yp-radius-*` ทุกระดับ (xs +2, sm +2, md +4, lg +6, xl +8, 2xl +12)
> - การ์ด, ปุ่ม, ช่องกรอก, การ์ดงาน, hero block — ทุกอย่างโค้งมนกว่าเดิม
> - อ้างอิงจาก Linear, Vercel, Apple Vision Pro และ Telegram ที่เคลื่อนไปที่ "soft squircle"

> ### 🎨 Design — ยกเลิก hover บนปุ่มบวก (FAB)
> - ปุ่ม "+ สร้างงาน" จะไม่มี hover effect อีกต่อไป
> - ไม่ขยาย, ไม่ยกขึ้น, ไม่เปลี่ยนเงา, ไม่มี halo glow
> - คงไว้เฉพาะ active (press) state ที่ให้ feedback ตอนกดจริง

> ### 🎨 Design — เพิ่มระยะจากขอบซ้าย-ขวา
> - `--yp-page-pad-x` เพิ่มขึ้น 0.25rem ทุก breakpoint
> - mobile 1.125rem, tablet 1.75rem, desktop 2rem

> ### 🎨 Design — ยกเครื่อง Hero block ใหม่ทั้ง 3 แบบ
> - today hero, detail hero (group), single hero (single)
> - เปลี่ยนจาก plain gradient เป็น layered surface แบบ premium
> - mesh gradient (4 จุดแสง) + SVG pattern overlay + deeper layered shadow
> - อ้างอิงจาก Telegram chat backgrounds, Linear project pages,
>   Stripe gradient mesh และ Vercel card design

> ### 🎨 Design — พื้นหลังแบบ Telegram chat
> - ตัว body ของทุกหน้ามี subtle dot grid + plus signs overlay
> - แทนพื้นสีทึบ ทำให้เว็บมี "ชีวิต" และ depth โดยไม่เสียตัวตนของดีไซน์เดิม
> - ใช้ SVG data-URI (no network request) + สีโปร่งใสต่ำกว่า 5% opacity

> ### 🎨 Design — ธีมของแต่ละงานสวยขึ้น
> - หน้ารายละเอียดงาน (group + single) ใช้ `--accent` ในเชิงลึกมากขึ้น
> - mesh gradient ที่ tint ด้วยสีงาน, dot pattern + plus signs ซ้อนบน hero
> - frosted glass pill สำหรับ type badge และ icon tile
> - description card ที่มี accent-tinted radial gradient
> - ทำให้แต่ละงานรู้สึกมี "theme" ของตัวเองเหมือน Linear project pages

> ### 🎨 Design — รายละเอียดเล็ก ๆ ที่ดีขึ้น
> - Stat tiles บน today hero เป็น frosted glass (backdrop-filter blur)
> - event card มี accent-tinted radial wash + base shadow
> - yp-card มี vertical gradient + inset highlight แบบ Apple paper

> ### 📄 About Page Update
> - อัปเดตเวอร์ชันเป็น 3.9.3
> - เพิ่ม changelog v3.9.3
> - เก็บ changelog v3.9.2 และเวอร์ชันก่อนหน้าไว้อ้างอิง

---

> ## เวอร์ชันก่อนหน้า

> ### 🎨 Design — รวม token ที่ซ้ำซ้อนให้เหลือจุดเดียว
> - **ปัญหาจริง**: v3.7.4 แก้ inline-style ไปแล้วส่วนหนึ่ง แต่ใน `globals.css` เอง
>   ก็มีปัญหาแบบเดียวกัน — component เดิม (`.yp-page-header`, `.yp-card`,
>   `.yp-skeleton`, `.yp-select`, `.yp-btn`) ถูกประกาศสไตล์ซ้ำ 2-3 รอบคนละจุดในไฟล์
>   แต่ละรอบใช้ token หรือค่าคนละตัว (เช่น `.yp-page-header` มี margin-bottom
>   จาก 3 นิยามที่ให้ค่า `--yp-space-4`, `--yp-space-6`, `--yp-space-5` ต่างกัน
>   ผลลัพธ์สุดท้ายขึ้นกับลำดับ cascade ไม่ใช่การตั้งใจออกแบบ)
> - **วิธีแก้**: รวมทุก component ให้เหลือนิยามเดียว ใช้ token เดียวต่อ property
>   ไม่มีการ "บวกเพิ่ม" ทับกันอีก — แก้แล้วที่ `.yp-page-header`, `.yp-card`,
>   `.yp-skeleton`, `.yp-select`, `.yp-btn`
>
> ### 🎨 Design — Selected state เรียบง่ายขึ้น (แค่กรอบ)
> - `.yp-type-option.is-selected`, `.yp-priority-option.is-selected` — เหลือแค่
>   border 2px รอบนอก ไม่มี background tint / box-shadow ซ้อนแล้ว
> - `.yp-color-option.is-selected` — เหลือ ring เดียว (box-shadow 1 ชั้น)
>   เอา scale + double-ring + pseudo-element จุดขาวตรงกลางออก
> - ทุกหน้าที่มีตัวเลือก (ประเภทงาน, สี, priority) จะรู้สึกเหมือนกันตอนนี้
>
> ### 🎨 Design — เลิก inline style ที่แปะ token ทับ class
> - `.yp-card` ที่วางต่อกันในหน้า (about, events list ฯลฯ) เคยมี
>   `style={{ marginBottom: 'var(--yp-space-4)' }}` ซ้ำทุกจุด (13 จุดใน about page)
>   → แทนที่ด้วย CSS rule เดียว: `.yp-page > .yp-card + .yp-card { margin-top: var(--yp-space-4) }`
> - `.yp-help-section` ก็เช่นกัน → `.yp-help-section + .yp-help-section { margin-top: var(--yp-space-3) }`
> - `events-list-view.tsx`: เอา `style={{ paddingBottom: '6px' }}` (magic number)
>   ที่แปะทับ `.yp-page-header` ออก ให้ใช้ spacing เดียวกับหน้าอื่น
>
> ### 📄 About Page Update
> - อัปเดตเวอร์ชันเป็น 3.7.5
> - เพิ่ม changelog v3.7.5
> - เก็บ changelog v3.7.4, v3.7.3, v3.7.2, v3.7.1, v3.7.0, v3.6.0 ไว้อ้างอิง
>
> ---
>
> ## เวอร์ชันก่อนหน้า
>
> ### v3.7.4 — Pattern-based utility classes (แก้ปัญหา "UI คนละยุค")
> Banner classes, icon/text utilities, flex/text utilities, accent-driven pattern, ลด inline styles
>
> ### v3.7.3 — Unified design system + reuse utility classes
> Design tokens สำหรับ form fields, utility classes ใหม่ 8 ตัว, ลด CSS duplication
>
> ### v3.7.2 — Auto-login fix + register redirect fix
> Server-side auto-login endpoint, hard navigation หลัง approve/register
>
> ### v3.7.1 — Critical logout fix (cookies ไม่ถูกล้าง)
> `/api/auth/logout` server-side endpoint, `?logged_out=1` middleware escape
>
> ### v3.7.0 — Bug fixes (color column + logout hang v1)
> ลบ color จาก council_users queries, getUserColor helper, logout timeout
>
> ### v3.6.0 — Design consistency + Stability + Performance (delete speed)
> Form input consistency, remove "demo" text, fetchWithRetry, about page update
>
> ### v3.5.0 — UX/UI overhaul + Performance
> Bottom sheet drag-to-close fix, desktop popup design, delete speed (v1)
>
> ### v3.4.1 — Hotfix สำหรับ "Missing CSRF token"
> ลบ CSRF enforcement ออกจาก middleware + softening COEP
>
> ### v3.4.0 — Performance + Security + UX overhaul
> Performance ~40-60% เร็วขึ้น, security headers, micro-interactions
>
> ### v3.3.0
> แก้ปัญหา "ข้อมูลแสดงผลได้แป๊บเดียวแล้วหายไป" ด้วยการย้าย read operations ทั้งหมดไปใช้ API routes

---

## ยินดีต้อนรับสู่ YP Work

YP Work คือเว็บแอปที่ช่วยให้สภานักเรียนจัดการงานต่าง ๆ ได้ในที่เดียว ไม่ว่าจะเป็นงานประจำฝ่าย กิจกรรมร่วมระหว่างฝ่าย หรือ task เล็ก ๆ ที่ต้องทำให้เสร็จภายในสัปดาห์ ทุกคนในทีมเห็นตารางเดียวกันแบบ realtime แก้ไขแล้วเห็นทันที ไม่ต้องรีเฟรช ไม่ต้องถามกันในกลุ่ม

เอกสารนี้คือคู่มือการใช้งานสำหรับสมาชิกสภานักเรียน เขียนแบบเรียบง่าย ไม่มีศัพท์เทคนิค อ่านจบแล้วใช้งานได้เลย

---

## เริ่มต้นใช้งาน

### 1. สมัครสมาชิก

สมาชิกใหม่ของสภานักเรียนสมัครผ่านหน้า **สมัครสมาชิก** โดยใช้:

- **เลขบัตรประจำตัวประชาชน** 13 หลัก
- **รหัสนักเรียน** ที่โรงเรียนออกให้
- ข้อมูลพื้นฐาน: ชื่อ-นามสกุล, ระดับชั้น, ฝ่ายที่สังกัด

หลังกดสมัคร ระบบจะแสดงหน้า **รออนุมัติ** ผู้ดูแลระบบ (admin) จะตรวจสอบและอนุมัติภายใน 1-2 วัน ทำ เมื่ออนุมัติแล้วจะเข้าระบบได้ทันที

### 2. เข้าสู่ระบบ

หลังจากได้รับการอนุมัติแล้ว เข้าสู่ระบบที่หน้า **เข้าสู่ระบบ** ด้วยเลขบัตรประชาชน + รหัสนักเรียนเดียวกับตอนสมัคร ระบบจะจำ session ไว้ในเบราว์เซอร์ ปิดแท็บแล้วเปิดใหม่ก็ยังอยู่ในระบบ

หากลืมรหัสนักเรียนหรือเจอปัญหาการเข้าสู่ระบบ ติดต่อผู้ดูแลระบบของฝ่าย

### 3. ออกจากระบบ

ที่หน้า **โปรไฟล์** มีปุ่มออกจากระบบ กดแล้วยืนยันก็ออกจากระบบทันที

---

## โครงสร้างหน้าหลัก

YP Work มี 4 หน้าหลัก อยู่ในแถบนำทางด้านล่าง (มือถือ) หรือด้านซ้าย (desktop):

| หน้า | ไอคอน | ไว้สำหรับ |
|------|-------|---------|
| **หน้าแรก** | บ้าน | ภาพรวมวันนี้ — งานเร่งด่วน งานเลยกำหนด งานที่ต้องทำในสัปดาห์นี้ |
| **ปฏิทิน** | ปฏิทิน | ดูงานทั้งเดือนในรูปแบบ calendar คลิกวันที่เพื่อดูรายละเอียด |
| **งาน** | รายการ | รวมทุกงานในระบบ กรองตามสถานะ/ฝ่าย/ความสำคัญ |
| **โปรไฟล์** | คน | ข้อมูลบัญชี + สถิติงานที่รับผิดชอบ + ปุ่มออกจากระบบ |

ด้านบนของทุกหน้ามี **แถบหัว** แสดงชื่อหน้าปัจจุบัน และรูปโปรไฟล์ (คลิกเพื่อไปหน้าโปรไฟล์)

---

## การจัดการงาน

### ประเภทของงาน

YP Work แบ่งงานเป็น 2 ประเภท:

1. **งานเดี่ยว** — งานเล็กที่ทำทีเดียวจบ มีสถานะของตัวเอง (วางแผน / กำลังทำ / เสร็จแล้ว) เปลี่ยนได้เอง
2. **กลุ่มงาน** — งานใหญ่ที่มี task ย่อยหลายอย่าง สถานะของกลุ่มงานคำนวณอัตโนมัติจาก task ย่อย (ทำเสร็จทุก task = กลุ่มงานเสร็จ)

### สถานะของงาน

- **วางแผน** — งานใหม่ที่ยังไม่เริ่มทำ
- **กำลังทำ** — กำลังดำเนินการอยู่
- **เสร็จแล้ว** — ทำเสร็จสมบูรณ์

ในหน้ารายละเอียดงานเดี่ยว จะมีปุ่ม 3 ปุ่มให้กดเปลี่ยนสถานะได้ทันที ทุกคนในฝ่ายจะเห็นการเปลี่ยนแปลงแบบ realtime

### การสร้างงาน

กดปุ่ม **+** ที่ลอยอยู่มุมขวาล่างของหน้าหน้าแรก / งาน แล้วกรอก:

- **ชื่องาน** — สั้นกระชับ ให้คนอื่นเข้าใจได้ทันที
- **ประเภทงาน** — เลือก "งานเดี่ยว" หรือ "กลุ่มงาน"
- **วันที่** — วันที่เริ่มงาน ถ้างานยาวหลายวันใส่ "ถึงวันที่" ด้วย
- **เวลา / สถานที่** — ไม่ใส่ก็ได้
- **ฝ่ายที่รับผิดชอบ** — ฝ่ายที่ทำงานนี้
- **คำอธิบาย** — รายละเอียดเพิ่มเติม

### การจัดการ task ย่อย (ในกลุ่มงาน)

ในหน้ารายละเอียดกลุ่มงาน มีส่วน **Task ย่อย** ให้:

- กด **+ เพิ่ม task** เพื่อสร้าง task ใหม่ (ชื่อ, ความสำคัญ, ผู้รับผิดชอบ, กำหนดส่ง, เวลาโดยประมาณ, tags, หมายเหตุ)
- คลิกที่ task เพื่อเปลี่ยนสถานะ (ยังไม่เริ่ม / กำลังทำ / เสร็จแล้ว)
- กดปุ่ม "จัดการงาน" เพื่อแก้ไขชื่อ/วันที่ หรือลบงานทิ้ง

### การแก้ไข / ลบงาน

ในหน้ารายละเอียดงาน กดปุ่ม **จัดการงาน** จะเปิด sheet ให้เลือก:

- **แก้ไขงาน** — แก้ไขข้อมูลทั้งหมดของงาน
- **เพิ่ม task** — เพิ่ม task ย่อยใหม่
- **ลบงาน** — ลบงานออกจากระบบ (ยืนยัน 2 ครั้ง ไม่สามารถกู้คืนได้)

---

## การทำงานร่วมกัน

### Realtime

ทุกการเปลี่ยนแปลง (สถานะ, task ใหม่, งานใหม่, คนเข้าระบบ) จะปรากฏในหน้าจอของทุกคนทันทีโดยไม่ต้องรีเฟรช ตัวอย่างเช่น:

- เพื่อนเปลี่ยนสถานะงานจาก "กำลังทำ" เป็น "เสร็จแล้ว" — คุณเห็นทันทีในหน้าแรก
- Admin เพิ่ม task ใหม่ในกลุ่มงาน — ทุกคนในฝ่ายเห็นในหน้ารายละเอียดทันที
- Admin เปลี่ยนฝ่ายของคุณ — ชื่อฝ่ายและสีของคุณอัปเดตในแถบหัวทันที

### การมองหางานของตัวเอง

- ที่ **หน้าแรก** จะแสดงงานที่คุณเป็นผู้รับผิดชอบ (assignee) ก่อน
- ที่หน้า **งาน** มี filter "ที่ฉันมีส่วนร่วม" ใช้กรองได้
- ที่หน้า **โปรไฟล์** มีสถิติงานที่คุณทำเสร็จและกำลังทำอยู่

---

## คำแนะนำการใช้งาน

### ทำอย่างไรเมื่อ...

| สถานการณ์ | วิธีจัดการ |
|----------|-----------|
| ลืมรหัสนักเรียน | ติดต่อผู้ดูแลระบบของฝ่าย |
| บัญชียังไม่ถูกอนุมัติ | รอ 1-2 วันทำการ หรือทักผู้ดูแล |
| งานเลยกำหนดแล้ว | ในหน้าแรกจะแสดงสีแดงเตือน — ไปที่งานนั้นแล้วอัปเดตสถานะ |
| เผลอลบงานผิด | ติดต่อผู้ดูแล — ลบงานไม่สามารถกู้คืนได้ |
| ต้องการเปลี่ยนฝ่ายตัวเอง | ขอให้ผู้ดูแลเปลี่ยนให้ (ไม่สามารถเปลี่ยนเองได้) |
| เห็นข้อมูลไม่อัปเดต | ลองรีเฟรชหน้า (F5) หรือตรวจสอบการเชื่อมต่อเน็ต |

### การใช้งานบนมือถือ

YP Work ออกแบบมาให้ใช้งานบนมือถือเป็นหลัก (mobile-first):

- **เปิด sheet** — slide ขึ้นจากด้านล่าง ลากลงเพื่อปิด
- **เปิด sheet ซ้อน** — กดที่ปุ่มด้านใน sheet จะเปิด sheet ละเอียดขึ้นด้านบน
- **ปิด sheet** — กดพื้นที่ดำด้านนอก หรือกดปุ่ม X หรือลากลง
- **ย้อนกลับ** — ปุ่มย้อนกลับบนมือถือ (Android) หรือ swipe จากขอบ (iOS) ปิด sheet ก่อน แล้วถึงย้อนหน้า

### การใช้งานบน desktop

บน desktop (จอ ≥768px) bottom sheet จะกลายเป็น centered modal ที่ดูเหมาะกับจอใหญ่ ส่วนแถบนำทางจะย้ายไปด้านซ้ายเป็น left-rail

---

## โครงสร้างโปรเจกต์ (สำหรับทีมพัฒนา)

YP Work สร้างด้วย:

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 + custom design tokens (Indigo Trust theme)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + custom login flow

### โครงสร้างโฟลเดอร์หลัก

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Protected routes (auth gate)
│   │   ├── today/                # หน้าแรก
│   │   ├── calendar/             # ปฏิทิน
│   │   ├── events/               # รายการงาน + detail + create
│   │   └── profile/              # โปรไฟล์
│   ├── login/                    # เข้าสู่ระบบ (public)
│   ├── register/                 # สมัครสมาชิก (public)
│   ├── pending-status/           # สถานะการอนุมัติ (public)
│   └── api/                      # API routes (admin approve/reject, etc.)
├── modules/                      # Feature modules (today, calendar, events, profile)
├── components/
│   ├── layout/                   # AppShell (top-bar + bottom-nav + FAB)
│   ├── framework/                # Window Framework (sheet/modal/fullscreen/sidepanel)
│   └── ui/                       # shadcn/ui components + InfoButton
├── lib/
│   ├── supabase/                 # Supabase client (browser + server)
│   ├── auth/                     # Auth utilities
│   ├── hooks/                    # Realtime hooks (events, tasks, profile)
│   ├── window-stack.ts           # v3.1.0 — Window Stack Manager (nested popups)
│   └── types/index.ts            # TypeScript types
└── middleware.ts                 # Auth middleware (proxy gate)
```

### การตั้งค่าสำหรับนักพัฒนา

สร้างไฟล์ `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

ติดตั้ง dependencies และรัน:

```bash
npm install
npm run dev    # รัน dev server ที่ http://localhost:3000
npm run build  # สร้าง production build
```

---

## Window Framework (v3.1.0 — สำหรับนักพัฒนา)

v3.1.0 แทนที่ BottomSheet framework เดิมด้วย **Window Framework** ที่รองรับ popup หลายประเภทและการเปิดซ้อนกัน (nested popups):

### ประเภท Window

| Type | การใช้งาน | ตัวอย่าง |
|------|----------|---------|
| `sheet` | Bottom sheet ที่ slide จากด้านล่าง | Sheet ปกติทั่วไป |
| `modal` | Centered dialog | Confirmation dialog ใหญ่ |
| `fullscreen` | Full-page overlay (เหมือนเปิดหน้าใหม่) | Form ซับซ้อนที่ต้องการเนื้อที่เต็ม |
| `sidepanel` | Slide จากด้านข้าง | Filter panel บน desktop |

### การใช้งาน

```tsx
import { Window, BottomSheet, Modal, FullscreenOverlay, SidePanel } from '@/components/framework/window';

// 1. Sheet (backward compat — เหมือนเดิม)
<BottomSheet open={open} onClose={onClose} title="หัวข้อ">
  content
</BottomSheet>

// 2. Modal
<Modal open={open} onClose={onClose} title="ยืนยัน">
  content
</Modal>

// 3. Fullscreen overlay
<FullscreenOverlay open={open} onClose={onClose} title="แก้ไขข้อมูล">
  content
</FullscreenOverlay>

// 4. Side panel (right side, desktop-first)
<SidePanel open={open} onClose={onClose} title="Filter" side="right">
  content
</SidePanel>

// 5. Generic Window (เลือก type ผ่าน prop)
<Window type="modal" open={open} onClose={onClose}>
  content
</Window>
```

### Nested Popups

Window Framework รองรับการเปิดซ้อนกันโดยอัตโนมัติ — ไม่ต้องจัดการ z-index เอง:

```tsx
// Sheet ชั้นนอก
<BottomSheet open={outer} onClose={...}>
  <button onClick={() => setInner(true)}>เปิดรายละเอียด</button>
  
  // Sheet ชั้นใน — จะอยู่ด้านบนอัตโนมัติ
  <BottomSheet open={inner} onClose={...}>
    รายละเอียดเพิ่มเติม
  </BottomSheet>
</BottomSheet>
```

ระบบจัดการให้อัตโนมัติ:

- **z-index stacking** — window ที่เปิดใหม่อยู่ด้านบนเสมอ
- **ESC key** — ส่งเฉพาะ window บนสุด
- **Back button (Android)** — ปิด window บนสุดก่อน แล้วถึงย้อนหน้า
- **Backdrop click** — ปิดเฉพาะ window บนสุด
- **Scroll lock** — count-based รองรับ nested
- **Auto-hide navigation** — body.yp-window-open ถูกเพิ่มเมื่อมี window เปิดอยู่

### การปรับปรุงจาก v3.0.0

- ✓ **รองรับ nested popups** — เปิด sheet ซ้อน sheet ได้
- ✓ **ปิด backdrop close animation** — ก่อนหน้านี้กด backdrop แล้วปิดทันที ตอนนี้มี fade + slide animation
- ✓ **Drag smoothness** — sheet ตามนิ้ว 1:1 ไม่กระตุก ไม่เป็นเฟรม ๆ (จากการเปลี่ยนจาก rAF batch → direct DOM write)
- ✓ **ปิด navigation อัตโนมัติ** — sheet/fullscreen ทุกตัวซ่อน bottom-nav + FAB + top-bar
- ✓ **Modular** — เพิ่ม/ลบ type ได้ง่ายผ่าน CSS class `yp-window--{type}`

---

## ประวัติเวอร์ชัน

### v3.3.0 (current)

- **แก้ปัญหา "ข้อมูลแสดงผลได้แป๊บเดียวแล้วหายไป"** — สาเหตุหลักคือ `reload()` ที่ถูกเรียกทันทีตอน mount ใช้ Supabase client (anon key) ที่ถูก RLS บล็อก → คืน empty array → ทับข้อมูล SSR ที่โหลดมาถูกต้องแล้ว
- **ย้าย read operations ไป API routes** — สร้าง API routes ใหม่ 4 ตัว ที่ใช้ service role (bypass RLS):
  - `GET /api/events` — ดึง events ทั้งหมดพร้อม department + tasks + assignees
  - `GET /api/events/[id]/detail` — ดึง event เฉพาะตัว
  - `GET /api/departments/members?dept_id=xxx` — ดึงสมาชิกในฝ่าย
  - `GET /api/profile/stats?user_auth_uid=xxx` — ดึงสถิติของ user
- **Guard กันข้อมูล SSR หาย** — ในทุก hook ที่มี initial mount reload (`useRealtimeEvents`, `useRealtimeEventById`, `useRealtimeEventsForDate`, `useRealtimeDeptMembers`):
  - ถ้า fetch ครั้งแรกส่งกลับ empty/null แต่ initial data มีข้อมูล → เก็บข้อมูลเดิมไว้ก่อน (skip update)
  - รอบต่อไป (realtime update ปกติ) ใช้งานได้ปกติ ไม่มี guard
- **fetchEvents, fetchEventById, fetchProfileStats, fetchDeptMembers** — เปลี่ยนจาก direct Supabase query → เรียก API route แทน

### v3.2.0

- **แก้ปัญหา RLS policy** — ผู้ใช้ไม่สามารถสร้าง/แก้ไข/ลบงานได้เนื่องจาก RLS policy บล็อก direct writes
- **API routes สำหรับ write operations** — สร้าง 8 API routes ใหม่ที่ใช้ service role key (bypass RLS):
  - `POST /api/events` — สร้างงาน
  - `PATCH /api/events/[id]` — แก้ไขงาน
  - `DELETE /api/events/[id]` — ลบงาน
  - `PATCH /api/events/[id]/status` — เปลี่ยนสถานะงาน
  - `POST /api/events/[id]/tasks` — เพิ่ม task
  - `PATCH /api/tasks/[id]` — แก้ไข task
  - `DELETE /api/tasks/[id]` — ลบ task
  - `PATCH /api/tasks/[id]/status` — เปลี่ยนสถานะ task
  - `PUT /api/tasks/[id]/assignee` — ตั้งผู้รับผิดชอบ task
- **requireUser() guard** — ตรวจสอบสิทธิ์ authenticated user ก่อนเข้าถึง API routes
- **Input validation** — ทุก API route มีการ validate input (type, status, priority, date format, color format)
- **SQL migration** — ไฟล์ `ypwork-v3.2.0-rls-fix.sql` สำหรับ alternative fix (ปรับ RLS policies โดยตรง)
- **ตรวจสอบ schema consistency** — ทุก query และ type สอดคล้องกับฐานข้อมูลจริง (type: 'group'|'task', status, priority, department_id FK → departments.id)

### v3.1.0

- **Window Framework** — แทนที่ BottomSheet framework เดิม รองรับ sheet/modal/fullscreen/sidepanel
- **Nested popups** — เปิด sheet ซ้อนกันได้ (z-index + ESC + back button จัดการอัตโนมัติ)
- **Auto-hide navigation** — เปิด window แล้ว bottom-nav + FAB + top-bar ซ่อนอัตโนมัติ
- **แก้ drag smoothness** — sheet ตามนิ้ว 1:1 ไม่กระตุก
- **แก้ backdrop close animation** — กด backdrop มี fade + slide animation ครบถ้วน
- **Parallel data fetch** — today/events/event-detail/profile page ดึงข้อมูลพร้อมกัน ลด TTFB ~40-50%
- **Link prefetch** — bottom-nav links prefetch หน้าเป้าหมายล่วงหน้า
- **ลด InfoButton ที่ไม่จำเป็น** — ตัด InfoButton ที่อธิบายสิ่งที่เข้าใจเองได้ออก 9 จุด

### v3.0.0

- Discussion-style docs (InfoButton พร้อม markup ให้จับจุดเร็ว)
- ระบบความปลอดภัยเข้มข้น (rate limit, security headers, PII protection, audit log)
- ประสบการณ์เหมือน native app (offline banner, skeleton, press feedback)

### v2.x

- ระบบ realtime (events, tasks, profile, activity log)
- ระบบฝ่ายงาน (departments)
- ระบบ approval flow (pending → approved)
- ระบบปฏิทินแบบ month view

---

## ติดต่อ

หากเจอปัญหาหรือมีข้อเสนอแนะ ติดต่อทีมพัฒนาของสภานักเรียนผ่านช่องทางภายในของฝ่าย
