// Path:    src/components/FilterBar.tsx
// Purpose: Filter Bar — sits above main content.
//          Contains: search, type, status, priority, category, my-tasks toggle.

'use client';

import React from 'react';
import { useFilter } from '@/modules/filter-system';
import { useCategory } from '@/modules/category-manager';
import {
  FILTER_TYPE_OPTIONS,
  FILTER_STATUS_OPTIONS,
  FILTER_PRIORITY_OPTIONS,
} from '@/lib/constants';

interface FilterBarProps {
  /** Compact mode = icon-only (mobile) */
  compact?: boolean;
}

export function FilterBar({ compact = false }: FilterBarProps) {
  const { filters, setFilter, resetFilters, activeCount } = useFilter();
  const { categories } = useCategory();

  return (
    <div>
      <div className="filter-bar">
        {!compact && (
          <input
            type="text"
            placeholder="ค้นหางาน..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        )}
        <select
          value={filters.type}
          onChange={e => setFilter('type', e.target.value as typeof filters.type)}
          aria-label="ประเภท"
        >
          {FILTER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value as typeof filters.status)}
          aria-label="สถานะ"
        >
          {FILTER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.priority}
          onChange={e => setFilter('priority', e.target.value as typeof filters.priority)}
          aria-label="ความสำคัญ"
        >
          {FILTER_PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.categoryId}
          onChange={e => setFilter('categoryId', e.target.value as typeof filters.categoryId)}
          aria-label="หมวดหมู่"
        >
          <option value="all">หมวดหมู่: ทั้งหมด</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <label className="toggle" title="เฉพาะงานของฉัน">
          <input
            type="checkbox"
            checked={filters.onlyMine}
            onChange={e => setFilter('onlyMine', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        {activeCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
            ล้าง ({activeCount})
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {filters.search && (
            <span className="filter-chip" onClick={() => setFilter('search', '')}>
              ค้นหา: &quot;{filters.search}&quot; <span className="filter-chip-close">×</span>
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="filter-chip" onClick={() => setFilter('type', 'all')}>
              {FILTER_TYPE_OPTIONS.find(o => o.value === filters.type)?.label} <span className="filter-chip-close">×</span>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="filter-chip" onClick={() => setFilter('status', 'all')}>
              {FILTER_STATUS_OPTIONS.find(o => o.value === filters.status)?.label} <span className="filter-chip-close">×</span>
            </span>
          )}
          {filters.priority !== 'all' && (
            <span className="filter-chip" onClick={() => setFilter('priority', 'all')}>
              {FILTER_PRIORITY_OPTIONS.find(o => o.value === filters.priority)?.label} <span className="filter-chip-close">×</span>
            </span>
          )}
          {filters.categoryId !== 'all' && (
            <span className="filter-chip" onClick={() => setFilter('categoryId', 'all')}>
              {categories.find(c => c.id === filters.categoryId)?.name ?? 'หมวดหมู่'} <span className="filter-chip-close">×</span>
            </span>
          )}
          {filters.onlyMine && (
            <span className="filter-chip" onClick={() => setFilter('onlyMine', false)}>
              งานของฉัน <span className="filter-chip-close">×</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
