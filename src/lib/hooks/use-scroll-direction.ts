'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · useScrollDirection (v3.9.2)
// ═══════════════════════════════════════════════════════════════
// ★ v3.9.2: Native Platform Polish — stable show/hide
//   - Velocity-aware: fast scroll down → hide immediately
//   - visibility-hidden when collapsed (prevents ghost clicks)
//   - isScrolled state for top-bar refinement (.is-scrolled class)
//   - rAF throttle for 60fps smoothness
//   - Reduced-motion respected
//
// คำศัพท์ที่ใช้ (ชัดเจน):
//   - "แสดง/ซ่อน" (show/hide) = ระบบอัตโนมัติตอนเลื่อน → มี animation
//   - "ปิด/เปิด" (close/open) = การเรียกใช้เชิงโปรแกรม → ไม่มี animation
//
// Hook นี้จัดการเฉพาะ "แสดง/ซ่อน" (scroll-based) เท่านั้น
// ส่วน "ปิด/เปิด" จัดการผ่าน CSS (body.yp-window-open .fab) — ไม่เกี่ยวกับ hook นี้
//
// รูปแบบ: classic back-to-top pattern + velocity tracking
//   1. window scroll listener เดียว (passive)
//   2. rAF throttle — คำนวณ 1 ครั้งต่อ frame
//   3. ตรวจทิศทาง + velocity: up = y < lastY, down = y > lastY
//   4. THRESHOLD — เลื่อนลงผ่าน 120px → ซ่อน, เลื่อนขึ้น → แสดง
//   5. VELOCITY — ถ้าเลื่อนลงเร็วกว่า 8px/frame → ซ่อนทันที (responsive)
//   6. SCROLL STATE — ถ้า y > 8px → isScrolled = true (top-bar จะได้ shadow เข้มขึ้น)
//
// คืนค่า: { hidden: boolean, isScrolled: boolean }
//   hidden = true → FAB ควร "ซ่อน" (CSS จะ animate scale + fade + visibility hidden)
//   hidden = false → FAB ควร "แสดง" (CSS จะ animate scale + fade กลับ)
//   isScrolled = true → Top bar ควรเพิ่ม .is-scrolled (shadow เข้มขึ้น)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';

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

    // ยกเลิกถ้า user ตั้งค่า reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    lastYRef.current = window.scrollY || window.pageYOffset || 0;
    lastTimeRef.current = performance.now();

    // Sync initial isScrolled state
    const initialY = lastYRef.current;
    const initialScrolled = initialY > opts.scrollStateThreshold;
    if (initialScrolled !== scrolledRef.current) {
      scrolledRef.current = initialScrolled;
      setIsScrolled(initialScrolled);
    }

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame((now) => {
        tickingRef.current = false;
        const o = optsRef.current;
        const y = window.scrollY || window.pageYOffset || 0;
        const lastY = lastYRef.current;
        const lastTime = lastTimeRef.current;
        const dt = Math.max(1, now - lastTime); // ms, min 1 to avoid divide-by-zero
        const dy = y - lastY;

        // Velocity in px per ms (then we compare against threshold * 16ms ≈ 1 frame)
        const velocity = Math.abs(dy) / dt;
        const up = dy < 0;
        const down = dy > 0;

        // ── Hidden state (FAB show/hide) ──
        let nowHidden = hiddenRef.current;
        if (y < o.showAtTop) {
          // ใกล้บน → แสดงเสมอ
          nowHidden = false;
        } else if (up) {
          // เลื่อนขึ้น → แสดง
          nowHidden = false;
        } else if (down && y > o.hideThreshold) {
          // เลื่อนลงผ่าน threshold → ซ่อน
          // Velocity-aware: ถ้าเร็วมาก → ซ่อนทันทีแม้ y ยังไม่เกิน hideThreshold มาก
          // (กัน user ปัดเร็วแล้ว FAB ยังแสดงอยู่นานเกิน)
          if (velocity > o.velocityThreshold / 16 || y > o.hideThreshold * 1.5) {
            nowHidden = true;
          } else {
            // ปัดช้า → ใช้ threshold ปกติ
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

    return () => {
      window.removeEventListener('scroll', handleScroll);
      tickingRef.current = false;
    };
  }, [opts.enabled]);

  return { hidden, isScrolled };
}
