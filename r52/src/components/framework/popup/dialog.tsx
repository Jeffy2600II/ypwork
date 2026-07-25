'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Popup · Dialog (r50)
// ═══════════════════════════════════════════════════════════════
// Desktop-only centered modal dialog
//
// ★ r50: แยกออกจาก BottomSheet โดยสมบูรณ์
//   - Sheet (mobile) และ Popup (desktop) เป็นคนละระบบ
//   - ไม่มี shared code path ที่ทำให้เกิด bug ซับซ้อน
//   - CSS class แยก: .yp-popup vs .yp-sheet
//   - ใช้ adaptive overlay เป็นตัวเลือกว่าจะใช้อันไหน
//
// คุณสมบัติ:
//   ✓ Centered modal บน desktop
//   ✓ Backdrop fade animation
//   ✓ Scale + fade entrance (Material 3 / Apple style)
//   ✓ ESC / backdrop click / back-button ปิดได้
//   ✓ Nested popups รองรับ (ผ่าน overlay stack)
//   ✓ Scroll lock (count-based)
//   ✓ Reduced-motion friendly
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  useOverlayStack,
  generateOverlayId,
  lockScroll,
  unlockScroll,
  POPUP_TIMING,
} from '../shared';

// ── Types ──

export type PopupSize = 'auto' | 'sm' | 'md' | 'lg' | 'full';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** size variant */
  size?: PopupSize;
  /** ปิดผ่าน backdrop/ESC ได้ */
  dismissable?: boolean;
  /** ซ่อน close button อัตโนมัติ */
  hideCloseButton?: boolean;
  /** className เพิ่มเติม */
  className?: string;
}

// ── Phase state machine ──
type PopupPhase = 'closed' | 'mounting' | 'open' | 'closing';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'auto',
  dismissable = true,
  hideCloseButton = false,
  className,
}: DialogProps) {
  // ── state ──
  const [phase, setPhase] = React.useState<PopupPhase>('closed');
  const [mounted, setMounted] = React.useState(false);

  // ── refs ──
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const overlayIdRef = React.useRef<string>('');
  const zIndexRef = React.useRef<number>(18000);
  const historyPushedRef = React.useRef(false);
  const closedRef = React.useRef(false);

  // stable onClose ref
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ── register with overlay stack ──
  React.useEffect(() => {
    if (!mounted) return;
    if (!overlayIdRef.current) {
      overlayIdRef.current = generateOverlayId();
    }
    const entry = useOverlayStack.getState().register({
      id: overlayIdRef.current,
      type: 'popup',
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
      if (phase === 'closed') {
        closedRef.current = false;
        setMounted(true);
        setPhase('mounting');
      }
    } else {
      if (
        (phase === 'mounting' || phase === 'open') &&
        !closedRef.current
      ) {
        closedRef.current = true;
        requestAnimationFrame(() => {
          setPhase('closing');
        });
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
  React.useEffect(() => {
    if (!mounted) return;
    document.body.classList.add('yp-popup-open');
    lockScroll();
    return () => {
      document.body.classList.remove('yp-popup-open');
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
        const currentUrl =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        const storedUrl = window.history.state?.ypUrl;
        const urlChanged =
          typeof storedUrl === 'string' && currentUrl !== storedUrl;
        const stillAtPopupHistoryEntry =
          !!window.history.state &&
          window.history.state.ypOverlay === true &&
          !urlChanged;
        if (stillAtPopupHistoryEntry) {
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
  // CLOSE TRANSITION END
  // ═══════════════════════════════════════════════════════════════
  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== popupRef.current) return;
      if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
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

  // Safety timeout
  React.useEffect(() => {
    if (phase !== 'closing') return;
    const t = setTimeout(() => {
      setPhase('closed');
      setMounted(false);
    }, POPUP_TIMING.CLOSE_DURATION + 200);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Cleanup on unmount ──
  React.useEffect(() => {
    return () => {
      try {
        document.body.classList.remove('yp-popup-open');
        unlockScroll();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  // ── Compute classes ──
  const showHeader = !!title || (dismissable && !hideCloseButton);

  const rootClass = [
    'yp-popup-root',
    `yp-popup-root--${size}`,
    phase === 'open' ? 'is-open' : '',
    phase === 'closing' ? 'is-closing' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const popupClass = [
    'yp-popup',
    `yp-popup--${size}`,
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
        ['--yp-popup-z' as string]: zIndexRef.current,
      }}
      onClick={backdropClick}
      onTransitionEnd={handleBackdropTransitionEnd}
    >
      <div
        ref={popupRef}
        className={popupClass}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onTransitionEnd={handleTransitionEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader ? (
          <div className="yp-popup__header">
            {title ? (
              <div className="yp-popup__heading">
                <h2 className="yp-popup__title">{title}</h2>
                {description ? (
                  <p className="yp-popup__desc">{description}</p>
                ) : null}
              </div>
            ) : (
              <span className="sr-only" aria-hidden="true">
                Dialog
              </span>
            )}
            {dismissable && !hideCloseButton ? (
              <button
                type="button"
                className="yp-popup__close"
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

        <div className="yp-popup__body" data-scrollable="true">
          {children}
        </div>

        {footer ? <div className="yp-popup__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
