// Path:    src/modules/filter-system/index.ts
// Purpose: FilterSystem — Module #4 of 6 Core Modules.
//          Manages filter state (search, type, status, priority, category, onlyMine).
//          Dispatches ypwork:filter-changed event when filters change.

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { FilterState, FilterChangedEventDetail } from '@/lib/types';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  type: 'all',
  status: 'all',
  priority: 'all',
  categoryId: 'all',
  onlyMine: false,
};

type FilterCtx = {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeCount: number;
};

const FilterContext = createContext<FilterCtx>({
  filters: DEFAULT_FILTERS,
  setFilter: () => {},
  resetFilters: () => {},
  activeCount: 0,
});

export function useFilter() { return useContext(FilterContext); }

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Dispatch filter-changed event whenever filters change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detail: FilterChangedEventDetail = { activeFilters: filters };
    window.dispatchEvent(new CustomEvent('ypwork:filter-changed', { detail }));
  }, [filters]);

  const activeCount = [
    filters.search !== '',
    filters.type !== 'all',
    filters.status !== 'all',
    filters.priority !== 'all',
    filters.categoryId !== 'all',
    filters.onlyMine,
  ].filter(Boolean).length;

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, activeCount }}>
      {children}
    </FilterContext.Provider>
  );
}

export const FilterSystemAPI = Object.freeze({
  useFilter,
  EVENTS: Object.freeze({
    FILTER_CHANGED: 'ypwork:filter-changed',
  }),
} as const);
