'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · NetworkStatusBanner (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// แสดง banner ด้านบนเมื่อ offline / online กลับมา
// ทำให้ user รู้ทันทีว่าการเชื่อมต่อมีปัญหา ไม่ต้องเดา
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [showBackOnline, setShowBackOnline] = React.useState(false);

  React.useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      // Hide "back online" message after 3 seconds
      setTimeout(() => setShowBackOnline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render anything if online and no "back online" message
  if (isOnline && !showBackOnline) return null;

  return (
    <div
      className={`yp-network-banner is-visible${showBackOnline ? ' yp-network-banner--warning' : ''}`}
      role="status"
      aria-live="polite"
    >
      {showBackOnline
        ? 'ออนไลน์อีกครั้งแล้ว — ข้อมูลจะอัพเดตปกติ'
        : 'ไม่ได้เชื่อมต่ออินเทอร์เน็ต — ข้อมูลบางส่วนอาจไม่อัพเดต'}
    </div>
  );
}
