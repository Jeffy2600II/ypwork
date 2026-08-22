'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Loading Components (Round 27, extended Round 31)
// ═══════════════════════════════════════════════════════════════
// Loading-state ownership — pick exactly ONE per operation:
//
//   1. AppLoading  — route-level (Next.js `loading.tsx` Suspense
//                    fallback only). Application/page initialization.
//   2. Spinner     — reusable inline spinner primitive. Used by
//                    AppLoading and by ButtonSpinner; not meant to
//                    be dropped standalone into page content.
//   3. ButtonSpinner + `.yp-btn--loading` — action-level loading,
//                    scoped to the button that triggered the action
//                    (Save / Delete / Submit / etc). Never pair this
//                    with a page or global spinner for the same
//                    operation.
//   4. showActionOverlay/hideActionOverlay — the ONE allowed
//                    exception to "stay inside React state": a
//                    full-screen transitional overlay for actions
//                    that intentionally end in a *hard* navigation
//                    (window.location), where the React tree is
//                    about to be torn down and can't reliably paint
//                    its own state before that happens. Implemented
//                    as a singleton (id-guarded) so it can never be
//                    created twice, and shares the same spinner
//                    visual language as AppLoading/Spinner so the
//                    transition reads as one continuous experience
//                    rather than two different loading UIs.
//
// Skeleton/shimmer (see skeleton.css) is for component-level
// loading only — data loading scoped to one card/section, not a
// whole page or a single action.
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';

// ── Spinner ─────────────────────────────────────────────────────

interface SpinnerProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Spinner({ size = 24, className = '', strokeWidth = 2.5 }: SpinnerProps) {
  return (
    <svg
      className={`yp-spinner ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── AppLoading — full-page loading screen ────────────────────────

interface AppLoadingProps {
  label?: string;
}

export function AppLoading({ label }: AppLoadingProps) {
  return (
    <div className="yp-app-loading" role="status" aria-live="polite">
      <div className="yp-app-loading-content">
        <Spinner size={36} strokeWidth={2.5} />
        {label && <p className="yp-app-loading-label">{label}</p>}
      </div>
    </div>
  );
}

// ── LoadingDots — subtle inline loading for buttons/small areas ──

export function LoadingDots({ size = 16 }: { size?: number }) {
  return (
    <span className="yp-loading-dots" style={{ width: size * 3, height: size }} aria-hidden="true">
      <span style={{ width: size, height: size }} />
      <span style={{ width: size, height: size }} />
      <span style={{ width: size, height: size }} />
    </span>
  );
}

// ── ButtonSpinner — action-level loading, lives inside a button ──
// Round 31: pair with the `.yp-btn--loading` class (see buttons.css)
// rather than disabling the button and leaving it visually inert.
// Never trigger AppLoading/showActionOverlay for the same operation
// this represents — one action, one indicator.

export function ButtonSpinner({ size = 16 }: { size?: number }) {
  return <Spinner size={size} strokeWidth={2.5} className="yp-btn__spinner" />;
}

// ── Action overlay — singleton, DOM-based (Round 31) ─────────────
// For actions that deliberately end in a hard navigation
// (window.location.href/replace), where the component may unmount
// before React can commit its own loading UI. Guarded by element id
// so calling this twice (e.g. a double click, or a retry path) can
// never stack two overlays. Visually matches AppLoading/Spinner so
// it doesn't read as a second, different loading system.
//
// Do NOT use this for ordinary in-app async actions — those should
// use `.yp-btn--loading` (action-level) or a component-level
// skeleton instead. This exists only for the "screen is about to be
// torn down by a hard navigation" case.

const ACTION_OVERLAY_ID = 'yp-action-overlay';

export function showActionOverlay(label: string) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ACTION_OVERLAY_ID)) return; // already showing — never stack

  const overlay = document.createElement('div');
  overlay.id = ACTION_OVERLAY_ID;
  overlay.className = 'yp-action-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const content = document.createElement('div');
  content.className = 'yp-action-overlay__content';

  // Same spinner markup as <Spinner /> so the visual language matches
  // the rest of the loading system exactly (same stroke, same motion).
  content.innerHTML = `
    <svg class="yp-spinner" width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.2"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
    </svg>
  `;

  if (label) {
    const labelEl = document.createElement('p');
    labelEl.className = 'yp-action-overlay__label';
    labelEl.textContent = label;
    content.appendChild(labelEl);
  }

  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

export function hideActionOverlay() {
  if (typeof document === 'undefined') return;
  document.getElementById(ACTION_OVERLAY_ID)?.remove();
}
