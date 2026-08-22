'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Loading Components (Round 27)
// ═══════════════════════════════════════════════════════════════
// Two loading patterns:
//   1. AppLoading — full-page spinner for initial/page-level loading
//   2. Spinner — reusable inline spinner
//
// Usage:
//   <AppLoading /> — full page
//   <Spinner size={24} /> — inline
//
// Skeleton/shimmer is for component-level loading only.
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
