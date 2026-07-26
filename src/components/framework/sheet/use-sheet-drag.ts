'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Sheet · Drag-to-Dismiss Hook (r50)
 * ═══════════════════════════════════════════════════════════════
 * Drag-to-dismiss สำหรับ mobile bottom sheet
 *
 * หลักการ:
 *   - ตามนิ้ว 1:1 (no rAF — write style ตรงใน pointermove)
 *   - เริ่ม drag ได้จาก grip handle, header หรือตอน scrollTop=0
 *   - Fling detection (velocity-based)
 *   - Snap-back spring ถ้า drag ไม่ถึง threshold
 *   - Drag-to-close: เลื่อนลงจนเลย viewport ก่อน unmount
 *
 * มุมมองผู้ใช้:
 *   - ลากลงเพื่อปิด sheet ได้เหมือนแอปมือถือทั่วไป
 *   - ลากแล้วปล่อยกลางทาง → sheet เด้งกลับขึ้นแบบ spring
 *   - Fling ลงเร็วๆ → ปิดทันที แม้จะลากน้อย
 *   - Sheet เลื่อนลงตามนิ้วเสมอ ไม่กระตุก
 * ═══════════════════════════════════════════════════════════════
 */

import * as React from 'react';
import { DRAG_THRESHOLDS, SHEET_TIMING } from '../shared';

interface UseSheetDragOptions {
  /** ref ของ sheet element */
  sheetRef: React.RefObject<HTMLDivElement | null>;
  /** ref ของ backdrop element */
  backdropRef: React.RefObject<HTMLDivElement | null>;
  /** ref ของ body (scrollable area) */
  bodyRef: React.RefObject<HTMLDivElement | null>;
  /** เปิดอยู่ไหม */
  open: boolean;
  /** ปิดได้ผ่าน drag ไหม */
  dismissable: boolean;
  /** กำลัง closing อยู่ไหม (ให้หยุด drag) */
  isClosing: boolean;
  /** callback เมื่อ drag-to-dismiss สำเร็จ */
  onDragClose: () => void;
  /** ตั้งค่าว่ากำลัง drag-close อยู่ (เพื่อข้าม state machine ปกติ) */
  setDragClosing: (v: boolean) => void;
}

