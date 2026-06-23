# 04 — Modules Architecture

> ypwork ใช้สถาปัตยกรรมโมดูล — แต่ละโมดูลทำงานเป็นอิสระ สื่อสารกันผ่าน interface ที่กำหนดไว้
> อ้างอิงแนวคิดจาก Fantrove (พัฒนา 1,080+ commits) ที่ใช้ระบบ 7 Core Systems แยกกันทำงาน

## ทำไมต้องแบบโมดูล?

ถ้าเขียนทุกอย่างเป็นชุดเดียว (monolith) จะเกิดปัญหา:

- ไฟล์ใหญ่เกินไป — อ่านยาก แก้ยาก ดีบักยาก
- เพิ่มฟีเจอร์ใหม่ต้องแก้หลายจุด — โอกาสพังสูง
- ทดสอบยาก — ไม่รู้ว่าโค้ดส่วนไหนเกี่ยวข้องกับอะไรบ้าง
- AI agent ที่จะมาพัฒนาต่อจะเข้าใจยาก

## สถาปัตยกรรมโมดูล — แนวคิดจาก Fantrove

| แนวคิด Fantrove | การปรับใช้ใน ypwork |
|----------------|---------------------|
| IIFE Module Pattern + Namespace | TypeScript module + React Context |
| Custom Events สำหรับ cross-system | Custom Events สำหรับ cross-module |
| Frozen Public API (`Object.freeze`) | TypeScript `as const` + `Object.freeze` |
| Sequential + Parallel loading | React lazy loading + Suspense |
| 7 Core Systems แยกกัน | 6 Core Modules แยกกัน |
| 21 ไฟล์เอกสารใน `fantrove-docs/` | เอกสารแยกโฟลเดอร์ `ypwork-docs/` โครงสร้างเดียวกัน |

## 6 Core Modules ของ ypwork

| # | Module | หน้าที่ | Entry Point | สื่อสารผ่าน |
|---|--------|---------|-------------|------------|
| 1 | **TaskEngine** | จัดการ CRUD งาน + query/filter/sort ทั้งหมด | `src/modules/task-engine/` | TaskContext (React Context) |
| 2 | **ViewRenderer** | เรนเดอร์มุมมองทั้ง 4 (Month, Week, Day, Kanban) | `src/modules/view-renderer/` | TaskContext + ViewContext |
| 3 | **CalendarEngine** | คำนวณปฏิทิน (เดือน/สัปดาห์/วัน) navigation | `src/modules/calendar-engine/` | CalendarContext |
| 4 | **FilterSystem** | จัดการ filter state (type, status, priority, category, search) | `src/modules/filter-system/` | FilterContext |
| 5 | **CategoryManager** | จัดการหมวดหมู่ CRUD | `src/modules/category-manager/` | CategoryContext |
| 6 | **RealtimeSync** | Supabase Realtime subscription + conflict resolution | `src/modules/realtime-sync/` | Custom Events + TaskContext |

## โครงสร้างไดเรกทอรี

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (mounts AuthProvider + ToastProvider)
│   └── page.tsx                  # Entry — mounts 6 module providers around AppShell
├── lib/                          # Pure utilities (no React)
│   ├── env.ts
│   ├── types.ts                  # TypeScript domain types
│   ├── constants.ts              # Status/priority/category metadata
│   ├── dateUtils.ts              # Thai date formatting + calendar grid
│   ├── filterUtils.ts            # Pure filter helpers
│   ├── profileCache.ts           # LocalStorage profile cache
│   └── supabase/
│       ├── client.ts             # Browser singleton
│       └── server.ts             # Server admin client
├── context/                      # Cross-cutting contexts
│   ├── AuthContext.tsx           # Supabase auth + council_users
│   └── ToastContext.tsx          # Toast notifications
├── modules/                      # 6 Core Modules
│   ├── task-engine/index.tsx
│   ├── view-renderer/index.tsx
│   ├── calendar-engine/index.tsx
│   ├── filter-system/index.tsx
│   ├── category-manager/index.tsx
│   └── realtime-sync/index.ts
└── components/                   # UI components (no business logic)
    ├── AppShell.tsx              # Main layout — calls modules only
    ├── Sidebar.tsx
    ├── Topbar.tsx
    ├── BottomNav.tsx
    ├── FilterBar.tsx
    ├── SummaryCards.tsx
    ├── TaskModal.tsx
    ├── DetailPanel.tsx
    ├── CategoryModal.tsx
    ├── LoginPage.tsx
    ├── views/
    │   ├── MonthView.tsx
    │   ├── WeekView.tsx
    │   ├── DayView.tsx
    │   └── KanbanView.tsx
    └── ui/
        └── Badge.tsx
```

## กฎการสื่อสารระหว่าง Module (Communication Protocol)

ypwork ใช้ 3 กลไกหลัก:

### 1. React Context (หลัก — สำหรับ state ที่ต้อง share ข้าม components)

แต่ละ module มี Context เป็น "centralized state" ของตัวเอง:

```tsx
// TaskEngine creates TaskContext + TaskEngineProvider
// Components that need task data → call useTaskEngine() hook
// ViewRenderer reads task list from TaskContext
// RealtimeSync writes task when there's an update from server
// No direct imports between modules — Context is the middleman
```

### 2. Custom Events (สำหรับ cross-module communication แบบ loose coupling)

เหมือน Fantrove ที่ใช้ CustomEvent — ใช้เมื่อ module ต้อง "บอก" module อื่นโดยไม่ต้องรู้จักกัน:

```ts
// RealtimeSync tells everyone that a task changed
window.dispatchEvent(new CustomEvent('ypwork:task-updated', {
  detail: { taskId: '...', changes: { status: 'done' } }
}));

