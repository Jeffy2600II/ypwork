'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · FAB · Scroll Direction Hook (r50)
// ═══════════════════════════════════════════════════════════════
// Velocity-aware show/hide สำหรับ FAB และ top-bar scroll state
//
// ★ r50 การแก้ปัญหา:
//   - ย้ายจาก lib/hooks/use-scroll-direction.ts มาอยู่ใน framework/fab/
//   - ใช้ onSheetOpenChange แทน onOverlayOpenChange (sheet เท่านั้นที่ซ่อน FAB)
//   - popup บน desktop ไม่จำเป็นต้องซ่อน FAB เพราะ FAB อยู่ในตำแหน่งที่ไม่ชน
//
// คำศัพท์ที่ใช้ (ชัดเจน):
//   - "แสดง/ซ่อน" (show/hide) = ระบบอัตโนมัติตอนเลื่อน → มี animation
//   - "ปิด/เปิด" (close/open) = การเรียกใช้เชิงโปรแกรม → ไม่มี animation
//
// Hook นี้จัดการเฉพาะ "แสดง/ซ่อน" (scroll-based) เท่านั้น
// ส่วน "ปิด/เปิด" จัดการผ่าน CSS (body.yp-overlay-open--sheet .fab)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import {
  isSheetOpenRightNow,
  onSheetOpenChange,
} from '../shared';

export interface UseScrollDirectionOptions {
  /** ปิด hook (เช่น เมื่อไม่มี FAB) */
  enabled?: boolean;
  /** เลื่อนลงผ่าน Y นี้ (px) → ซ่อน */
  hideThreshold?: number;
  /** ใกล้บนสุดเท่านี้ (px) → แสดงเสมอ */
  showAtTop?: number;
  /** ถ้าเลื่อนลงเร็วกว่านี้ (px/frame) → ซ่อนทันที (velocity-aware) */
  velocityThreshold?: number;
  /** ถ้า y > นี้ (px) → isScrolled = true (top-bar refinement) */
  scrollStateThreshold?: number;
}

const DEFAULTS: Required<UseScrollDirectionOptions> = {
  enabled: true,
  hideThreshold: 120,
  showAtTop: 40,
  velocityThreshold: 8,
  scrollStateThreshold: 8,
};

export function useScrollDirection(
  options: UseScrollDirectionOptions = {},
): { hidden: boolean; isScrolled: boolean } {
  const opts = { ...DEFAULTS, ...options };

  const [hidden, setHidden] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const lastYRef = React.useRef(0);
  const lastTimeRef = React.useRef(0);
  const tickingRef = React.useRef(false);
  const hiddenRef = React.useRef(false);
  const scrolledRef = React.useRef(false);
  const optsRef = React.useRef(opts);

  React.useEffect(() => {
    optsRef.current = opts;
  });

  React.useEffect(() => {
    if (!opts.enabled) return;
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    lastYRef.current = window.scrollY || window.pageYOffset || 0;
    lastTimeRef.current = performance.now();

    const initialY = lastYRef.current;
    const initialScrolled = initialY > opts.scrollStateThreshold;
    if (initialScrolled !== scrolledRef.current) {
      scrolledRef.current = initialScrolled;
      setIsScrolled(initialScrolled);
    }

    const handleScroll = () => {
      // ★ r50: ข้าม scroll events เฉพาะตอนที่ SHEET เปิดอยู่ (ไม่ใช่ popup)
      //   popup บน desktop ไม่ lock scroll แบบเดียวกับ sheet
      if (isSheetOpenRightNow()) {
        return;
      }
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame((now) => {
        tickingRef.current = false;
        if (isSheetOpenRightNow()) {
          tickingRef.current = false;
          return;
        }
        const o = optsRef.current;
        const y = window.scrollY || window.pageYOffset || 0;
        const lastY = lastYRef.current;
        const lastTime = lastTimeRef.current;
        const dt = Math.max(1, now - lastTime);
        const dy = y - lastY;

        const velocity = Math.abs(dy) / dt;
        const up = dy < 0;
        const down = dy > 0;

        // ── Hidden state (FAB show/hide) ──
        let nowHidden = hiddenRef.current;
        if (y < o.showAtTop) {
          nowHidden = false;
        } else if (up) {
          nowHidden = false;
        } else if (down && y > o.hideThreshold) {
          if (velocity > o.velocityThreshold / 16 || y > o.hideThreshold * 1.5) {
            nowHidden = true;
          } else {
            nowHidden = true;
          }
        }

        // ── Scrolled state (top-bar refinement) ──
        const nowScrolled = y > o.scrollStateThreshold;

        lastYRef.current = y;
        lastTimeRef.current = now;

        if (nowHidden !== hiddenRef.current) {
          hiddenRef.current = nowHidden;
          setHidden(nowHidden);
        }

        if (nowScrolled !== scrolledRef.current) {
          scrolledRef.current = nowScrolled;
          setIsScrolled(nowScrolled);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ★ r50: re-sync เมื่อ SHEET ปิด (เฉพาะ sheet — ไม่ใช่ popup)
    //   ใช้ onSheetOpenChange แทน onOverlayOpenChange
    const unsubSheetOpen = onSheetOpenChange((isOpen) => {
      if (isOpen) return;
      // Sync ทันที — no-warp scroll lock ทำให้ scrollY ถูกต้องเสมอ
      const y = window.scrollY || window.pageYOffset || 0;
      const o = optsRef.current;
      lastYRef.current = y;
      lastTimeRef.current = performance.now();

      let reHidden = hiddenRef.current;
      if (y < o.showAtTop) {
        reHidden = false;
      } else if (y > o.hideThreshold) {
        reHidden = true;
      }

      if (reHidden !== hiddenRef.current) {
        hiddenRef.current = reHidden;
        setHidden(reHidden);
      }

      const reScrolled = y > o.scrollStateThreshold;
      if (reScrolled !== scrolledRef.current) {
        scrolledRef.current = reScrolled;
        setIsScrolled(reScrolled);
      }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubSheetOpen();
      tickingRef.current = false;
    };
  }, [opts.enabled]);

  return { hidden, isScrolled };
}
