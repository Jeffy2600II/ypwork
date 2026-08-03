'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · useTutorial React Hook (v2.0.0)
// ═══════════════════════════════════════════════════════════════
// Reactive wrapper สำหรับ tutorial system
// - อ่านสถานะจาก localStorage + auto-update เมื่อเปลี่ยน
// - รองรับ SSR (initial render = false)
// - ใช้ custom event 'yp-tutorial-change' สำหรับ cross-component sync
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import {
  hasSeenTutorial,
  markTutorialSeen,
  resetAllTutorials,
  getTutorialStats,
  type TutorialKey,
} from '@/lib/tutorial';

/**
 * Hook: subscribe สถานะ tutorial แบบ reactive
 *
 * Usage:
 *   const { seen, markSeen, reset, stats } = useTutorial('today');
 *   if (!seen) { ... show tutorial ... }
 */
export function useTutorial(key: TutorialKey | string) {
  const [seen, setSeen] = React.useState(false);

  // initial read (client-only)
  React.useEffect(() => {
    setSeen(hasSeenTutorial(key));
  }, [key]);

  // subscribe to changes
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.reset) {
        setSeen(false);
      } else if (detail?.key === key && detail?.seen) {
        setSeen(true);
      } else {
        // re-read in case it was changed externally
        setSeen(hasSeenTutorial(key));
      }
    };
    window.addEventListener('yp-tutorial-change', handler);
    return () => window.removeEventListener('yp-tutorial-change', handler);
  }, [key]);

  const markSeen = React.useCallback(() => {
    markTutorialSeen(key);
    setSeen(true);
  }, [key]);

  return { seen, markSeen };
}

/**
 * Hook: สถานะ tutorial ทั้งหมด (สำหรับ tutorial index page)
 */
export function useTutorialStats() {
  const [stats, setStats] = React.useState<{ seen: number; total: number }>({
    seen: 0,
    total: 0,
  });

  React.useEffect(() => {
    setStats(getTutorialStats());
    const handler = () => setStats(getTutorialStats());
    window.addEventListener('yp-tutorial-change', handler);
    return () => window.removeEventListener('yp-tutorial-change', handler);
  }, []);

  const reset = React.useCallback(() => {
    resetAllTutorials();
    setStats({ seen: 0, total: 0 });
  }, []);

  return { ...stats, reset };
}
