# 01 — Design System v9.1

> ypwork ใช้ Design System เดียวกันกับ yplabs ทุกอย่าง — CSS variables, component styles, animations, responsive breakpoints — เพื่อให้ดูเป็นครอบครัวเดียวกัน

ไฟล์หลัก: `src/app/globals.css`

## CSS Variables (`:root`)

### สี Brand

| Token | Value | ใช้ที่ |
|-------|-------|-------|
| `--brand` | `#5B5BD6` | ปุ่ม primary, accent, link, active state |
| `--brand-alt` | `#6E6EF0` | brand สว่างกว่า |
| `--brand-dim` | `rgba(91,91,214,0.10)` | พื้นหลัง brand จาง ๆ |
| `--brand-glow` | `rgba(91,91,214,0.22)` | glow shadow สำหรับปุ่ม primary |
| `--gold` | `#F59F00` | sidebar active indicator |

### สีพื้นหลัง (Pure White Hierarchy)

| Token | Value | ใช้ที่ |
|-------|-------|-------|
| `--bg` | `#FFFFFF` | พื้นหลังหลักของทั้งเว็บ |
| `--surface` | `#FFFFFF` | พื้นหลัง card, modal |
| `--surface-2` | `#FAFAFB` | hover state, data header |
| `--surface-3` | `#F5F5F7` | skeleton, subtle bg |
| `--surface-4` | `#EFEEF2` | พื้นหลังเล่าที่สุด |

### สี Sidebar (Dark Theme)

| Token | Value |
|-------|-------|
| `--sb-bg` | `#09090F` |
| `--sb-surface` | `#111118` |
| `--sb-border` | `rgba(160,165,255,0.07)` |
| `--sb-text` | `rgba(255,255,255,0.38)` |
| `--sb-text-hi` | `rgba(255,255,255,0.88)` |
| `--sb-active` | `rgba(160,165,255,0.12)` |
| `--sb-hover` | `rgba(160,165,255,0.05)` |

### สี Status

| Token | Text | Background | Border |
|-------|------|------------|--------|
| `--green` / `--green-bg` | `#0EA158` | `#E6F9EF` | `rgba(14,161,88,0.18)` |
| `--red` / `--red-bg` | `#E5484D` | `#FFECEC` | `rgba(229,72,77,0.18)` |
| `--amber` / `--amber-bg` | `#E07C12` | `#FFF3E0` | `rgba(224,124,18,0.18)` |
| `--blue` / `--blue-bg` | `#3B82F6` | `#EEF4FF` | `rgba(59,130,246,0.18)` |

## Priority Colors

| Priority | Badge Class | Text Color | Background |
|----------|-------------|------------|------------|
| P1 สูง | `.badge-red` | `#B53030` | `var(--red-bg)` |
| P2 กลาง | `.badge-amber` | `#A05800` | `var(--amber-bg)` |
| P3 ต่ำ | `.badge-gray` | `var(--text-3)` | `var(--surface-3)` |

## Status Badges

| สถานะ | Badge Class |
|-------|-------------|
| ยังไม่เริ่ม (todo) | `.badge-gray` |
| กำลังทำ (in_progress) | `.badge-blue` |
| เสร็จแล้ว (done) | `.badge-green` |
| ยกเลิก (cancelled) | `.badge-red` |
| รอตรวจ (pending_review) | `.badge-amber` |

## Border Radius (Premium Rounded)

| Token | Value | ใช้ที่ |
|-------|-------|-------|
| `--r-xs` | `8px` | badge ย่อย |
| `--r-sm` | `16px` | small components |
| `--r-md` | `24px` | nav items, sidebar items |
| `--r-lg` | `32px` | inputs, selects, buttons (btn-sm), alerts, toast |
| `--r-xl` | `40px` | cards, modals, data-list, tables, kanban columns |
| `--r-2xl` | `47px` | hero cards, large containers |
| `--r-pill` | `9999px` | badges, buttons, avatar, active indicator |

## Shadows (Ultra-Soft)

| Token | Value | ใช้ที่ |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.03)` | subtle elevation |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)` | dropdown |
| `--shadow-card` | `0 0 0 1px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02)` | cards, data-list, kanban columns |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)` | dropdown ใหญ่ |
| `--shadow-lg` | `0 8px 28px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)` | modals |

## Typography

| Element | Font Size | Weight | Letter Spacing |
|---------|-----------|--------|----------------|
| Page title (`.page-title`) | 24px | 800 | -0.02em |
| Section label (`.sec-label`) | 10px | 700 | 0.12em (uppercase) |
| Stat value (`.stat-value`) | 30px | 800 | -0.03em |
| Stat label (`.stat-label`) | 10.5px | 700 | 0.10em (uppercase) |
| Card title (`.data-item-title`) | 13.5px | 700 | -0.01em |
| Button text | 13px | 700 | - |
| Badge text | 10.5px | 700 | - |

Font family: `'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

## Layout Tokens

| Token | Value | ใช้ที่ |
|-------|-------|-------|
| `--sw` | 240px | ความกว้าง sidebar desktop |
| `--th` | 52px | ความสูง topbar desktop |
| `--bh` | 62px | ความสูง bottom nav mobile |

## Component Styles

### Card (`.card`)

