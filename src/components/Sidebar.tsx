// Path:    src/components/Sidebar.tsx
// Purpose: Desktop sidebar (240px, dark) — shown only >= 861px.
//          Contains: brand, main nav, my-tasks toggle, categories list.

'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCategory } from '@/modules/category-manager';
import { useTaskEngine } from '@/modules/task-engine';
import { SIDEBAR_NAV } from '@/lib/constants';

interface SidebarProps {
  activeNav: string;
  onNavClick: (id: string) => void;
  activeCategoryId: string | 'all';
  onCategoryClick: (id: string | 'all') => void;
  onlyMine: boolean;
  onOnlyMineChange: (v: boolean) => void;
  onCreateClick: () => void;
  onAddCategory: () => void;
}

export function Sidebar({
  activeNav, onNavClick,
  activeCategoryId, onCategoryClick,
  onlyMine, onOnlyMineChange,
  onCreateClick, onAddCategory,
}: SidebarProps) {
  const { user } = useAuth();
  const { categories } = useCategory();
  const { tasks } = useTaskEngine();

  // Count tasks per category
  const countByCategory = (catId: string) => tasks.filter(t => t.category_id === catId).length;

  const initials = user?.full_name
    ? user.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="app-sidebar">
      {/* Brand + user */}
      <div className="sb-section" style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, paddingBottom: 20 }}>
        <span className="sb-badge">ypwork</span>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ color: 'var(--sb-text-hi)', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name ?? 'สมาชิก'}
          </div>
          <div style={{ color: 'var(--sb-text)', fontSize: 11 }}>
            ปีการศึกษา {user?.year ?? '-'}
          </div>
        </div>
        <div className="avatar avatar-sm" style={{ width: 30, height: 30, fontSize: 10.5, position: 'relative' }}>
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user?.full_name ?? 'avatar'}
              fill
              unoptimized
              style={{ objectFit: 'cover' }}
            />
          ) : initials}
        </div>
      </div>

      {/* Main nav */}
      <div className="sb-section">
        <div className="sb-section-label">เมนูหลัก</div>
        {SIDEBAR_NAV.map(item => (
          <a
            key={item.id}
            className={`sb-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => onNavClick(item.id)}
          >
            <span className="sb-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
        <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={onCreateClick}>
          <span>➕</span>
          <span>สร้างงานใหม่</span>
        </button>
      </div>

      {/* Quick filter: my tasks */}
      <div className="sb-section">
        <div className="sb-section-label">ตัวกรองด่วน</div>
        <label className="sb-item" style={{ cursor: 'pointer' }}>
          <span className="sb-item-icon">☑️</span>
          <span style={{ flex: 1 }}>งานของฉัน</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={e => onOnlyMineChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </label>
      </div>

      {/* Categories */}
      <div className="sb-section" style={{ flex: 1 }}>
        <div className="sb-section-label">หมวดหมู่</div>
        <a
          className={`sb-item ${activeCategoryId === 'all' ? 'active' : ''}`}
          onClick={() => onCategoryClick('all')}
        >
          <span className="sb-item-icon">🗂️</span>
          <span style={{ flex: 1 }}>ทั้งหมด</span>
          <span style={{ fontSize: 11, color: 'var(--sb-text)' }}>{tasks.length}</span>
        </a>
        {categories.map(cat => (
          <a
            key={cat.id}
            className={`sb-item ${activeCategoryId === cat.id ? 'active' : ''}`}
            onClick={() => onCategoryClick(cat.id)}
          >
            <span className="sb-item-icon">{cat.icon}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cat.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--sb-text)' }}>
              {countByCategory(cat.id)}
            </span>
          </a>
        ))}
        <a className="sb-item" onClick={onAddCategory} style={{ color: 'var(--sb-text)' }}>
          <span className="sb-item-icon">➕</span>
          <span>เพิ่มหมวดหมู่</span>
        </a>
      </div>
    </aside>
  );
}
