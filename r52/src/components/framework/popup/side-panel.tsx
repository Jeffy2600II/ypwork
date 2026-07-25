'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Popup · SidePanel (r50)
// ═══════════════════════════════════════════════════════════════
// Desktop-only slide-in side panel
//
// ใช้สำหรับเนื้อหาที่ต้องการพื้นที่มากกว่า popup แต่ไม่ต้องการจอเต็ม
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  useOverlayStack,
  generateOverlayId,
  lockScroll,
  unlockScroll,
  SIDEPANEL_TIMING,
} from '../shared';

export type SidePanelSide = 'left' | 'right';

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** side — default 'right' */
  side?: SidePanelSide;
  /** ปิดผ่าน backdrop/ESC ได้ */
  dismissable?: boolean;
  /** ซ่อน close button */
  hideCloseButton?: boolean;
  /** className เพิ่มเติม */
  className?: string;
}

type SidePanelPhase = 'closed' | 'mounting' | 'open' | 'closing';

export function SidePanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  dismissable = true,
  hideCloseButton = false,
  className,
}: SidePanelProps) {
  const [phase, setPhase] = React.useState<SidePanelPhase>('closed');
  const [mounted, setMounted] = React.useState(false);

  const backdropRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const overlayIdRef = React.useRef<string>('');
  const zIndexRef = React.useRef<number>(18000);
  const historyPushedRef = React.useRef(false);
  const closedRef = React.useRef(false);

  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!mounted) return;
    if (!overlayIdRef.current) {
      overlayIdRef.current = generateOverlayId();
    }
    const entry = useOverlayStack.getState().register({
      id: overlayIdRef.current,
      type: 'sidepanel',
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

  React.useEffect(() => {
    if (!mounted) return;
    document.body.classList.add('yp-popup-open');
    lockScroll();
    return () => {
      document.body.classList.remove('yp-popup-open');
      unlockScroll();
    };
  }, [mounted]);

  // ── Back button support ──
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
        const stillAtHistoryEntry =
          !!window.history.state &&
          window.history.state.ypOverlay === true &&
          !urlChanged;
        if (stillAtHistoryEntry) {
          try {
            window.history.back();
          } catch (_) {
            /* ignore */
          }
        }
      }
    };
  }, [phase, dismissable]);

  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== panelRef.current) return;
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

  React.useEffect(() => {
    if (phase !== 'closing') return;
    const t = setTimeout(() => {
      setPhase('closed');
      setMounted(false);
    }, SIDEPANEL_TIMING.CLOSE_DURATION + 200);
    return () => clearTimeout(t);
  }, [phase]);

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

  const showHeader = !!title || (dismissable && !hideCloseButton);

  const rootClass = [
    'yp-sidepanel-root',
    `yp-sidepanel-root--${side}`,
    phase === 'open' ? 'is-open' : '',
    phase === 'closing' ? 'is-closing' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const panelClass = [
    'yp-sidepanel',
    `yp-sidepanel--${side}`,
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
        ['--yp-sidepanel-z' as string]: zIndexRef.current,
      }}
      onClick={backdropClick}
      onTransitionEnd={handleBackdropTransitionEnd}
    >
      <div
        ref={panelRef}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Side panel'}
        onTransitionEnd={handleTransitionEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader ? (
          <div className="yp-sidepanel__header">
            {title ? (
              <div className="yp-sidepanel__heading">
                <h2 className="yp-sidepanel__title">{title}</h2>
                {description ? (
                  <p className="yp-sidepanel__desc">{description}</p>
                ) : null}
              </div>
            ) : (
              <span className="sr-only" aria-hidden="true">
                Side panel
              </span>
            )}
            {dismissable && !hideCloseButton ? (
              <button
                type="button"
                className="yp-sidepanel__close"
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

        <div className="yp-sidepanel__body" data-scrollable="true">
          {children}
        </div>

        {footer ? <div className="yp-sidepanel__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
