'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Sheet · BottomSheet (r50)
// ═══════════════════════════════════════════════════════════════
// Mobile-only bottom sheet — slide จากล่าง, drag-to-dismiss
//
// ★ r50 การแก้ปัญหาสำคัญ:
//   1. แยก BottomSheet ออกจาก Window/Modal โดยสมบูรณ์
//      - ก่อนหน้านี้ BottomSheet เป็น alias ของ Window type="sheet"
//      - ทำให้มี code path เดียวกัน ทำให้ bug ซับซ้อน
//      - ตอนนี้แยกไฟล์ + แยก CSS class ชัดเจน
//
//   2. แก้บั๊ก close animation "jump แทน slide"
//      สาเหตุเดิม: transition เปลี่ยนพร้อมกัน 2 ตัว (duration + easing)
//      บางครั้ง browser commit แบบ race ทำให้ transition ไม่ smooth
//      วิธีแก้:
//      - ใช้ CSS variable สำหรับ transition duration (single source)
//      - ใช้ ease-emphasized ตลอดทั้ง open และ close (consistent feel)
//      - เพิ่ม requestAnimationFrame ระหว่าง state change เพื่อ ensure
//        browser ได้ commit old state ก่อนเปลี่ยน new state
//
//   3. แยก CSS class namespace
//      - เดิม: .yp-window, .yp-window--sheet, .yp-window--modal
//      - ใหม่: .yp-sheet (mobile), .yp-popup (desktop — ไฟล์อื่น)
//      - ลดความสับสน แยกหน้าที่ชัดเจน
//
//   4. ลด complexity ของ state machine
//      - รวม isOpen/isClosing เป็น single 'phase' state
//      - ลด effect ที่ต้องดูแล
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  useOverlayStack,
  generateOverlayId,
  lockScroll,
  unlockScroll,
  SHEET_TIMING,
} from '../shared';
import { useSheetDrag } from './use-sheet-drag';

// ── Types ──

export type SheetSize = 'auto' | 'sm' | 'md' | 'tall' | 'full';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** size variant */
  size?: SheetSize;
  /** ปิดผ่าน backdrop/ESC/drag/back-button ได้ */
  dismissable?: boolean;
  /** ซ่อน grip handle */
  hideHandle?: boolean;
  /** ซ่อน close button อัตโนมัติ */
  hideCloseButton?: boolean;
  /** className เพิ่มเติม */
  className?: string;
}

// ── Phase state machine ──
// 'closed'    = unmounted
// 'mounting'  = mounted แต่ยังไม่ animate (รอ double rAF)
// 'open'      = visible + animated in
// 'closing'   = animating out (ยัง mounted)
type SheetPhase = 'closed' | 'mounting' | 'open' | 'closing';

