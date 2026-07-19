'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · TourSpotlight (v2.0.0)
// ═══════════════════════════════════════════════════════════════
// แสดง spotlight overlay + tooltip สำหรับ tutorial แบบเน้นจุด
// - ใช้ data-tour-target attribute บน element เพื่อระบุจุดที่จะเน้น
// - แสดง popover ใกล้ ๆ กับ element ที่เน้น
// - ปิดได้ด้วยปุ่ม X / คลิกนอก / กด Escape
// - mark tutorial seen เมื่อปิด → ไม่รบกวนซ้ำ
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';
import { useTutorial } from '@/lib/hooks/use-tutorial';
import type { TutorialKey } from '@/lib/tutorial';

export interface TourSpotlightProps {
  /** tutorial key สำหรับบันทึกว่า "ดูแล้ว" */
  tourKey: TutorialKey | string;
  /** selector สำหรับหา element ที่จะเน้น — ใช้ data-tour-target="<value>" */
  target: string;
  /** หัวข้อ */
  title: React.ReactNode;
  /** เนื้อหา */
  content: React.ReactNode;
  /** ขนาด padding รอบ ๆ element ที่เน้น (px) — default 8 */
  padding?: number;
  /** บังคับแสดงแม้เคยดูแล้ว (debug / "ดูอีกครั้ง") — default false */
  force?: boolean;
  /** เรียกเมื่อ user ปิด tour */
  onClose?: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourSpotlight({
  tourKey,
  target,
  title,
  content,
  padding = 8,
  force = false,
  onClose,
}: TourSpotlightProps) {
  const { seen, markSeen } = useTutorial(tourKey);
  const [rect, setRect] = React.useState<TargetRect | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // ไม่แสดงถ้าเคยดูแล้ว (เว้นแต่ force=true)
  const shouldShow = force || !seen;

  // mount check (SSR safe)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // locate target element
  React.useEffect(() => {
    if (!shouldShow || !mounted) return;

    const findTarget = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour-target="${target}"]`
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: r.top - padding,
        left: r.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      } as TargetRect;
    };

    const update = () => {
      const r = findTarget();
      if (r) setRect(r);
    };

    update();
    // re-position on resize / scroll
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const interval = setInterval(update, 500); // fallback ถ้า layout shift
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      clearInterval(interval);
    };
  }, [shouldShow, mounted, target, padding]);

  // ESC to close
  React.useEffect(() => {
    if (!shouldShow || !rect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, rect]);

  const handleClose = React.useCallback(() => {
    markSeen();
    onClose?.();
  }, [markSeen, onClose]);

  if (!mounted || !shouldShow || !rect) return null;

  // tooltip position: ใต้ target (หรือบนถ้าไม่มีที่ใต้)
  const showBelow = rect.top + rect.height + 200 < window.innerHeight;
  const tooltipTop = showBelow
    ? rect.top + rect.height + 12
    : Math.max(12, rect.top - 200);
  const tooltipLeft = Math.max(
    12,
    Math.min(
      window.innerWidth - 320 - 12,
      rect.left + rect.width / 2 - 160
    )
  );

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {/* ── Spotlight mask (4 rectangles around target) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: rect.top,
          background: 'rgba(15, 23, 42, 0.55)',
          pointerEvents: 'auto',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: rect.top,
          left: 0,
          width: rect.left,
          height: rect.height,
          background: 'rgba(15, 23, 42, 0.55)',
          pointerEvents: 'auto',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left + rect.width,
          right: 0,
          height: rect.height,
          background: 'rgba(15, 23, 42, 0.55)',
          pointerEvents: 'auto',
        }}
      />
      <div
        aria-hidden="true"
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: rect.top + rect.height,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      />

      {/* ── Highlight ring around target ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: rect.top - 2,
          left: rect.left - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          borderRadius: 10,
          boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.55), 0 0 20px rgba(99, 102, 241, 0.6)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Tooltip card ── */}
      <div
        role="dialog"
        aria-label={typeof title === 'string' ? title : 'Tutorial tooltip'}
        style={{
          position: 'absolute',
          top: tooltipTop,
          left: tooltipLeft,
          width: 320,
          maxWidth: 'calc(100vw - 24px)',
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.24)',
          padding: '14px 16px 12px',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: '0.95em',
              fontWeight: 700,
              color: '#1E293B',
              flex: 1,
              lineHeight: 1.4,
            }}
          >
            {title}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="ปิด"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 0,
              display: 'inline-flex',
              flexShrink: 0,
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div
          style={{
            fontSize: '0.88em',
            lineHeight: 1.6,
            color: '#334155',
          }}
        >
          {content}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(to right, #4F46E5, #7C3AED)',
              color: '#FFFFFF',
              fontSize: '0.85em',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            เข้าใจแล้ว
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
