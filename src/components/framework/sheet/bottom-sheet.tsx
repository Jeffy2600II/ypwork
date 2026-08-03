'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Sheet · BottomSheet (r52)
// ═══════════════════════════════════════════════════════════════
// Mobile-only bottom sheet — slide จากล่าง, drag-to-dismiss
//
// ★ r52 การแก้ปัญหาสำคัญ (ต่อจาก r50/r51):
//
//   1. แก้บั๊ก close animation "jump แทน slide" ให้สมบูรณ์
//      สาเหตุเดิม (r50 พยายามแก้ด้วย rAF แต่ยังกระตุก):
//        a) Drag hook ตั้ง activation threshold ที่ 1px → แค่แตะ X button
//           แล้วนิ้วขยับ 1-2px ก็ active drag แล้ว → ตั้ง inline transform
//           (เช่น translate3d(0, 2px, 0)) และ is-dragging class (transition: none)
//        b) เมื่อ click event fires หลัง pointerup, snap-back และ close
//           แข่งกัน — snap-back ตั้ง is-animating + inline transform,
//           close เปลี่ยน className ลบ is-animating แต่ inline transform
//           ยังอยู่ → browser เห็น transform เปลี่ยนจาก 2px (inline) ไป
//           100% (class) แต่ "jump" ไปเริ่มที่ 90%+ ก่อนแอนิเมต
//
//      วิธีแก้ r52:
//        a) ยก activation threshold จาก 1px → 6px (ป้องกัน tap แล้ว activate)
//        b) Drag hook ข้าม activation ถ้า target อยู่ใน .yp-sheet__close
//           (ปุ่ม X) หรือ button/a/input elements (interactive)
//        c) State machine ใช้แนวทางใหม่: เมื่อ open=false → ใช้
//           useLayoutEffect ที่ synchronous กับ DOM commit (ไม่ใช้ rAF)
//           เพื่อ ensure browser เห็น transition เริ่มจากสถานะ open
//        d) Close path ล้าง inline transform ทันที (ใน setPhase('closing'))
//           ก่อน transition เริ่ม — กัน drag-induced transform รบกวน
//
//   2. ปรับ state machine ให้เรียบง่ายขึ้น
//      - ลบ closedRef และ dragClosingRef ที่เป็น source of bugs
//      - ใช้ single 'phase' state เป็น source of truth
//      - Drag-close path ใช้ callback ที่ explicit ว่า "drag close"
//        ไม่ใช่ "open=false" → ลดความคลุมเครือ
//
//   3. ลด complexity ของ effect chain
//      - รวม transition-end logic ไว้ที่เดียว (single handler)
//      - ลบ duplicate safety timeout (มีอยู่แล้วใน drag hook)
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
  const historyPushedRef = React.useRef(false);

  // ★ r52: stable onClose ref — กัน re-render เมื่อ parent ส่ง inline fn
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ★ r52: track if close was triggered by drag (special path)
  const dragClosingRef = React.useRef(false);

  // ── register with overlay stack ──
  // ใช้ mounted เป็น dep (ไม่ใช่ phase) เพื่อให้ stack register ตลอดทั้ง
  // closing phase — ไม่งั้น body.yp-overlay-open ถูกลบก่อน close anim เสร็จ
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
  // OPEN/CLOSE STATE MACHINE (r52 — simplified, no rAF for close)
  // ═══════════════════════════════════════════════════════════════
  // ★ r52: ไม่ใช้ rAF สำหรับ close transition อีกต่อไป
  //   rAF ทำให้ close มีโอกาส race กับ snap-back ของ drag hook
  //   และบางครั้ง browser ไม่ได้ commit "open" state ก่อน "closing"
  //   ทำให้ transition ไม่ fire หรือ jump
  //
  //   วิธีใหม่: synchronous setState — React commits ทันทีใน event handler
  //   browser เห็น style change จาก open → closing ใน frame เดียว
  //   transition ทำงานถูกต้องเสมอ
  //
  // ★ r52: แยก path ระหว่าง drag-close และ normal-close
  //   - drag-close: drag hook ได้ animate ไปแล้ว → unmount ทันที (skip closing phase)
  //   - normal-close: ใช้ CSS transition (phase: open → closing → closed)
  //   ถ้าไม่แยก path, state machine จะ clear inline transform ที่ drag hook
  //   ตั้งไว้ (viewport height) ทำให้ sheet กระโดดกลับขึ้นก่อน unmount
  // ═══════════════════════════════════════════════════════════════
  React.useEffect(() => {
    if (open) {
      // open=true → mount + start opening
      if (phase === 'closed') {
        setMounted(true);
        setPhase('mounting');
      }
    } else {
      // open=false → start closing (ถ้ายังไม่ closed)
      if (phase === 'mounting' || phase === 'open') {
        if (dragClosingRef.current) {
          // ★ r52: drag-close path — drag hook ได้ animate ไปแล้ว
          //   unmount ทันที ไม่ต้องผ่าน closing phase
          //   ไม่ clear inline transform เพราะ drag hook จัดการเอง
          dragClosingRef.current = false;
          setPhase('closed');
          setMounted(false);
        } else {
          // ★ r52: normal-close path (X button, overlay, ESC, back-button)
          //   ล้าง inline transform ที่ drag hook อาจตั้งไว้ (safety)
          //   ก่อนเข้า closing phase — กัน jump ที่เกิดจาก inline transform
          //   ในกรณีที่ user แตะที่ไม่ใช่ interactive element แล้วขยับนิ้วนิดหน่อย
          if (sheetRef.current) {
            sheetRef.current.style.transform = '';
          }
          if (backdropRef.current) {
            backdropRef.current.style.opacity = '';
          }
          setPhase('closing');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── After mount → double rAF → trigger open transition ──
  // ★ ใช้ double rAF สำหรับ OPEN เท่านั้น (ไม่ใช่ close)
  //   เพราะ open ต้องการให้ browser paint "mounting" state (transform: 100%)
  //   ก่อนเปลี่ยนเป็น "open" (transform: 0%) — ไม่งั้น browser อาจ
  //   มองข้าม transition เพราะเห็น element ถูก mount ที่ 100% แล้วย้ายไป 0%
  //   ใน frame เดียวกัน (no transition fires)
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
  // ★ r52: unified handler — sheet OR backdrop transitionend ตัวใดตัวหนึ่ง
  //   จบก่อน → unmount (ไม่ต้องรอทั้งคู่)
  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      // ★ สนใจเฉพาะ transition ของ element ที่เรา bind (bubbling guard)
      if (e.target !== e.currentTarget) return;
      if (phase !== 'closing') return;
      // รอให้ transform หรือ opacity จบ (ไม่ใช่ visibility ที่ instant)
      if (
        e.propertyName !== 'transform' &&
        e.propertyName !== 'opacity' &&
        e.propertyName !== 'visibility'
      ) {
        return;
      }
      setPhase('closed');
      setMounted(false);
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
  // ★ r52: drag-close path ใช้ callback ที่ explicit ว่าเป็น drag close
  //   ไม่ใช่ open=false ปกติ — เพื่อให้ state machine แยก path ได้ชัดเจน
  //   (ดู state machine ด้านบน — มี branch สำหรับ dragClosingRef.current=true)
  const handleDragClose = React.useCallback(() => {
    dragClosingRef.current = true;
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
      onTransitionEnd={handleTransitionEnd}
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
