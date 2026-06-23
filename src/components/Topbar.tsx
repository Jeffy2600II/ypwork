// Path:    src/components/Topbar.tsx
// Purpose: Desktop topbar (52px, blur, sticky) — page title + view tabs + search.

'use client';

import React from 'react';
import { useView } from '@/modules/view-renderer';
import { VIEW_TABS } from '@/lib/constants';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onSearch: (q: string) => void;
  searchValue: string;
}

export function Topbar({ title, subtitle, onSearch, searchValue }: TopbarProps) {
  const { view, setView } = useView();

  return (
    <header className="app-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0, flex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ fontSize: 18 }}>{title}</h1>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {VIEW_TABS.map(t => (
            <button
              key={t.id}
              className={`tab ${view === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <input
          type="text"
          placeholder="ค้นหางาน..."
          value={searchValue}
          onChange={e => onSearch(e.target.value)}
          style={{ width: 220, padding: '9px 14px', fontSize: 13 }}
        />
      </div>
    </header>
  );
}
