'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Window Framework (v3.1.0)
// ═══════════════════════════════════════════════════════════════
// Unified popup/window framework — แทนที่ BottomSheet แบบตายตัวเดิม
//
// รองรับ 4 ประเภท:
//   1. 'sheet'      → Bottom sheet (slide จากล่าง, drag-to-dismiss)
//   2. 'modal'      → Centered dialog (desktop-first, ใหญ่ขึ้น)
//   3. 'fullscreen' → Full-page overlay (เหมือนเปิดหน้าใหม่ แต่ lightweight)
//   4. 'sidepanel'  → Slide จากด้านข้าง (desktop-first)
//
// คุณสมบัติเด่น:
// ✓ Nested popups — เปิดซ้อนกันได้ไม่จำกัด (ผ่าน Window Stack Manager)
// ✓ Auto z-index — ไม่ต้องจัดการเอง
// ✓ Auto hide bottom-nav/FAB (ผ่าน body.yp-window-open)
// ✓ Drag-to-dismiss (sheet เท่านั้น) — ลื่นไหล ตามนิ้ว 1:1
// ✓ Backdrop fade animation ทุกการปิด — แก้ปัญหา "ปิดไปเลยไม่มี animation"
// ✓ ESC / back-button / backdrop click — ส่งเฉพาะ top window
// ✓ Scroll lock (count-based — รองรับ nested)
// ✓ Reduced-motion friendly
// ✓ Popup mode auto — sheet → modal เมื่อ desktop (≥768px) เว้นแต่ fullscreen
//
// Backward compat: BottomSheet component เดิมยัง export อยู่ (alias)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useWindowStack, generateWindowId, type WindowType } from '@/lib/window-stack';

// ── Drag-to-dismiss tuning ──
// ★ v3.5.0: ปรับ tuning ให้ลื่นไหลขึ้น — ลด threshold ให้ fling ทำงานง่ายขึ้น
const DRAG = {
  ACTIVATION_THRESHOLD: 1,
  EDGE_RESISTANCE: 0.35,
  DRAG_CLOSE_RATIO: 0.25,   // v3.5: ลดจาก 0.28 → ปิดเร็วขึ้นเมื่อ drag ผ่าน 25%
  FLING_VELOCITY: 400,      // v3.5: ลดจาก 500 → fling ทำงานง่ายขึ้น
  FLING_CLOSE_RATIO: 0.08,  // v3.5: ลดจาก 0.10
};

// ── Media query: desktop popup mode (sheet → modal) ──
const POPUP_MODE_MQ = '(min-width: 768px)';

// ═══════════════════════════════════════════════════════════════
// SCROLL LOCK (count-based — รองรับ nested windows)
// ═══════════════════════════════════════════════════════════════
let _lockCount = 0;
let _savedScrollY = 0;
let _savedScrollX = 0;
let _savedHtmlCssText = '';
let _savedBodyCssText = '';

function lockScroll() {
  if (typeof window === 'undefined') return;
  _lockCount++;
  if (_lockCount !== 1) return;

  const html = document.documentElement;
  const body = document.body;

  _savedScrollY = window.scrollY || window.pageYOffset || 0;
  _savedScrollX = window.scrollX || window.pageXOffset || 0;
  _savedHtmlCssText = html.getAttribute('style') || '';
  _savedBodyCssText = body.getAttribute('style') || '';

  const scrollbarWidth = window.innerWidth - html.clientWidth;

  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  html.style.marginRight = scrollbarWidth > 0 ? scrollbarWidth + 'px' : '';

  body.style.position = 'fixed';
  body.style.top = '-' + _savedScrollY + 'px';
  body.style.left = '0';
  body.style.right = '0';
  body.style.bottom = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';

  html.style.setProperty('--yp-scroll-locked', '1');
  html.style.setProperty('--yp-locked-scroll-y', _savedScrollY + 'px');
}

function unlockScroll() {
  if (typeof window === 'undefined') return;
  _lockCount = Math.max(0, _lockCount - 1);
  if (_lockCount !== 0) return;

  const html = document.documentElement;
  const body = document.body;

  if (_savedHtmlCssText) {
    html.setAttribute('style', _savedHtmlCssText);
  } else {
    html.removeAttribute('style');
  }
  if (_savedBodyCssText) {
    body.setAttribute('style', _savedBodyCssText);
  } else {
    body.removeAttribute('style');
  }

  html.style.scrollBehavior = 'auto';
  window.scrollTo(_savedScrollX, _savedScrollY);
  requestAnimationFrame(() => {
    html.style.scrollBehavior = '';
  });
}

