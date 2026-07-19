// ═══════════════════════════════════════════════════════════════
// YP WORK · Tutorial Progress Tracker (v2.0.0)
// ═══════════════════════════════════════════════════════════════
// ใช้ browser storage (localStorage) สำหรับติดตามว่า user ได้ดู
// tutorial ของ feature ใดบ้างแล้ว — เพื่อไม่ให้รบกวนซ้ำ
//
// Storage layout:
//   yp_tutorial_v1: {
//     "today": true,        ← ดูแล้ว
//     "events": true,
//     "event-detail": false, ← ยังไม่ดู
//     ...
//   }
//
// API:
//   - hasSeenTutorial(key) → boolean
//   - markTutorialSeen(key) → void
//   - resetAllTutorials() → void (debug / "ดู tutorial อีกครั้ง")
//   - getTutorialProgress() → Record<string, boolean>
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'yp_tutorial_v1';

// รายการ tutorial ทั้งหมดในระบบ
export const TUTORIAL_KEYS = [
  'login',
  'register',
  'pending-status',
  'today',
  'events-list',
  'event-detail',
  'calendar',
  'profile',
  'about',
] as const;

export type TutorialKey = (typeof TUTORIAL_KEYS)[number];

/** SSR-safe: ตรวจว่า user เคยดู tutorial นี้หรือยัง */
export function hasSeenTutorial(key: TutorialKey | string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(data[key]);
  } catch {
    return false;
  }
}

/** บันทึกว่า user ได้ดู tutorial นี้แล้ว */
export function markTutorialSeen(key: TutorialKey | string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    data[key] = true;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // แจ้ง event ให้ components อื่น ๆ ที่ subscribe อัปเดตได้
    window.dispatchEvent(
      new CustomEvent('yp-tutorial-change', { detail: { key, seen: true } })
    );
  } catch {
    /* swallow — tutorial tracking ไม่ใช่ critical */
  }
}

/** ล้างสถานะ tutorial ทั้งหมด (ปุ่ม "ดู tutorial อีกครั้ง") */
export function resetAllTutorials(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('yp-tutorial-change', { detail: { reset: true } }));
  } catch {
    /* swallow */
  }
}

/** ดึงสถานะ tutorial ทั้งหมด */
export function getTutorialProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** นับจำนวน tutorial ที่ดูแล้ว / ทั้งหมด */
export function getTutorialStats(): { seen: number; total: number } {
  const progress = getTutorialProgress();
  const seen = TUTORIAL_KEYS.filter((k) => progress[k]).length;
  return { seen, total: TUTORIAL_KEYS.length };
}
