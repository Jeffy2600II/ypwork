// Path:    src/components/BottomNav.tsx
// Purpose: Mobile bottom nav (62px) — 4 tabs: calendar / tasks / create / profile.

'use client';

import React from 'react';
import { BOTTOM_NAV } from '@/lib/constants';

interface BottomNavProps {
  activeId: string;
  onItemClick: (id: string) => void;
}

export function BottomNav({ activeId, onItemClick }: BottomNavProps) {
  return (
    <nav className="app-bottomnav">
      <div className="app-bottomnav-inner">
        {BOTTOM_NAV.map(item => (
          <button
            key={item.id}
            className={`bn-item ${activeId === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.id)}
          >
            <span className="bn-item-icon-wrap">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
