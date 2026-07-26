'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Popup · FullscreenOverlay (r50)
// ═══════════════════════════════════════════════════════════════
// Fullscreen overlay — เหมือนเปิดหน้าใหม่ แต่ lightweight
// ใช้ได้ทั้งบนมือถือและ desktop (ถือว่าเป็น overlay ประเภทพิเศษ)
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

export interface FullscreenOverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** ปิดผ่าน backdrop/ESC ได้ */
  dismissable?: boolean;
  /** ใช้สำหรับ fullscreen — ถ้า true จะไม่มี padding/margin */
  bare?: boolean;
  /** className เพิ่มเติม */
  className?: string;
}

type FullscreenPhase = 'closed' | 'mounting' | 'open' | 'closing';

export function FullscreenOverlay({
  open,
  onClose,
  title,
  children,
  dismissable = true,
  bare = false,
  className,
}: FullscreenOverlayProps) {
  const [phase, setPhase] = React.useState<FullscreenPhase>('closed');
  const [mounted, setMounted] = React.useState(false);

  const backdropRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
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
      type: 'fullscreen',
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
    lockScroll();
    return () => {
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
      if (e.target !== overlayRef.current) return;
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
    }, SHEET_TIMING.CLOSE_DURATION + 200);
    return () => clearTimeout(t);
  }, [phase]);

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

  const rootClass = [
    'yp-fullscreen-root',
    phase === 'open' ? 'is-open' : '',
    phase === 'closing' ? 'is-closing' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const overlayClass = [
    'yp-fullscreen',
    bare ? 'is-bare' : '',
    phase === 'open' ? 'is-open' : '',
    phase === 'closing' ? 'is-closing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      ref={backdropRef}
      className={rootClass}
      style={{
        ['--yp-fullscreen-z' as string]: zIndexRef.current,
      }}
      onTransitionEnd={handleBackdropTransitionEnd}
    >
      <div
        ref={overlayRef}
        className={overlayClass}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Fullscreen overlay'}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