```css
background: var(--surface);
border-radius: var(--r-xl);    /* 40px */
padding: 24px;
box-shadow: var(--shadow-card);
animation: cardReveal 400ms var(--ease-out-expo) both;
```

### Buttons

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 13px; font-weight: 700; border: none;
  border-radius: var(--r-pill);   /* 9999px — pill! */
  padding: 11px 22px; cursor: pointer;
}
```

| Class | Background | Color | Hover BG |
|-------|------------|-------|----------|
| `.btn-primary` | `#5B5BD6` | `#fff` | `#4A4ABE` |
| `.btn-ghost` | `var(--surface)` | `var(--text-2)` | `var(--surface-2)` |
| `.btn-danger` | `var(--red-bg)` | `var(--red)` | `#FFDDDD` |
| `.btn-success` | `var(--green-bg)` | `var(--green)` | `#D0F5E2` |

### Badges

```css
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 9999px;
  font-size: 10.5px; font-weight: 700;
}
```

### Inputs / Forms

```css
input, textarea, select {
  border: 1.5px solid var(--border-2);
  border-radius: var(--r-lg);        /* 32px — pill! */
  padding: 12px 16px;
  background: var(--surface);
  transition: border-color 120ms, box-shadow 120ms, transform 120ms;
}
input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-dim);
  transform: scale(1.005);
}
```

### Modal

```css
.modal-backdrop {
  background: rgba(10,12,28,0.60);
  backdrop-filter: blur(6px);
  animation: fadeIn 150ms var(--ease) both;
}
.modal {
  background: var(--surface);
  border-radius: var(--r-xl);        /* 40px */
  box-shadow: var(--shadow-lg);
  max-width: 560px;
  animation: scaleIn 220ms var(--ease-spring) both;
}
```

### Side Panel (Detail Panel)

```css
.side-panel {
  position: fixed; right: 0; top: 0; bottom: 0;
  width: 400px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: slideInRight 300ms var(--ease-out-expo) both;
}
```

## Hover Effects — ❌ ไม่มีการยกขึ้น

ทุกอย่างเปลี่ยนแค่ `background` เท่านั้น ไม่มี `translateY`, ไม่มี `shadow` เพิ่ม:

| Element | Hover Effect |
|---------|--------------|
| `.data-item` | `background: var(--surface-2)` |
| Kanban card | `background: var(--surface-2)` |
| Nav item (sidebar) | `background: var(--sb-hover)`, `color: var(--sb-text-hi)` |
| `.btn-primary` | `background: #4A4ABE`, shadow ใหญ่ขึ้น |
| Bottom nav item | `color: var(--brand)`, icon-wrap `background: var(--brand-dim)` |
| ทุกปุ่ม active (กดจริง) | `transform: scale(0.95)` |

## Motion / Easing

| Token | Value | ใช้ที่ |
|-------|-------|-------|
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | Material standard — hover, focus |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | overshoot bounce — modal, scale in |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | dramatic decel — card reveal |
| `--ease-soft` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | button transitions |

## Keyframe Animations

| Name | Duration | Easing | ใช้ที่ |
|------|----------|--------|-------|
| `fadeUp` | 240ms | `var(--ease)` | Toast, stagger items |
| `fadeIn` | 200ms | `var(--ease)` | Modal backdrop |
| `scaleIn` | 220ms | `var(--ease-spring)` | Modal card |
| `softRise` | 320ms | `var(--ease-out-expo)` | Data items, list rows |
| `cardReveal` | 400ms | `var(--ease-out-expo)` | Cards, data-list, kanban columns |
| `floatIn` | 560ms | `var(--ease-out-back)` | Hero elements, summary cards |
| `slideInLeft` | 320ms | `var(--ease-soft)` | Sidebar items |
| `slideInRight` | 300ms | `var(--ease-out-expo)` | Detail panel |
| `shimmer` | 1.6s | ease-in-out infinite | Skeleton loading |
| `spin` | 650ms | linear infinite | Spinner |

## Stagger Animations

| Class | Animation | Delay Step |
|-------|-----------|------------|
| `.stagger-children > *` | `softRise 320ms` | 40ms |
| `.stagger-cards > *` | `cardReveal 400ms` | 60ms |
| `.stagger-float > *` | `floatIn 560ms` | 80ms |

## Responsive Design

Primary breakpoint: `max-width: 860px`

| Breakpoint | Layout | Sidebar | Topbar | Bottom Nav | Detail Panel |
|------------|--------|---------|--------|------------|--------------|
| Desktop (>= 861px) | Sidebar 240px + Main `margin-left: 240px` | ✅ แสดง | Desktop topbar (blur, 52px) | ❌ ซ่อน | Side panel 400px |
| Mobile (<= 860px) | เต็มจอ `margin-left: 0` | ❌ ซ่อน | Mobile topbar (dark, 50px) | ✅ แสดง (62px) | เต็มจอ |

Secondary breakpoints:
- `<= 760px`: `.grid-3` และ `.grid-4` → 2 columns
- `<= 480px`: `.grid-auto` → 2 columns

## Scrollbar

```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-3); border-radius: 9999px; }
```

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## iOS Safe Area

```css
@supports (padding: env(safe-area-inset-top)) {
  .app-topbar-mobile {
    padding-top: env(safe-area-inset-top, 0);
    height: calc(50px + env(safe-area-inset-top, 0px));
  }
}
```
