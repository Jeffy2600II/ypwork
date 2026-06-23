// Path:    src/components/MobileTopbar.tsx
// Purpose: Mobile topbar (50px, dark) — brand + page title + filter button.

'use client';

import React from 'react';

interface MobileTopbarProps {
  title: string;
  onFilterClick?: () => void;
}

export function MobileTopbar({ title, onFilterClick }: MobileTopbarProps) {
  return (
    <header className="app-topbar-mobile">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="sb-badge">ypwork</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          aria-label="ตัวกรอง"
          style={{
            background: 'none', border: 'none', color: '#fff',
            fontSize: 18, cursor: 'pointer', padding: 8,
          }}
        >
          ⚙️
        </button>
      )}
    </header>
  );
}