export function useSheetDrag({
  sheetRef,
  backdropRef,
  bodyRef,
  open,
  dismissable,
  isClosing,
  onDragClose,
  setDragClosing,
}: UseSheetDragOptions) {
  React.useEffect(() => {
    if (!open || !dismissable || isClosing) return;
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const bodyEl = bodyRef.current;
    if (!sheet || !backdrop || !bodyEl) return;

    let dragState: {
      startY: number;
      startX: number;
      startScrollTop: number;
      startedAtTop: boolean;
      isGripZone: boolean;
      pointerId: number;
      dragY: number;
      active: boolean;
      sheetHeight: number;
      lastMoveTime: number;
      lastMoveY: number;
      prevMoveTime: number;
      prevMoveY: number;
    } | null = null;
    let cachedSheetHeight = sheet.offsetHeight;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        cachedSheetHeight = entry.contentRect.height;
      }
    });
    ro.observe(sheet);

    const isInGripZone = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Node)) return false;
      const handle = sheet.querySelector('.yp-sheet__handle');
      const header = sheet.querySelector('.yp-sheet__header');
      return (
        !!(handle && handle.contains(target)) ||
        !!(header && header.contains(target))
      );
    };

    /**
     * ★ r52: ตรวจสอบว่า target เป็น interactive element ที่ต้องการ
     * การคลิก ไม่ใช่ drag — ถ้าใช่ ให้ข้าม drag activation
     *
     * ปัญหาเดิม: แตะปุ่ม X แล้วนิ้วขยับ 1-2px ก็ activate drag
     * ทำให้เกิด inline transform รบกวน close animation
     *
     * ตัวอย่าง interactive elements:
     *   - .yp-sheet__close → ปุ่ม X
     *   - button, a, input, select, textarea → ปุ่ม/ลิงก์/ฟอร์ม
     *   - [role="button"] → ARIA button
     *   - [data-no-drag] → custom flag
     */
    const isInteractiveTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      // ปุ่มปิด (X) — แม้ SVG ข้างในก็ต้องข้าม
      const closeBtn = sheet.querySelector('.yp-sheet__close');
      if (closeBtn && closeBtn.contains(target)) return true;
      // ตรวจสอบตัว target เองและ ancestor ใกล้ ๆ (3 ระดับ)
      let el: Element | null = target;
      for (let i = 0; i < 3 && el; i++) {
        const tag = el.tagName.toLowerCase();
        if (
          tag === 'button' ||
          tag === 'a' ||
          tag === 'input' ||
          tag === 'select' ||
          tag === 'textarea' ||
          el.getAttribute('role') === 'button' ||
          el.hasAttribute('data-no-drag')
        ) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (sheet.classList.contains('is-closing')) return;
      if (sheet.classList.contains('is-animating')) return;

      // ★ r52: ถ้า target เป็น interactive element (ปุ่ม X, ลิงก์, ฯลฯ)
      //   ไม่ activate drag — กัน inline transform รบกวน close animation
      //   แต่ยังอนุญาตให้ drag จาก grip zone ปกติ (handle, header ที่ไม่ใช่ปุ่ม)
      if (isInteractiveTarget(e.target)) {
        return;
      }

      const sheetHeight = cachedSheetHeight || sheet.offsetHeight;
      const startScrollTop = bodyEl.scrollTop;
      const isGripZone = isInGripZone(e.target);
      const startedAtTop = startScrollTop === 0;

      // dynamic touch-action — กัน browser claim gesture
      if (isGripZone || startedAtTop) {
        bodyEl.style.touchAction = 'none';
      }

      const now = performance.now();
      dragState = {
        startY: e.clientY,
        startX: e.clientX,
        startScrollTop,
        startedAtTop,
        isGripZone,
        pointerId: e.pointerId,
        dragY: 0,
        active: false,
        sheetHeight,
        lastMoveTime: now,
        lastMoveY: e.clientY,
        prevMoveTime: now,
        prevMoveY: e.clientY,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragState) return;
      if (e.touches.length > 1) {
        if (dragState.active) resetDragState();
        return;
      }
      const touch = e.touches[0];
      const dy = touch.clientY - dragState.startY;
      const canDragDown = dragState.isGripZone || dragState.startedAtTop;
      if (canDragDown && dy > 0) {
        e.preventDefault();
        return;
      }
      if (dragState.active) {
        e.preventDefault();
      }
    };

    // ★ KEY: write transform ตรงใน pointermove ไม่ใช้ rAF
    //   Modern browsers รองรับ write style ใน pointermove ได้ดี
    //   เมื่อมี touch-action: none และ pointer capture
    const onPointerMove = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const clientY = e.clientY;
      const dy = clientY - dragState.startY;
      const canDragDown = dragState.isGripZone || dragState.startedAtTop;

      // track velocity
      dragState.prevMoveTime = dragState.lastMoveTime;
      dragState.prevMoveY = dragState.lastMoveY;
      dragState.lastMoveTime = performance.now();
      dragState.lastMoveY = clientY;

      if (canDragDown && dy > 0) {
        if (!dragState.active && dy < DRAG_THRESHOLDS.ACTIVATION) return;

        if (!dragState.active) {
          dragState.active = true;
          try {
            sheet.setPointerCapture(dragState.pointerId);
          } catch (_) {
            /* ignore */
          }
          sheet.classList.add('is-dragging');
          sheet.classList.add('is-scroll-locked');
          sheet.classList.remove('is-animating');
          sheet.classList.remove('is-closing');
          const active = document.activeElement as HTMLElement | null;
          if (
            active &&
            active !== document.body &&
            typeof active.blur === 'function'
          ) {
            try {
              active.blur();
            } catch (_) {
              /* ignore */
            }
          }
        }

        const sheetHeight = dragState.sheetHeight;
        let dragY: number;
        if (dy <= sheetHeight) {
          dragY = dy;
        } else {
          const overshoot = dy - sheetHeight;
          dragY = sheetHeight + overshoot * DRAG_THRESHOLDS.EDGE_RESISTANCE;
        }
        dragState.dragY = dragY;
        // ★ Direct write — no rAF
        sheet.style.transform = 'translate3d(0, ' + dragY + 'px, 0)';
        // backdrop opacity อัปเดตทุก frame (ตามนิ้วเลย)
        const dragProgress = Math.min(dragY / sheetHeight, 1);
        backdrop.style.opacity = (1 - dragProgress * 0.55).toString();
        return;
      }

      if (dragState.active && dy <= 0) {
        dragState.dragY = 0;
        sheet.style.transform = '';
        backdrop.style.opacity = '';
        return;
      }

      if (dragState.active) {
        resetDragState();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const state = dragState;
      dragState = null;
      bodyEl.style.touchAction = '';
      try {
        sheet.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      sheet.classList.remove('is-scroll-locked');

      if (!state.active) return;

      // velocity (px/sec) จาก last 2 samples
      let velocity = 0;
      const dt = state.lastMoveTime - state.prevMoveTime;
      if (dt > 0) {
        const dyMove = state.lastMoveY - state.prevMoveY;
        velocity = dyMove / (dt / 1000);
      }

      const sheetHeight = state.sheetHeight;
      const dragThreshold = sheetHeight * DRAG_THRESHOLDS.CLOSE_RATIO;
      const flingThreshold = sheetHeight * DRAG_THRESHOLDS.FLING_CLOSE_RATIO;
      const isFlingDown = velocity > DRAG_THRESHOLDS.FLING_VELOCITY;
      const shouldClose =
        state.dragY > dragThreshold ||
        (isFlingDown && state.dragY > flingThreshold);

      sheet.classList.remove('is-dragging');

      if (shouldClose) {
        // DRAG-TO-CLOSE
        // ★ ใช้ viewport height แทน sheetHeight — sheet จะได้เลื่อนลงจนสุดจอ
        //   ก่อนหน้านี้ใช้ sheetHeight ทำให้ sheet หยุดกลางทาง 8vh แล้วค่อย fade
        const viewportHeight =
          typeof window !== 'undefined'
            ? window.innerHeight
            : sheetHeight + 200;
        setDragClosing(true);
        sheet.classList.add('is-closing');
        sheet.style.transform = 'translate3d(0, ' + viewportHeight + 'px, 0)';
        backdrop.style.opacity = '0';

        const finish = () => {
          sheet.removeEventListener('transitionend', handler);
          if (safety) clearTimeout(safety);
          onDragClose();
        };
        const handler = (ev: TransitionEvent) => {
          if (ev.target !== sheet || ev.propertyName !== 'transform') return;
          finish();
        };
        sheet.addEventListener('transitionend', handler);
        const safety = setTimeout(finish, SHEET_TIMING.DRAG_CLOSE_SAFETY);
      } else {
        // SNAP-BACK spring bounce
        sheet.classList.add('is-animating');
        requestAnimationFrame(() => {
          sheet.style.transform = '';
          backdrop.style.opacity = '';
        });
        const cleanup = () => {
          sheet.classList.remove('is-animating');
          sheet.removeEventListener('transitionend', onAnimEnd);
          if (animSafety) clearTimeout(animSafety);
        };
        const onAnimEnd = (ev: TransitionEvent) => {
          if (ev.target !== sheet || ev.propertyName !== 'transform') return;
          cleanup();
        };
        sheet.addEventListener('transitionend', onAnimEnd);
        const animSafety = setTimeout(cleanup, 500);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      resetDragState();
    };

    const resetDragState = () => {
      if (!dragState) return;
      const wasActive = dragState.active;
      dragState = null;
      bodyEl.style.touchAction = '';
      if (wasActive) {
        sheet.classList.remove('is-dragging');
        sheet.classList.remove('is-scroll-locked');
        sheet.style.transform = '';
        backdrop.style.opacity = '';
      }
    };

    sheet.addEventListener('pointerdown', onPointerDown);
    sheet.addEventListener('pointermove', onPointerMove);
    sheet.addEventListener('pointerup', onPointerUp);
    sheet.addEventListener('pointercancel', onPointerCancel);
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      sheet.removeEventListener('pointerdown', onPointerDown);
      sheet.removeEventListener('pointermove', onPointerMove);
      sheet.removeEventListener('pointerup', onPointerUp);
      sheet.removeEventListener('pointercancel', onPointerCancel);
      sheet.removeEventListener('touchmove', onTouchMove as EventListener);
      ro.disconnect();
      bodyEl.style.touchAction = '';
    };
  }, [open, dismissable, isClosing, sheetRef, backdropRef, bodyRef, onDragClose, setDragClosing]);
}
