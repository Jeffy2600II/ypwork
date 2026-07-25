'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Adaptive · Viewport Hook (r50)
 * ═══════════════════════════════════════════════════════════════
 * Hook สำหรับตรวจสอบขนาด viewport แบบ reactive
 *
 * ใช้สำหรับ adaptive overlay — เลือก Sheet (mobile) หรือ Popup (desktop)
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';
import { VIEWPORT } from '../shared';

export interface ViewportState {
  /** ความกว้าง viewport (px) */
  width: number;
  /** ความสูง viewport (px) */
  height: number;
  /** เป็น desktop (≥ 768px) ไหม — sheet จะกลายเป็น popup */
  isDesktop: boolean;
  /** เป็น desktop ที่มี left-rail (≥ 900px) ไหม */
  hasRail: boolean;
}

const INITIAL: ViewportState = {
  width: 0,
  height: 0,
  isDesktop: false,
  hasRail: false,
};

export function useViewport(): ViewportState {
  const [state, setState] = React.useState<ViewportState>(INITIAL);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setState({
        width,
        height,
        isDesktop: width >= VIEWPORT.DESKTOP_POPUP_MIN,
        hasRail: width >= VIEWPORT.DESKTOP_RAIL_MIN,
      });
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return state;
}

/**
 * SSR-safe hook — ใช้สำหรับ component ที่ render ที่ server ด้วย
 * คืนค่า default ที่ client ก่อน hydration แล้วอัพเดตหลัง mount
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(
      `(min-width: ${VIEWPORT.DESKTOP_POPUP_MIN}px)`
    );
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
