// Path:    src/modules/view-renderer/index.ts
// Purpose: ViewRenderer — Module #2 of 6 Core Modules.
//          Manages active view state (month/week/day/kanban).
//          Dispatches ypwork:view-changed.

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ViewName, ViewChangedEventDetail } from '@/lib/types';

type ViewCtx = {
  view: ViewName;
  setView: (v: ViewName) => void;
};

const ViewContext = createContext<ViewCtx>({
  view: 'month',
  setView: () => {},
});

export function useView() { return useContext(ViewContext); }

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<ViewName>('month');

  const setView = useCallback((v: ViewName) => {
    setViewState(v);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detail: ViewChangedEventDetail = { view };
    window.dispatchEvent(new CustomEvent('ypwork:view-changed', { detail }));
  }, [view]);

  return (
    <ViewContext.Provider value={{ view, setView }}>
      {children}
    </ViewContext.Provider>
  );
}

export const ViewRendererAPI = Object.freeze({
  useView,
  EVENTS: Object.freeze({
    VIEW_CHANGED: 'ypwork:view-changed',
  }),
} as const);
