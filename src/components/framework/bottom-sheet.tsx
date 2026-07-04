'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Bottom Sheet (port จาก demo v8.2 — framework/bottom-sheet.js)
// ═══════════════════════════════════════════════════════════════
// iOS-native quality bottom sheet ที่ port มาจาก vanilla JS ของ demo
//
// ฟีเจอร์:
// ✓ เปิด/ปิดลื่นไหล ไม่กระตุก (transition-based, no keyframe)
// ✓ Drag-to-dismiss ลากได้จากทุกที่ (grip zone เสมอ, body เมื่อ at top)
// ✓ Snap-back spring animation (cubic-bezier(0.34, 1.56, 0.64, 1))
// ✓ Stack ซ้อนกันได้หลายชั้น (z-index + scroll lock count)
// ✓ รองรับ back button / ESC / แตะ backdrop ปิด
// ✓ Velocity-based dismiss — fling ปิดได้ง่าย
// ✓ Popup mode (≥768px) — centered modal, ปิด drag-to-dismiss
// ✓ rAF coalescing + ResizeObserver cached sheet height
// ✓ dynamic touch-action บน bodyEl (กัน browser claim gesture)
// ✓ transitionend with safety timeout (กัน "sheet หายวับ")
//
// ใช้ CSS classes จาก demo: sheet-backdrop, sheet, sheet__handle,
// sheet__header, sheet__title, sheet__close, sheet__body, sheet__footer
// State classes: is-open, is-dragging, is-animating, is-closing,
// is-scroll-locked, has-footer, sheet--{size}
// Body classes: yp-sheet-open, yp-sheet-popup
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createPortal } from 'react-dom';

// ── Drag-to-dismiss tuning constants (port จาก demo v7.7) ──
const DRAG = {
  ACTIVATION_THRESHOLD: 1,
  EDGE_RESISTANCE: 0.35,
  DRAG_CLOSE_RATIO: 0.28,
  FLING_VELOCITY: 500,
  FLING_CLOSE_RATIO: 0.10,
  BACKDROP_UPDATE_INTERVAL: 2,
};

const POPUP_MODE_MQ = '(min-width: 768px)';
const SHEET_BASE_Z = 18000;

let _sheetCount = 0;

// ═══════════════════════════════════════════════════════════════
// SCROLL LOCK (port จาก demo framework/scroll-lock.js)
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

  // กันอาการ "วาร์ปไปด้านบน แล้วค่อยเลื่อนกลับมา"
  html.style.scrollBehavior = 'auto';
  window.scrollTo(_savedScrollX, _savedScrollY);
  requestAnimationFrame(() => {
    html.style.scrollBehavior = '';
  });
}