// ViewRenderer listens
useEffect(() => {
  const handler = (e: CustomEvent) => {
    // Update UI without importing RealtimeSync
  };
  window.addEventListener('ypwork:task-updated', handler);
  return () => window.removeEventListener('ypwork:task-updated', handler);
}, []);
```

### รายชื่อ Custom Events

| Event | Sender | Listeners | Detail |
|-------|--------|-----------|--------|
| `ypwork:task-created` | TaskEngine | ViewRenderer, Toast | `{ taskId, task }` |
| `ypwork:task-updated` | RealtimeSync, TaskEngine | ViewRenderer | `{ taskId, changes }` |
| `ypwork:task-deleted` | TaskEngine | ViewRenderer, Toast | `{ taskId }` |
| `ypwork:filter-changed` | FilterSystem | ViewRenderer | `{ activeFilters }` |
| `ypwork:view-changed` | ViewRenderer | (internal) | `{ view: 'month' \| 'week' \| 'day' \| 'kanban' }` |
| `ypwork:category-changed` | CategoryManager | ViewRenderer | `{ categoryId }` |

### 3. Frozen Public API (เรียนรู้จาก Fantrove)

แต่ละ module export เฉพาะสิ่งที่ module อื่นควรเห็น — ไม่เปิดเผย internal state:

```ts
// ❌ ผิด — export internal
export const taskCache = new Map(); // other modules can write to it

// ✅ ถูก — export public API only
export const TaskEngineAPI = Object.freeze({
  useTaskEngine,
  EVENTS: Object.freeze({
    TASK_CREATED: 'ypwork:task-created',
    TASK_UPDATED: 'ypwork:task-updated',
    TASK_DELETED: 'ypwork:task-deleted',
  }),
} as const);
```

## กฎการเขียนโค้ด (Coding Standards)

| กฎ | รายละเอียด |
|----|-----------|
| **หน้าเดียว = เรียก module เท่านั้น** | Page components (`app/page.tsx`) ไม่มี business logic — เรียก module components มาแสดงผลเท่านั้น |
| **Module = ไดเรกทอรีเดียว** | แต่ละ module อยู่ในโฟลเดอร์ของตัวเอง มี `index.ts(x)` เป็น entry point |
| **Export น้อยที่สุด** | แต่ละ module export เฉพาะ public API — ไม่ export internal functions/state |
| **Interface ก่อน implementation** | กำหนด TypeScript interface/type ก่อนเขียน logic |
| **ใช้ CSS classes จาก Design System** | ไม่เขียน inline style เว้นแต่จำเป็น — ใช้ `.card`, `.btn`, `.badge` ฯลฯ |
| **ไม่ผูกติด module ตรงๆ** | Module A ไม่ import module B ตรงๆ — ใช้ Context หรือ Custom Events |
| **Component ต้องไม่รู้เรื่อง Supabase** | UI components รับ data เป็น props — ไม่เรียก Supabase query เอง |
| **Error handling ทุกชั้น** | Hook ที่เรียก API ต้องมี try/catch + ส่ง error state ให้ UI แสดง |
| **useMemo + useCallback** | ใช้ `useMemo` สำหรับ computed values, `useCallback` สำหรับ handlers ที่ส่งไป child |

## Dependency Graph — Module ไหนพึ่ง Module ไหน

```
        ┌─────────────────┐
        │   Components    │  (AppShell, Sidebar, Views, Modals)
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│ViewRen-│  │Filter  │  │Calendar│
│derer   │  │System  │  │Engine  │
└───┬────┘  └────┬───┘  └────────┘
    │            │
    │            │
    ▼            ▼
┌────────────────────┐         ┌─────────────┐
│   TaskEngine       │◄────────│ RealtimeSync│
│ (CRUD + state)     │  events │             │
└────────┬───────────┘         └─────────────┘
         │
         ▼
┌────────────────────┐
│ CategoryManager    │
└────────────────────┘
```

กฎ: ลูกศรชี้ลง = "พึ่ง" — module ล่างเป็น data provider, module บนเป็น consumer

## ข้อดีของโครงสร้างแบบนี้

| ข้อดี | อธิบาย |
|------|--------|
| **ยืดหยุ่น** | อยากเพิ่มมุมมองใหม่ (เช่น Gantt)? สร้าง `GanttView.tsx` ใน `view-renderer/` + เพิ่ม option ใน ViewContext — ไม่ต้องแก้ module อื่น |
| **ทดสอบง่าย** | Module TaskEngine ทดสอบได้อย่างอิสระ — mock Supabase แล้ว test CRUD logic |
| **AI Agent เข้าใจง่าย** | แต่ละ module มีหน้าที่ชัดเจน มี `index.ts` เป็น API reference — AI agent อ่านแค่ interface ก็พอเขียน component ต่อได้ |
| **ขยายได้** | อยากเพิ่ม feature ใหม่ (เช่น comment)? สร้าง module `comment-system/` ใหม่ — ไม่ต้องไปยุ่งกับ module เดิม |
| **ปรับแต่งง่าย** | อยากเปลี่ยน UI ของ Kanban? แก้ `KanbanView.tsx` + `TaskCard` — business logic ใน TaskEngine ไม่กระทบ |