export function BottomSheet({
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
  className,
}: BottomSheetProps) {
  // ── state ──
  const [phase, setPhase] = React.useState<SheetPhase>('closed');
  const [mounted, setMounted] = React.useState(false);

  // ── refs ──
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const overlayIdRef = React.useRef<string>('');
  const zIndexRef = React.useRef<number>(18000);
  const dragClosingRef = React.useRef(false);
  const historyPushedRef = React.useRef(false);
  const closedRef = React.useRef(false);

  // stable onClose ref
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ── register with overlay stack ──
  // ★ ใช้ mounted เป็น dep (ไม่ใช่ phase) เพื่อให้ stack register ตลอดทั้ง
  //   closing phase — ไม่งั้น body.yp-overlay-open ถูกลบก่อน close anim เสร็จ
  React.useEffect(() => {
    if (!mounted) return;
    if (!overlayIdRef.current) {
      overlayIdRef.current = generateOverlayId();
    }
    const entry = useOverlayStack.getState().register({
      id: overlayIdRef.current,
      type: 'sheet',
      dismissable,
      requestClose: () => onCloseRef.current(),
    });
    zIndexRef.current = entry.zIndex;

    return () => {
      if (overlayIdRef.current) {
        useOverlayStack.getState().unregister(overlayIdRef.current);
      }
    };
  }, [mounted, dismissable]);

  // ═══════════════════════════════════════════════════════════════
  // OPEN/CLOSE STATE MACHINE
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    if (open) {
      // open=true → mount + start opening
      if (phase === 'closed') {
        closedRef.current = false;
        setMounted(true);
        setPhase('mounting');
      }
    } else {
      // open=false → start closing (ถ้ายังไม่ closed)
      if (
        (phase === 'mounting' || phase === 'open') &&
        !closedRef.current
      ) {
        closedRef.current = true;

        if (dragClosingRef.current) {
          // drag-close จัดการ unmount เอง
          dragClosingRef.current = false;
          setPhase('closed');
          setMounted(false);
        } else {
          // ★ แก้ปัญหา "jump แทน slide":
          //   ใช้ requestAnimationFrame เพื่อ ensure browser ได้ commit
          //   phase='open' state ก่อนเปลี่ยนเป็น 'closing'
          //   ทำให้ transition ทำงานถูกต้อง (จาก open → closing)
          requestAnimationFrame(() => {
            setPhase('closing');
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── After mount → double rAF → trigger open transition ──
  React.useEffect(() => {
    if (phase !== 'mounting') return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setPhase('open');
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [phase]);

  // ── Body class + scroll lock ──
  // ★ dep เฉพาะ mounted (ไม่รวม phase) — กัน unlock ระหว่าง close anim
  React.useEffect(() => {
    if (!mounted) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [mounted]);

  // ── Back button (history) support ──
  React.useEffect(() => {
    if (phase !== 'open') return;
    if (!dismissable) return;
    if (historyPushedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      const urlSnapshot =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      window.history.pushState({ ypOverlay: true, ypUrl: urlSnapshot }, '');
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
        // ★ แก้ bug: ลิงก์ใน sheet กดแล้วไม่ไป — ตรวจ URL ก่อน history.back()
        const currentUrl =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        const storedUrl = window.history.state?.ypUrl;
        const urlChanged =
          typeof storedUrl === 'string' && currentUrl !== storedUrl;
        const stillAtSheetHistoryEntry =
          !!window.history.state &&
          window.history.state.ypOverlay === true &&
          !urlChanged;
        if (stillAtSheetHistoryEntry) {
          try {
            window.history.back();
          } catch (_) {
            /* ignore */
          }
        }
      }
    };
  }, [phase, dismissable]);

  // ═══════════════════════════════════════════════════════════════
  // CLOSE TRANSITION END — unmount after close animation
  // ═══════════════════════════════════════════════════════════════
  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== sheetRef.current) return;
      if (e.propertyName !== 'transform') return;
      if (phase === 'closing') {
        setPhase('closed');
        setMounted(false);
      }
    },
    [phase]
  );

  const handleBackdropTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== backdropRef.current) return;
      if (e.propertyName !== 'opacity' && e.propertyName !== 'visibility') return;
      if (phase === 'closing') {
        setPhase('closed');
        setMounted(false);
      }
    },
    [phase]
  );

  // Safety timeout — กัน transitionend ไม่ firing
  React.useEffect(() => {
    if (phase !== 'closing') return;
    const t = setTimeout(() => {
      setPhase('closed');
      setMounted(false);
    }, SHEET_TIMING.CLOSE_DURATION + 200);
    return () => clearTimeout(t);
  }, [phase]);

  // ═══════════════════════════════════════════════════════════════
  // DRAG-TO-DISMISS
  // ═══════════════════════════════════════════════════════════════
  const handleDragClose = React.useCallback(() => {
    onCloseRef.current();
  }, []);

  const setDragClosing = React.useCallback((v: boolean) => {
    dragClosingRef.current = v;
  }, []);

  useSheetDrag({
    sheetRef,
    backdropRef,
    bodyRef,
    open: phase === 'open',
    dismissable,
    isClosing: phase === 'closing',
    onDragClose: handleDragClose,
    setDragClosing,
  });

  // ── Cleanup on unmount ──
  React.useEffect(() => {
    return () => {
      try {
        unlockScroll();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  // ── Compute classes ──
  const showHandle = !hideHandle;
  const showHeader = !!title || (dismissable && !hideCloseButton);

  const rootClass = [
    'yp-sheet-root',
    `yp-sheet-root--${size}`,
    phase === 'open' ? 'is-open' : '',
    phase === 'closing' ? 'is-closing' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const sheetClass = [
    'yp-sheet',
    `yp-sheet--${size}`,
    footer ? 'has-footer' : '',
    phase === 'open' ? 'is-open' : '',
    phase === 'closing' ? 'is-closing' : '',
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
        ['--yp-sheet-z' as string]: zIndexRef.current,
      }}
      onClick={backdropClick}
      onTransitionEnd={handleBackdropTransitionEnd}
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
        {showHandle ? <div className="yp-sheet__handle" aria-hidden="true" /> : null}

        {showHeader ? (
          <div
            className="yp-sheet__header"
            style={!title ? { marginBottom: 0, justifyContent: 'flex-end' } : undefined}
          >
            {title ? (
              <div className="yp-sheet__heading">
                <h2 className="yp-sheet__title">{title}</h2>
                {description ? (
                  <p className="yp-sheet__desc">{description}</p>
                ) : null}
              </div>
            ) : (
              <span className="sr-only" aria-hidden="true">
                Bottom sheet
              </span>
            )}
            {dismissable && !hideCloseButton ? (
              <button
                type="button"
                className="yp-sheet__close"
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
          className="yp-sheet__body"
          data-scrollable="true"
        >
          {children}
        </div>

        {footer ? <div className="yp-sheet__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// Convenience close button (legacy compat)
// ═══════════════════════════════════════════════════════════════
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
      className="yp-sheet__close"
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