// ═══════════════════════════════════════════════════════════════
// Window component
// ═══════════════════════════════════════════════════════════════

export type WindowSize = 'auto' | 'sm' | 'md' | 'tall' | 'full';
export type WindowSide = 'left' | 'right';

export interface WindowProps {
  /** type ของ window — default 'sheet' */
  type?: WindowType;
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** size variant (ส่งผลตาม type — ดู CSS) */
  size?: WindowSize;
  /** ปิดผ่าน backdrop/ESC/drag/back-button ได้ */
  dismissable?: boolean;
  /** ซ่อน grip handle ของ sheet (สำหรับ sheet ที่มี header ของตัวเอง) */
  hideHandle?: boolean;
  /** ซ่อน close button อัตโนมัติ (ถ้ามี custom close ของตัวเอง) */
  hideCloseButton?: boolean;
  /** side สำหรับ sidepanel — default 'right' */
  side?: WindowSide;
  /** ใช้สำหรับ fullscreen — ถ้า true จะไม่มี padding/margin (เอาใช้สำหรับเปิด "หน้าใหม่") */
  bare?: boolean;
  /** className เพิ่มเติมสำหรับ window root */
  className?: string;
}

export function Window({
  type = 'sheet',
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'auto',
  dismissable = true,
  hideHandle = false,
  hideCloseButton = false,
  side = 'right',
  bare = false,
  className,
}: WindowProps) {
  // ── state ──
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [popupMode, setPopupMode] = React.useState(false);

  // ── refs ──
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const dragClosingRef = React.useRef(false);
  const historyPushedRef = React.useRef(false);
  const closedRef = React.useRef(false);
  const windowIdRef = React.useRef<string>('');
  const zIndexRef = React.useRef<number>(18000);

  // ── stable onClose ref (กัน effect re-run เมื่อ parent re-render) ──
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ── register with stack manager เมื่อ mount + open ──
  React.useEffect(() => {
    if (!open) return;
    if (!windowIdRef.current) {
      windowIdRef.current = generateWindowId();
    }
    const entry = useWindowStack
      .getState()
      .register({
        id: windowIdRef.current,
        type,
        dismissable,
        requestClose: () => onCloseRef.current(),
      });
    zIndexRef.current = entry.zIndex;

    return () => {
      if (windowIdRef.current) {
        useWindowStack.getState().unregister(windowIdRef.current);
      }
    };
  }, [open, type, dismissable]);

  // ═══════════════════════════════════════════════════════════════
  // OPEN/CLOSE STATE MACHINE
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      closedRef.current = false;
      if (typeof window !== 'undefined') {
        // sheet/fullscreen/sidepanel ใช้ responsive ที่กว้างขึ้น
        // modal ใช้ popup mode เสมอ (centered)
        const mq =
          type === 'modal'
            ? true
            : type === 'fullscreen'
              ? false
              : window.matchMedia(POPUP_MODE_MQ).matches;
        setPopupMode(mq);
      }
    } else {
      if (mounted && !isClosing && !closedRef.current) {
        closedRef.current = true;
        if (dragClosingRef.current) {
          dragClosingRef.current = false;
          setMounted(false);
          setIsOpen(false);
          setIsClosing(false);
        } else {
          // ★ แก้ปัญหา "backdrop close ไม่มี animation":
          //   ตั้ง isClosing=true แล้วเก็บ isOpen=true ไว้ชั่วคราว
          //   ให้ CSS transition ทำงาน — sheet เลื่อนลง + backdrop จาง
          //   เมื่อ transitionend หรือ safety timeout → unmount
          setIsClosing(true);
          // NOTE: ไม่ setIsOpen(false) ทันที — ให้ CSS class is-closing จัดการ transform
          // แต่ต้อง ensure ว่า is-open class ถูก remove เพื่อ trigger transform change
          // เราจะใช้ class composition: 'is-closing' อย่างเดียว (ไม่มี 'is-open')
          // ดังนั้น setIsOpen(false) ต้องทำ
          setIsOpen(false);
        }
      }
    }
  }, [open, mounted, isClosing, type]);

  // ── After mount → double rAF → trigger open transition ──
  React.useEffect(() => {
    if (!mounted || isClosing || !open) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsOpen(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [mounted, open, isClosing]);

  // ── Body class + scroll lock (เฉพาะตอน isOpen) ──
  React.useEffect(() => {
    if (!mounted || !isOpen || isClosing) return;
    // body.yp-window-open จัดการโดย stack manager แล้ว แต่ยังต้อง lockScroll
    // สำหรับ keyboard accessibility และ background scroll prevention
    if (popupMode) {
      document.body.classList.add('yp-window-popup');
    }
    lockScroll();

    return () => {
      document.body.classList.remove('yp-window-popup');
      unlockScroll();
    };
  }, [mounted, isOpen, isClosing, popupMode]);

  // ── ESC handler (top-window-only ผ่าน stack manager) ──
  // Stack manager จะเรียก requestClose เฉพาะ top window — เราจึงไม่ต้อง
  // เช็คเองว่าเป็น top หรือไม่ แต่ก็ยังต้องเช็ค isClosing เพื่อกัน double-close
  // (Stack manager ติดตั้ง global listener ที่ module load — ไม่ต้องทำซ้ำที่นี่)

  // ── Back button (history) support ──
  React.useEffect(() => {
    if (!mounted || !open || !dismissable || isClosing) return;
    if (historyPushedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      window.history.pushState({ ypWindow: true }, '');
      historyPushedRef.current = true;
    } catch (_) {
      return;
    }

    const onPop = () => {
      historyPushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        try {
          window.history.back();
        } catch (_) {
          /* ignore */
        }
      }
    };
  }, [mounted, open, dismissable, isClosing]);

  // ═══════════════════════════════════════════════════════════════
  // CLOSE TRANSITION END — unmount after close animation
  // ═══════════════════════════════════════════════════════════════
  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== windowRef.current) return;
      // sheet/fullscreen/sidepanel ใช้ 'transform', modal ใช้ 'transform' หรือ 'opacity'
      if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
      if (isClosing) {
        setMounted(false);
        setIsClosing(false);
        setIsOpen(false);
      }
    },
    [isClosing]
  );

  // Backdrop transition end — เผื่อ modal ที่ backdrop เป็นคน animate หลัก
  const handleBackdropTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== backdropRef.current) return;
      if (e.propertyName !== 'opacity' && e.propertyName !== 'visibility') return;
      if (isClosing) {
        setMounted(false);
        setIsClosing(false);
        setIsOpen(false);
      }
    },
    [isClosing]
  );

  // Safety timeout — กัน transitionend ไม่ firing
  React.useEffect(() => {
    if (!isClosing) return;
    const t = setTimeout(() => {
      setMounted(false);
      setIsClosing(false);
      setIsOpen(false);
    }, 600);
    return () => clearTimeout(t);
  }, [isClosing]);

  // ═══════════════════════════════════════════════════════════════
  // DRAG-TO-DISMISS (sheet เท่านั้น และไม่ใช่ popupMode)
  // ★ v3.1.0: เขียน transform ตรงใน pointermove โดยไม่ผ่าน rAF —
  //   ทำให้ sheet ตามนิ้ว 1:1 ไม่กระตุก ไม่เป็นเฟรมๆ
  //   (Modern browsers รองรับการ write style ใน pointermove ได้ดี
  //    เมื่อมี touch-action: none และ pointer capture)
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    if (!mounted || !open || !dismissable || isClosing) return;
    if (type !== 'sheet') return;
    if (popupMode) return; // sheet ใน desktop → modal, ไม่ drag
    const window_ = windowRef.current;
    const backdrop = backdropRef.current;
    const bodyEl = bodyRef.current;
    if (!window_ || !backdrop || !bodyEl) return;

    const closeSheet = () => onCloseRef.current();

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
    let cachedSheetHeight = window_.offsetHeight;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        cachedSheetHeight = entry.contentRect.height;
      }
    });
    ro.observe(window_);

    const isInGripZone = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Node)) return false;
      const handle = window_.querySelector('.yp-window__handle');
      const header = window_.querySelector('.yp-window__header');
      return (
        !!(handle && handle.contains(target)) ||
        !!(header && header.contains(target))
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (window_.classList.contains('is-closing')) return;
      if (window_.classList.contains('is-animating')) return;

      const sheetHeight = cachedSheetHeight || window_.offsetHeight;
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

    // ★ KEY CHANGE: เขียน transform ตรงใน pointermove ไม่ใช้ rAF
    //   แต่ใช้ requestAnimationFrame เฉพาะ backdrop opacity (เพราะช้ากว่าได้)
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
        if (!dragState.active && dy < DRAG.ACTIVATION_THRESHOLD) return;

        if (!dragState.active) {
          dragState.active = true;
          try {
            window_.setPointerCapture(dragState.pointerId);
          } catch (_) {
            /* ignore */
          }
          window_.classList.add('is-dragging');
          window_.classList.add('is-scroll-locked');
          window_.classList.remove('is-animating');
          window_.classList.remove('is-closing');
          const active = document.activeElement as HTMLElement | null;
          if (active && active !== document.body && typeof active.blur === 'function') {
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
          dragY = sheetHeight + overshoot * DRAG.EDGE_RESISTANCE;
        }
        dragState.dragY = dragY;
        // ★ Direct write — no rAF
        window_.style.transform = 'translate3d(0, ' + dragY + 'px, 0)';
        // backdrop opacity อัปเดตทุก frame (ก็ตามนิ้วเลย)
        const dragProgress = Math.min(dragY / sheetHeight, 1);
        backdrop.style.opacity = (1 - dragProgress * 0.55).toString();
        return;
      }

      if (dragState.active && dy <= 0) {
        dragState.dragY = 0;
        window_.style.transform = '';
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
        window_.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      window_.classList.remove('is-scroll-locked');

      if (!state.active) return;

      // velocity (px/sec) จาก last 2 samples
      let velocity = 0;
      const dt = state.lastMoveTime - state.prevMoveTime;
      if (dt > 0) {
        const dyMove = state.lastMoveY - state.prevMoveY;
        velocity = dyMove / (dt / 1000);
      }

      const sheetHeight = state.sheetHeight;
      const dragThreshold = sheetHeight * DRAG.DRAG_CLOSE_RATIO;
      const flingThreshold = sheetHeight * DRAG.FLING_CLOSE_RATIO;
      const isFlingDown = velocity > DRAG.FLING_VELOCITY;
      const shouldClose =
        state.dragY > dragThreshold ||
        (isFlingDown && state.dragY > flingThreshold);

      window_.classList.remove('is-dragging');

      if (shouldClose) {
        // DRAG-TO-CLOSE
        // ★ v3.5.0: ใช้ viewport height แทน sheetHeight — sheet จะได้เลื่อนลงจนสุดจอ
        //   ก่อนหน้านี้ใช้ sheetHeight (ซึ่งถูกจำกัดด้วย max-height: 92vh) ทำให้ sheet
        //   หยุดกลางทาง 8vh แล้วค่อย fade → ดูไม่ลื่นไหล
        //   ตอนนี้เลื่อนลง 100vh → sheet หายไปจาก viewport ก่อน unmount
        const viewportHeight =
          typeof window !== 'undefined'
            ? window.innerHeight
            : sheetHeight + 200;
        dragClosingRef.current = true;
        window_.classList.add('is-closing');
        window_.style.transform = 'translate3d(0, ' + viewportHeight + 'px, 0)';
        // backdrop ก็ fade ออกด้วย (เร็วกว่า sheet เล็กน้อย)
        backdrop.style.opacity = '0';

        const finish = () => {
          window_.removeEventListener('transitionend', handler);
          if (safety) clearTimeout(safety);
          closeSheet();
        };
        const handler = (ev: TransitionEvent) => {
          if (ev.target !== window_ || ev.propertyName !== 'transform') return;
          finish();
        };
        window_.addEventListener('transitionend', handler);
        // ★ v3.5.0: ลด safety timeout จาก 500ms → 420ms (ตรงกับ CSS transition duration)
        const safety = setTimeout(finish, 420);
      } else {
        // SNAP-BACK spring bounce
        window_.classList.add('is-animating');
        // ใช้ rAF เดียวเพื่อ ensure style ถูก commit ก่อนเปลี่ยน transform
        requestAnimationFrame(() => {
          window_.style.transform = '';
          backdrop.style.opacity = '';
        });
        const cleanup = () => {
          window_.classList.remove('is-animating');
          window_.removeEventListener('transitionend', onAnimEnd);
          if (animSafety) clearTimeout(animSafety);
        };
        const onAnimEnd = (ev: TransitionEvent) => {
          if (ev.target !== window_ || ev.propertyName !== 'transform') return;
          cleanup();
        };
        window_.addEventListener('transitionend', onAnimEnd);
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
        window_.classList.remove('is-dragging');
        window_.classList.remove('is-scroll-locked');
        window_.style.transform = '';
        backdrop.style.opacity = '';
      }
    };

    window_.addEventListener('pointerdown', onPointerDown);
    window_.addEventListener('pointermove', onPointerMove);
    window_.addEventListener('pointerup', onPointerUp);
    window_.addEventListener('pointercancel', onPointerCancel);
    window_.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      window_.removeEventListener('pointerdown', onPointerDown);
      window_.removeEventListener('pointermove', onPointerMove);
      window_.removeEventListener('pointerup', onPointerUp);
      window_.removeEventListener('pointercancel', onPointerCancel);
      window_.removeEventListener('touchmove', onTouchMove as EventListener);
      ro.disconnect();
      bodyEl.style.touchAction = '';
    };
  }, [mounted, open, dismissable, popupMode, isClosing, type]);

  // ── Safety net: cleanup on unmount ──
  React.useEffect(() => {
    return () => {
      try {
        document.body.classList.remove('yp-window-popup');
        unlockScroll();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  // ── Compute classes ──
  const showHandle = type === 'sheet' && !hideHandle && !popupMode;
  const showHeader = !!title || (dismissable && !hideCloseButton);

  const rootClass = [
    'yp-window-root',
    `yp-window-root--${type}`,
    `yp-window-root--${size}`,
    isOpen && !isClosing ? 'is-open' : '',
    isClosing ? 'is-closing' : '',
    popupMode ? 'is-popup-mode' : '',
    bare ? 'is-bare' : '',
    side === 'left' ? 'is-side-left' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const windowClass = [
    'yp-window',
    `yp-window--${type}`,
    `yp-window--${size}`,
    footer ? 'has-footer' : '',
    isOpen && !isClosing ? 'is-open' : '',
    isClosing ? 'is-closing' : '',
    popupMode ? 'is-popup-mode' : '',
    bare ? 'is-bare' : '',
    side === 'left' ? 'is-side-left' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const backdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dismissable) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className={rootClass}
      style={{
        ['--yp-window-z' as string]: zIndexRef.current,
      }}
      onClick={backdropClick}
      onTransitionEnd={handleBackdropTransitionEnd}
    >
      <div
        ref={windowRef}
        className={windowClass}
        role="dialog"
        aria-modal="true"
        aria-label={title || (type === 'sheet' ? 'Bottom sheet' : 'Window')}
        onTransitionEnd={handleTransitionEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {showHandle ? <div className="yp-window__handle" aria-hidden="true" /> : null}

        {showHeader ? (
          <div
            className="yp-window__header"
            style={!title ? { marginBottom: 0, justifyContent: 'flex-end' } : undefined}
          >
            {title ? (
              <div className="yp-window__heading">
                <h2 className="yp-window__title">{title}</h2>
                {description ? (
                  <p className="yp-window__desc">{description}</p>
                ) : null}
              </div>
            ) : (
              <span className="sr-only" aria-hidden="true">
                {type === 'sheet' ? 'Bottom sheet' : 'Window'}
              </span>
            )}
            {dismissable && !hideCloseButton ? (
              <button
                type="button"
                className="yp-window__close"
                aria-label="ปิด"
                onClick={onClose}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          ref={bodyRef}
          className="yp-window__body"
          data-scrollable="true"
        >
          {children}
        </div>

        {footer ? <div className="yp-window__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// Backward compat: BottomSheet = Window type="sheet"
// ใช้สำหรับ code เดิมที่ import BottomSheet อยู่ — ไม่ต้องแก้
// ═══════════════════════════════════════════════════════════════
export type BottomSheetProps = Omit<WindowProps, 'type'>;

export function BottomSheet(props: BottomSheetProps) {
  return <Window type="sheet" {...props} />;
}

// Convenience wrapper สำหรับ modal
export function Modal(props: BottomSheetProps) {
  return <Window type="modal" {...props} />;
}

// Convenience wrapper สำหรับ fullscreen overlay (เหมือนเปิดหน้าใหม่)
export function FullscreenOverlay(props: BottomSheetProps) {
  return <Window type="fullscreen" {...props} />;
}

// Convenience wrapper สำหรับ sidepanel
export function SidePanel(
  props: BottomSheetProps & { side?: WindowSide }
) {
  return <Window type="sidepanel" {...props} />;
}

/**
 * Convenience close button สำหรับใช้ใน window header (legacy compat)
 */
export function BottomSheetCloseButton({
  onClose,
  label = 'ปิด',
}: {
  onClose: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="yp-window__close"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M18 6L6 18M6 6l12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export { generateWindowId, useWindowStack };
export type { WindowType };
