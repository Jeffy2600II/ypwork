# 02 — Views

> 4 มุมมองของ ypwork และ interactions ของแต่ละมุมมอง

ypwork มี 4 มุมมองหลักที่ผู้ใช้สลับได้ง่าย ๆ ด้วย tab ด้านบน (desktop) หรือ bottom nav (mobile):

## 5.1 Month View (Default View)

**แรงบันดาลใจ:** Google Calendar

แสดงปฏิทินเดือนเต็ม 7 วัน × 4-6 แถว:

- แต่ละวันเป็น cell ขนาดใหญ่
- งานแต่ละอย่างแสดงเป็น **mini-bar** สี่เหลี่ยมผืนผ้าใน cell (สีตาม priority — แดง/เหลือง/เทา)
- ถ้างานเยอะเกินกว่าจะแสดงใน cell → แสดง `"+N งานเพิ่มเติม"`
- ส่วนหัวแสดงชื่อเดือน/ปี พร้อมลูกศร `◀ ▶` เปลี่ยนเดือน และปุ่ม `"วันนี้"`
- วันที่เป็นวันนี้มี highlight พื้นหลังสี brand อ่อน

### Interactions

| Action | Result |
|--------|--------|
| คลิกที่วัน | เปิด Day View ของวันนั้น |
| คลิกที่ mini-bar งาน | เปิด Detail Panel ของงานนั้น |
| คลิกปุ่ม `+` บน cell วัน | เปิด Modal สร้างงานใหม่ พร้อม pre-fill วันที่ของวันนั้น |

### Mobile (<= 860px)

- Calendar cell ลดขนาด — `min-height: 70px`
- ไม่แสดง mini-bar — แสดงเฉพาะจุด (dot) สีตาม priority
- วันนี้มี highlight เล็ก ๆ

---

## 5.2 Week View

**แรงบันดาลใจ:** Google Calendar

แสดง 7 วันของสัปดาห์เป็น 7 คอลัมน์:

- แต่ละคอลัมน์แสดงวันที่ + ชื่อวัน (อา/จ/อ/พ/พฤ/ศ/ส)
- งานแสดงเป็น card เล็ก ๆ ในคอลัมน์ของวันนั้น
- ส่วนหัว: ชื่อวัน + วันที่ + ลูกศร `◀ ▶` เปลี่ยนสัปดาห์

### Interactions

| Action | Result |
|--------|--------|
| คลิก card งาน | เปิด Detail Panel ของงานนั้น |
| คลิกพื้นที่ว่างในคอลัมน์วัน | เปิด Modal สร้างงาน pre-fill วันนั้น |

---

## 5.3 Day View

**แรงบันดาลใจ:** Google Calendar

คล้าย Week View แต่แสดงแค่ 1 วัน → เห็นรายละเอียดเยอะกว่า:

- ส่วนหัว: "วันจันทร์ที่ 15 กรกฎาคม 2568"
- แบ่ง 2 ส่วน:
  - **งานที่มีเวลากำหนด** — เรียงตามเวลาเริ่ม (พร้อมแสดงเวลา)
  - **งานที่ต้องทำวันนี้** — งานที่ไม่มีเวลากำหนด

### Interactions

| Action | Result |
|--------|--------|
| คลิก card งาน | เปิด Detail Panel |
| คลิกปุ่ม `"สร้างงานวันนี้"` | เปิด Modal สร้างงาน pre-fill วันนี้ |

---

## 5.4 Kanban Board

**แรงบันดาลใจ:** Trello + Notion

5 คอลัมน์ตามสถานะ:

| คอลัมน์ | Status | สี dot |
|--------|--------|--------|
| ยังไม่เริ่ม | `todo` | เทา |
| กำลังทำ | `in_progress` | น้ำเงิน |
| รอตรวจ | `pending_review` | เหลือง |
| เสร็จแล้ว | `done` | เขียว |
| ยกเลิก | `cancelled` | แดง |

ลาก-วางการ์ดข้ามคอลัมน์ = เปลี่ยนสถานะ (พร้อม animation เลื่อน smooth)

### การ์ดแต่ละใบแสดง

| Element | รายละเอียด |
|---------|-----------|
| Priority dot | สี่เหลี่ยมสีเล็ก ๆ มุมบนซ้าย (แดง/เหลือง/เทา) |
| ชื่องาน | ตัวหนา 14px |
| Type badge | "Checklist" / "กิจกรรม" เล็ก ๆ |
| วันครบกำหนด | "15 ก.ค." format สั้น |
| Avatar stack | ผู้รับผิดชอบ (สูงสุด 2 คน + "+N") |
| Progress bar | เฉพาะกิจกรรม — "3/7 เสร็จ" |

### Interactions

| Action | Result |
|--------|--------|
| ลากการ์ดไปคอลัมน์อื่น | เปลี่ยนสถานะ + toast แจ้งเตือน |
| คลิกการ์ด | เปิด Detail Panel ของงานนั้น |
| Hover การ์ด | `background: var(--surface-2)` (ไม่ยกขึ้น!) |

### Drag & Drop States

| State | Animation |
|-------|-----------|
| ขณะลาก (dragging) | `opacity: 0.7; transform: scale(1.02)` |
| Drop zone | `border: 2px solid var(--brand)` highlight |
| วางแล้ว (dropped) | opacity กลับ 1.0, transform กลับ 1.0 |
| เปลี่ยนคอลัมน์ | สถานะ badge เปลี่ยนสี `transition: background 120ms, color 120ms` |

### Mobile

- 5 คอลัมน์เรียงแนวนอน มี horizontal scroll
- ลาก-วางยังทำได้ปกติ

---

## Filter Bar

อยู่ด้านบน Main Content Area ตลอดเวลา:

| Filter | Type | ตัวเลือก |
|--------|------|---------|
| ค้นหา | Text input | พิมพ์ชื่องาน — real-time |
| ประเภท | Dropdown | ทั้งหมด / Checklist / กิจกรรม |
| สถานะ | Dropdown | ทั้งหมด / ยังไม่เริ่ม / กำลังทำ / รอตรวจ / เสร็จ / ยกเลิก |
| ความสำคัญ | Dropdown | ทั้งหมด / สูง (P1) / กลาง (P2) / ต่ำ (P3) |
| หมวดหมู่ | Dropdown | ทั้งหมด / + หมวดหมู่ที่มีทั้งหมด |
| งานของฉัน | Toggle switch | เปิด = เฉพาะงานที่ฉันเป็นผู้รับผิดชอบ |

### Active Filter Chips

ตัว filter ที่กำลังใช้อยู่จะแสดงเป็น chip/badge ด้านล่าง filter bar พร้อมปุ่ม `×` ปิดแต่ละตัวได้

### Mobile

- Filter bar ยุบเป็น icon `⚙️` ใน mobile topbar
- คลิกแล้วขยายเป็น sheet ด้านล่าง

---

## View Switch Animation

Crossfade เรียบ ๆ — opacity transition 200ms `var(--ease)` (❌ ไม่ slide, ไม่ scale)