// ═══════════════════════════════════════════════════════════════
// BottomSheet component
// ═══════════════════════════════════════════════════════════════

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** size variant */
  size?: 'auto' | 'tall' | 'full';
  /** dismissable — ปิดผ่าน backdrop/ESC/drag/back-button ได้ */
  dismissable?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'auto',
  dismissable = true,
}: BottomSheetProps) {
  // mounted: true เมื่อต้อง render portal (open=true หรือกำลัง closing animation)
  const [mounted, setMounted] = React.useState(false);
  // isOpen: true เมื่อ sheet อยู่ในสถานะเปิดเต็ม (เพื่อ trigger transition)
  const [isOpen, setIsOpen] = React.useState(false);
  // isClosing: true เมื่อกำลัง play close animation
  const [isClosing, setIsClosing] = React.useState(false);
  // popupMode: true เมื่อ desktop (≥768px)
  const [popupMode, setPopupMode] = React.useState(false);

  const backdropRef = React.useRef<HTMLDivElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const zRef = React.useRef<number>(SHEET_BASE_Z);
  // dragClosingRef: true เมื่อ drag-to-dismiss กำลัง play close animation
  // — ใช้ skip close animation ปกติใน React flow
  const dragClosingRef = React.useRef(false);
  // historyPushedRef: true เมื่อเรา push history state สำหรับ back button
  const historyPushedRef = React.useRef(false);
  // closedRef: true เมื่อ onClose ถูกเรียกแล้ว — กัน double-close
  const closedRef = React.useRef(false);

  // onCloseRef: stable ref สำหรับ onClose — กัน drag effect re-run
  // เมื่อ parent re-render สร้าง inline arrow ใหม่
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ── unique z-index for stacking ──
  React.useEffect(() => {
    _sheetCount++;
    zRef.current = SHEET_BASE_Z + _sheetCount * 10;
    return () => {
      _sheetCount = Math.max(0, _sheetCount - 1);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // OPEN/CLOSE STATE MACHINE
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    if (open) {
      // Open: mount + detect popup mode
      setMounted(true);
      closedRef.current = false;
      if (typeof window !== 'undefined') {
        setPopupMode(window.matchMedia(POPUP_MODE_MQ).matches);
      }
    } else {
      // Close
      if (mounted && !isClosing && !closedRef.current) {
        closedRef.current = true;
        if (dragClosingRef.current) {
          // drag-to-dismiss already played animation — just unmount
          // (drag handler will call onClose which already set open=false)
          dragClosingRef.current = false;
          setMounted(false);
          setIsOpen(false);
          setIsClosing(false);
        } else {
          // Play close animation
          setIsOpen(false);
          setIsClosing(true);
        }
      }
    }
  }, [open, mounted, isClosing]);

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

  // ── Body class management + scroll lock (เฉพาะตอน isOpen) ──
  React.useEffect(() => {
    if (!mounted || !isOpen || isClosing) return;

    document.body.classList.add('yp-sheet-open');
    if (popupMode) {
      document.body.classList.add('yp-sheet-popup');
    }
    lockScroll();

    return () => {
      document.body.classList.remove('yp-sheet-open');
      document.body.classList.remove('yp-sheet-popup');
      unlockScroll();
    };
  }, [mounted, isOpen, isClosing, popupMode]);

  // ── ESC handler ──
  React.useEffect(() => {
    if (!mounted || !open || !dismissable || isClosing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions);
    };
  }, [mounted, open, dismissable, isClosing]);

  // ── Back button (history) support ──
  React.useEffect(() => {
    if (!mounted || !open || !dismissable || isClosing) return;
    if (historyPushedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      window.history.pushState({ ypSheet: true }, '');
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
      if (e.target !== sheetRef.current) return;
      if (e.propertyName !== 'transform') return;
      if (isClosing) {
        setMounted(false);
        setIsClosing(false);
        setIsOpen(false);
      }
    },
    [isClosing]
  );

  // Safety timeout — in case transitionend doesn't fire
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
  // DRAG-TO-DISMISS (port จาก demo v7.7 — เฉพาะ mobile, ไม่ใช่ popup mode)
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    if (!mounted || !open || !dismissable || popupMode || isClosing) return;
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const bodyEl = bodyRef.current;
    if (!sheet || !backdrop || !bodyEl) return;

    // capture stable onClose
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
      prevMove: { y: number; t: number } | null;
      lastMove: { y: number; t: number };
      pendingY: number;
    } | null = null;
    let rafPending = false;
    let frameCounter = 0;
    let cachedSheetHeight = sheet.offsetHeight;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        cachedSheetHeight = entry.contentRect.height;
      }
    });
    ro.observe(sheet);

    const isInGripZone = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Node)) return false;
      const handle = sheet.querySelector('.sheet__handle');
      const header = sheet.querySelector('.sheet__header');
      return !!(handle && handle.contains(target)) ||
             !!(header && header.contains(target));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (sheet.classList.contains('is-closing')) return;
      if (sheet.classList.contains('is-animating')) return;

      const sheetHeight = cachedSheetHeight || sheet.offsetHeight;
      const startScrollTop = bodyEl.scrollTop;
      const isGripZone = isInGripZone(e.target);
      const startedAtTop = startScrollTop === 0;

      // v7.7: dynamic touch-action — set touch-action:none บน bodyEl ทันที
      if (isGripZone || startedAtTop) {
        bodyEl.style.touchAction = 'none';
      }

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
        prevMove: null,
        lastMove: { y: e.clientY, t: performance.now() },
        pendingY: e.clientY,
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

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      dragState.pendingY = e.clientY;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(applyDrag);
    };

    const applyDrag = () => {
      rafPending = false;
      if (!dragState) return;
      const clientY = dragState.pendingY;
      const dy = clientY - dragState.startY;
      const canDragDown = dragState.isGripZone || dragState.startedAtTop;

      if (canDragDown && dy > 0) {
        if (!dragState.active && dy < DRAG.ACTIVATION_THRESHOLD) return;

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
          if (active && active !== document.body && typeof active.blur === 'function') {
            try {
              active.blur();
            } catch (_) {
              /* ignore */
            }
          }
        }

        dragState.prevMove = dragState.lastMove;
        dragState.lastMove = { y: clientY, t: performance.now() };

        const sheetHeight = dragState.sheetHeight;
        let dragY: number;
        if (dy <= sheetHeight) {
          dragY = dy;
        } else {
          const overshoot = dy - sheetHeight;
          dragY = sheetHeight + overshoot * DRAG.EDGE_RESISTANCE;
        }
        dragState.dragY = dragY;
        sheet.style.transform = 'translate3d(0, ' + dragY + 'px, 0)';

        frameCounter++;
        if (frameCounter >= DRAG.BACKDROP_UPDATE_INTERVAL) {
          frameCounter = 0;
          const dragProgress = Math.min(dragY / sheetHeight, 1);
          backdrop.style.opacity = (1 - dragProgress * 0.55).toString();
        }
        return;
      }

      if (dragState.active && dy <= 0) {
        dragState.prevMove = dragState.lastMove;
        dragState.lastMove = { y: clientY, t: performance.now() };
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
      rafPending = false;
      frameCounter = 0;
      bodyEl.style.touchAction = '';
      try {
        sheet.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      sheet.classList.remove('is-scroll-locked');

      if (!state.active) return;

      let velocity = 0;
      if (state.prevMove && state.lastMove) {
        const dt = state.lastMove.t - state.prevMove.t;
        if (dt > 0) {
          const dyMove = state.lastMove.y - state.prevMove.y;
          velocity = dyMove / (dt / 1000);
        }
      }

      const sheetHeight = state.sheetHeight;
      const dragThreshold = sheetHeight * DRAG.DRAG_CLOSE_RATIO;
      const flingThreshold = sheetHeight * DRAG.FLING_CLOSE_RATIO;
      const isFlingDown = velocity > DRAG.FLING_VELOCITY;
      const shouldClose =
        state.dragY > dragThreshold ||
        (isFlingDown && state.dragY > flingThreshold);

      sheet.classList.remove('is-dragging');

      if (shouldClose) {
        // ═══════════════════════════════════════════════════════════
        // DRAG-TO-CLOSE: add is-closing, animate to off-screen,
        // then call onClose() (which will skip React close animation
        // because dragClosingRef.current = true)
        // ═══════════════════════════════════════════════════════════
        dragClosingRef.current = true;
        sheet.classList.add('is-closing');

        const alreadyOffScreen = state.dragY >= sheetHeight;
        if (alreadyOffScreen) {
          sheet.style.transform = 'translate3d(0, ' + sheetHeight + 'px, 0)';
        } else {
          requestAnimationFrame(() => {
            sheet.style.transform = 'translate3d(0, ' + sheetHeight + 'px, 0)';
          });
        }

        const finish = () => {
          sheet.removeEventListener('transitionend', handler);
          if (safety) clearTimeout(safety);
          // ล้าง transform + is-closing เพื่อกันค้าง — React จะ unmount อยู่แล้ว
          // แต่ถ้า parent re-render ก่อน onClose ก็ยังไม่มีปัญหา
          closeSheet();
        };
        const handler = (ev: TransitionEvent) => {
          if (ev.target !== sheet || ev.propertyName !== 'transform') return;
          finish();
        };
        sheet.addEventListener('transitionend', handler);
        const safety = setTimeout(finish, 500);
      } else {
        // ═══════════════════════════════════════════════════════════
        // SNAP-BACK: spring bounce กลับสู่ตำแหน่งเดิม
        // ═══════════════════════════════════════════════════════════
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
      rafPending = false;
      frameCounter = 0;
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
  }, [mounted, open, dismissable, popupMode, isClosing]);

  // ═══════════════════════════════════════════════════════════════
  // v1.9.1: Safety net — ensure cleanup runs even if component unmounts
  // while still open (e.g., parent navigates away during animation)
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    return () => {
      // On unmount: defensive cleanup of body class + scroll lock
      // (these are no-ops if already cleaned up by the main effect)
      try {
        document.body.classList.remove('yp-sheet-open');
        document.body.classList.remove('yp-sheet-popup');
        // Force-decrement lockCount in case we unmounted while open
        // (the main effect's cleanup will have already done this, but
        // calling unlockScroll() again is safe — it's a no-op if count is 0)
        unlockScroll();
      } catch {
        // ignore — defensive only
      }
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  const backdropClass = `sheet-backdrop${isOpen && !isClosing ? ' is-open' : ''}`;
  const sheetClass =
    `sheet sheet--${size}` +
    `${footer ? ' has-footer' : ''}` +
    `${isOpen && !isClosing ? ' is-open' : ''}` +
    `${isClosing ? ' is-closing' : ''}`;
  const backdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dismissable) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className={backdropClass}
      style={{
        ['--sheet-z' as string]: zRef.current,
      }}
      onClick={backdropClick}
    >
      <div
        ref={sheetRef}
        className={sheetClass}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        onTransitionEnd={handleTransitionEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />

        {(title || dismissable) && (
          <div
            className="sheet__header"
            style={!title ? { marginBottom: 0 } : undefined}
          >
            {title ? (
              <div className="sheet__heading">
                <h2 className="sheet__title">{title}</h2>
                {description ? (
                  <p className="sheet__desc">{description}</p>
                ) : null}
              </div>
            ) : (
              <span className="sr-only" aria-hidden="true">
                Bottom sheet
              </span>
            )}
            {dismissable ? (
              <button
                type="button"
                className="sheet__close"
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
        )}

        <div
          ref={bodyRef}
          className="sheet__body"
          data-scrollable="true"
        >
          {children}
        </div>

        {footer ? <div className="sheet__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

/**
 * Convenience close button สำหรับใช้ใน sheet header (legacy compat)
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
      className="sheet__close"
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
