'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Day View Client (v1.8 — realtime)
// ═══════════════════════════════════════════════════════════════
// ใช้ useRealtimeEventsForDate เพื่อ subscribe events ของวันที่กำหนด
// เมื่อมี event ใหม่/ถูกลบ/ถูกแก้ → list อัพเดตทันที ไม่ต้อง refresh
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { EventCard } from '@/modules/events/event-card';
import { useRealtimeEventsForDate } from '@/lib/hooks/use-realtime';
import type { YPEvent } from '@/lib/types';

export interface DayViewClientProps {
  dateStr: string;
  /** ชื่อหัวเอกสารที่จัดรูปแบบแล้ว (เช่น "29 มิ.ย. 2568") — ส่งจาก server */
  formattedTitle: string;
  initialEvents: YPEvent[];
}

export function DayViewClient({
  dateStr,
  formattedTitle,
  initialEvents,
}: DayViewClientProps) {
  const { events, loading } = useRealtimeEventsForDate(initialEvents, dateStr);

  return (
    <div className="yp-page yp-page-enter">
      <div className="yp-page-header">
        <div className="yp-page-header__eyebrow">งานในวันที่</div>
        <h1 className="yp-page-header__title">{formattedTitle}</h1>
        <p className="yp-page-header__subtitle">
          {events.length} รายการ{loading ? ' · กำลังซิงค์…' : ''}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="yp-empty">
          <div className="yp-empty__icon" aria-hidden="true">
            <span role="img" aria-label="ว่าง">
              📭
            </span>
          </div>
          <div className="yp-empty__title">ไม่มีงานในวันนี้</div>
          <div className="yp-empty__desc">
            กดปุ่ม + เพื่อสร้างงานใหม่สำหรับวันนี้
          </div>
        </div>
      ) : (
        <div>
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

