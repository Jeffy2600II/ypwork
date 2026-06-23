// Path:    src/context/ToastContext.tsx
// Purpose: Global toast notifications — auto-dismiss after 4.5s.

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ToastItem, ToastKind } from '@/lib/types';

type ToastCtx = {
  toasts: ToastItem[];
  showToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastCtx>({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, kind }]);
    setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.kind === 'error' ? 'toast-error' : t.kind === 'info' ? 'toast-info' : ''}`}
            onClick={() => dismissToast(t.id)}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
