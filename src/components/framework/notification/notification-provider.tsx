'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Notification System (Round 27)
// ═══════════════════════════════════════════════════════════════
// Centralized notification framework.
// Two positions: bottom (capsule/pill) and top (floating card).
//
// Usage:
//   const { notify } = useNotification();
//   notify.success('บันทึกสำเร็จ');
//   notify.error('เกิดข้อผิดพลาด');
//   notify.info('กำลังโหลดข้อมูล');
//   notify.warning('กรุณาตรวจสอบข้อมูล');
//   notify.top('สิ่งสำคัญ', { type: 'warning', duration: 5000 });
//
// Architecture principle:
//   One provider, one hook, two visual variants.
//   Pages call notify.* — they don't manage notification UI.
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';

// ── Types ──────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type NotificationPosition = 'bottom' | 'top';

export interface NotificationOptions {
  /** Position — default: 'bottom' */
  position?: NotificationPosition;
  /** Duration in ms — default: 3000 for bottom, 5000 for top */
  duration?: number;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Prevent auto-dismiss */
  persistent?: boolean;
}

interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  position: NotificationPosition;
  duration: number;
  action?: { label: string; onClick: () => void };
  persistent: boolean;
  isExiting: boolean;
}

interface NotificationContextValue {
  /** Bottom capsule notification — for general feedback */
  bottom: (message: string, type?: NotificationType, options?: NotificationOptions) => string;
  /** Top floating notification — for important messages */
  top: (message: string, type?: NotificationType, options?: NotificationOptions) => string;
  /** Success shortcut (bottom) */
  success: (message: string, options?: NotificationOptions) => string;
  /** Error shortcut (bottom) */
  error: (message: string, options?: NotificationOptions) => string;
  /** Info shortcut (bottom) */
  info: (message: string, options?: NotificationOptions) => string;
  /** Warning shortcut (bottom) */
  warning: (message: string, options?: NotificationOptions) => string;
  /** Dismiss a specific notification by id */
  dismiss: (id: string) => void;
  /** Dismiss all */
  dismissAll: () => void;
}

// ── Constants ───────────────────────────────────────────────────

const DEFAULT_DURATION = {
  bottom: 3000,
  top: 5000,
} as const;

const MAX_VISIBLE = {
  bottom: 3,
  top: 2,
} as const;

let notificationIdCounter = 0;

// ── Context ────────────────────────────────────────────────────

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const timeoutsRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    // Mark as exiting for animation
    setItems(prev => prev.map(n => n.id === id ? { ...n, isExiting: true } : n));

    // Remove after exit animation
    setTimeout(() => {
      setItems(prev => prev.filter(n => n.id !== id));
      // Clear timeout if it exists (e.g., if dismissed manually before auto-dismiss)
      const timeout = timeoutsRef.current.get(id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(id);
      }
    }, 200);
  }, []);

  const dismissAll = React.useCallback(() => {
    setItems(prev => prev.map(n => ({ ...n, isExiting: true })));
    setTimeout(() => {
      setItems([]);
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current.clear();
    }, 200);
  }, []);

  const show = React.useCallback(
    (
      message: string,
      type: NotificationType,
      options?: NotificationOptions
    ): string => {
      const id = `notif-${++notificationIdCounter}`;
      const position = options?.position ?? 'bottom';
      const duration = options?.duration ?? DEFAULT_DURATION[position];
      const persistent = options?.persistent ?? false;

      const item: NotificationItem = {
        id,
        message,
        type,
        position,
        duration,
        action: options?.action,
        persistent,
        isExiting: false,
      };

      setItems(prev => {
        // Enforce max visible per position — remove oldest
        const samePosition = prev.filter(n => n.position === position && !n.isExiting);
        const others = prev.filter(n => n.position !== position || n.isExiting);

        if (samePosition.length >= MAX_VISIBLE[position]) {
          // Remove oldest and its timeout
          const oldest = samePosition[0];
          const timeout = timeoutsRef.current.get(oldest.id);
          if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(oldest.id);
          }
          samePosition.shift();
        }

        return [...others, ...samePosition, item];
      });

      // Auto-dismiss
      if (!persistent) {
        const timeout = setTimeout(() => dismiss(id), duration);
        timeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [dismiss]
  );

  const value: NotificationContextValue = React.useMemo(() => ({
    bottom: (message: string, type?: NotificationType, options?: NotificationOptions) =>
      show(message, type ?? 'info', { ...options, position: 'bottom' }),
    top: (message: string, type?: NotificationType, options?: NotificationOptions) =>
      show(message, type ?? 'info', { ...options, position: 'top' }),
    success: (message: string, options?: NotificationOptions) =>
      show(message, 'success', { ...options, position: 'bottom' }),
    error: (message: string, options?: NotificationOptions) =>
      show(message, 'error', { ...options, position: 'bottom' }),
    info: (message: string, options?: NotificationOptions) =>
      show(message, 'info', { ...options, position: 'bottom' }),
    warning: (message: string, options?: NotificationOptions) =>
      show(message, 'warning', { ...options, position: 'bottom' }),
    dismiss,
    dismissAll,
  }), [show, dismiss, dismissAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer items={items} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────

export function useNotification(): NotificationContextValue {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}

// ── Notification Container (renders the UI) ────────────────────

function NotificationContainer({
  items,
  onDismiss,
}: {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
}) {
  const bottomItems = items.filter(n => n.position === 'bottom');
  const topItems = items.filter(n => n.position === 'top');

  return (
    <>
      {/* Top notifications — floating from top */}
      <div className="yp-notif-container yp-notif-container--top" aria-live="polite" aria-atomic="true">
        {topItems.map(item => (
          <NotificationCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </div>

      {/* Bottom notifications — capsule/pill */}
      <div className="yp-notif-container yp-notif-container--bottom" aria-live="polite" aria-atomic="true">
        {bottomItems.map(item => (
          <NotificationCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}

// ── Single Notification Card ────────────────────────────────────

function NotificationCard({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className={`yp-notif yp-notif--${item.type} yp-notif--${item.position}${item.isExiting ? ' yp-notif--exiting' : ''}`}
      role="status"
      onClick={() => onDismiss(item.id)}
    >
      <span className="yp-notif-icon">{getIcon(item.type)}</span>
      <span className="yp-notif-message">{item.message}</span>
      {item.action && (
        <button
          className="yp-notif-action"
          onClick={(e) => {
            e.stopPropagation();
            item.action!.onClick();
            onDismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}

function getIcon(type: NotificationType): string {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'warning': return '!';
    case 'info': return 'i';
  }
}
