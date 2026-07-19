'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Calendar View (v3.9.4 — Thailand TZ + redesign)
// ═══════════════════════════════════════════════════════════════
// ★ v3.9.4: Thailand timezone accuracy + complete redesign
//   - ใช้ getThailandTodayParts() สำหรับ "วันนี้" ในไทย (UTC+7)
//   - ป้องกันการแสดงวันที่ผิดเมื่อ user เปิดเว็บจากต่างประเทศ
//   - ออกแบบใหม่ทั้ง month view + list view — research-based
//     inspired by Apple Calendar, Google Calendar, Notion Calendar
//   - สัดส่วนที่ดีขึ้น, contrast ที่ชัดเจน, การจัดวางที่สมดุล
//   - คงความโค้งมนที่ "container" แต่ลดความมนที่ "cells" ตามคำขอ
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, List, Clock, MapPin } from 'lucide-react';
import type { YPEvent } from '@/lib/types';
import { THAI_MONTHS, getLocalTodayStr, isPast, isToday, getThailandTodayParts } from '@/lib/utils/date';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';

const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const THAI_DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export interface CalendarViewProps {
  initialEvents: YPEvent[];
  initialYear?: number;
  initialMonth?: number;
}

interface DayCell {
  day: number;
  month: number;
  year: number;
  other: boolean;
  dateStr: string;
  weekday: number;
}

type ViewMode = 'calendar' | 'list';

export function CalendarView({
  initialEvents,
  initialYear,
  initialMonth,
}: CalendarViewProps) {
  // ★ v3.9.4: ใช้ "วันนี้" ในเขตเวลาไทย (UTC+7) แทน new Date() ของเครื่อง user
  // ก่อนหน้านี้: ถ้า user เปิดจากสหรัฐฯ "วันนี้" อาจเป็นเมื่อวานในไทย → ปฏิทินแสดงผิด
  const todayStr = getLocalTodayStr();
  const todayParts = getThailandTodayParts();
  const [viewYear, setViewYear] = React.useState<number>(initialYear ?? todayParts.year);
  const [viewMonth, setViewMonth] = React.useState<number>(initialMonth ?? todayParts.month);
  const [viewMode, setViewMode] = React.useState<ViewMode>('calendar');

  const { events: liveEvents } = useRealtimeEvents(initialEvents);

  // Events by date map
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, YPEvent[]>();
    for (const ev of liveEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [liveEvents]);

  // ★ v3.9.4: Events for current month only (for list view)
  // เปรียบเทียบ year/month ด้วย string parsing แทน new Date() เพื่อความแม่นยำ
  // (date string YYYY-MM-DD เป็น date-only ไม่มี timezone ambiguity)
  const monthEvents = React.useMemo(() => {
    const targetMonthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    return liveEvents
      .filter((ev) => ev.date.startsWith(targetMonthPrefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [liveEvents, viewYear, viewMonth]);

  // Group by day
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, YPEvent[]>();
    for (const ev of monthEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [monthEvents]);

  // Build day cells
  const cells = React.useMemo<DayCell[]>(() => {
    // ★ v3.9.4: ใช้ local Date constructor (year, month, day) ที่ไม่มี timezone ambiguity
    // เพราะเรา set เป็น local midnight ที่ไม่ขึ้นกับ UTC offset
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();

    const list: DayCell[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLast - i;
      const d = new Date(viewYear, viewMonth - 1, day);
      list.push({ day, month: d.getMonth(), year: d.getFullYear(), other: true, dateStr: toISODate(d), weekday: d.getDay() });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      list.push({ day: d, month: viewMonth, year: viewYear, other: false, dateStr: toISODate(date), weekday: date.getDay() });
    }

    // ★ v3.9.4: เติมให้ครบ 6 แถว (42 ช่อง) สำหรับการ์ดปฏิทินที่สม่ำเสมอ
    while (list.length < 42) {
      const last = list[list.length - 1];
      const next = new Date(last.year, last.month, last.day + 1);
      list.push({ day: next.getDate(), month: next.getMonth(), year: next.getFullYear(), other: next.getMonth() !== viewMonth, dateStr: toISODate(next), weekday: next.getDay() });
    }

    return list;
  }, [viewYear, viewMonth]);

  const handlePrev = () => {
    let m = viewMonth - 1;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleNext = () => {
    let m = viewMonth + 1;
    let y = viewYear;
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleToday = () => {
    // ★ v3.9.4: ใช้ todayParts จากเขตเวลาไทย ไม่ใช่ new Date()
    setViewYear(todayParts.year);
    setViewMonth(todayParts.month);
  };

  return (
    <div className="yp-page yp-page-enter">
      {/* ── PAGE HEADER + TOOLBAR ── */}
      <div className="yp-page-header">
        <div className="yp-cal-header-row">
          <div className="yp-cal-header-row__title">
            <div className="yp-page-header__eyebrow">ปฏิทินกิจกรรม</div>
            <h1 className="yp-page-header__title">{THAI_MONTHS[viewMonth]} {viewYear + 543}</h1>
          </div>
          {/* View toggle */}
          <div className="yp-cal-view-toggle" role="tablist" aria-label="เลือกมุมมอง">
            <button
              type="button"
              className={`yp-cal-view-btn${viewMode === 'calendar' ? ' is-active' : ''}`}
              onClick={() => setViewMode('calendar')}
              role="tab"
              aria-selected={viewMode === 'calendar'}
              aria-label="มุมมองปฏิทิน"
            >
              <Calendar width={15} height={15} />
            </button>
            <button
              type="button"
              className={`yp-cal-view-btn${viewMode === 'list' ? ' is-active' : ''}`}
              onClick={() => setViewMode('list')}
              role="tab"
              aria-selected={viewMode === 'list'}
              aria-label="มุมมองรายการ"
            >
              <List width={15} height={15} />
            </button>
          </div>
        </div>

        {/* Nav bar */}
        <div className="yp-cal-nav-bar">
          <button type="button" className="yp-cal-nav-btn" onClick={handlePrev} aria-label="เดือนก่อนหน้า">
            <ChevronLeft width={18} height={18} />
          </button>
          <button type="button" className="yp-cal-today-btn" onClick={handleToday}>วันนี้</button>
          <button type="button" className="yp-cal-nav-btn" onClick={handleNext} aria-label="เดือนถัดไป">
            <ChevronRight width={18} height={18} />
          </button>
        </div>
      </div>

      {/* ── CALENDAR VIEW ── */}
      {viewMode === 'calendar' ? (
        <div className="yp-cal-grid-v2">
          {/* Weekday headers */}
          <div className="yp-cal-weekdays-v2">
            {THAI_DAYS_SHORT.map((d, i) => (
              <div key={d} className={`yp-cal-weekday-v2${i === 0 || i === 6 ? ' is-weekend' : ''}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="yp-cal-days-v2">
            {cells.map((c) => {
              const dayEvents = eventsByDate.get(c.dateStr) || [];
              const isTodayCell = c.dateStr === todayStr;
              const hasEvents = dayEvents.length > 0;
              const isWeekend = c.weekday === 0 || c.weekday === 6;

              const classes = [
                'yp-cal-day-v2',
                c.other ? 'is-other' : '',
                isTodayCell ? 'is-today' : '',
                isWeekend && !c.other ? 'is-weekend' : '',
                hasEvents ? 'has-events' : '',
              ].filter(Boolean).join(' ');

              const targetHref = hasEvents
                ? dayEvents.length === 1
                  ? `/events/${dayEvents[0].id}`
                  : `/events/day/${c.dateStr}`
                : null;

              const content = (
                <>
                  <span className="yp-cal-day-v2__num">{c.day}</span>
                  {hasEvents ? (
                    <span className="yp-cal-day-v2__dots">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="yp-cal-day-v2__dot"
                          style={{ background: ev.color || '#4F46E5' }}
                        />
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="yp-cal-day-v2__more">+{dayEvents.length - 3}</span>
                      ) : null}
                    </span>
                  ) : null}
                </>
              );

              if (targetHref) {
                return (
                  <Link key={c.dateStr} href={targetHref} className={classes}>
                    {content}
                  </Link>
                );
              }
              return (
                <div key={c.dateStr} className={classes}>
                  {content}
                </div>
              );
            })}
          </div>

          {/* ★ v3.9.4: Legend — อธิบายสี weekend/today/has-events ให้ชัดเจน */}
          <div className="yp-cal-legend">
            <span className="yp-cal-legend__item">
              <span className="yp-cal-legend__swatch yp-cal-legend__swatch--today" />
              <span>วันนี้</span>
            </span>
            <span className="yp-cal-legend__item">
              <span className="yp-cal-legend__swatch yp-cal-legend__swatch--weekend" />
              <span>สุดสัปดาห์</span>
            </span>
            <span className="yp-cal-legend__item">
              <span className="yp-cal-legend__swatch yp-cal-legend__swatch--dot" />
              <span>มีงาน</span>
            </span>
          </div>
        </div>
      ) : (
        /* ── LIST VIEW — grouped by day, compact ── */
        <div className="yp-cal-list-v2">
          {/* ★ v3.9.4: Month summary header — แสดงจำนวนงานทั้งเดือน */}
          <div className="yp-cal-list-summary">
            <span className="yp-cal-list-summary__label">งานในเดือนนี้</span>
            <span className="yp-cal-list-summary__count">{monthEvents.length}</span>
          </div>

          {eventsByDay.length === 0 ? (
            <div className="yp-cal-list-v2__empty">
              <Calendar width={28} height={28} strokeWidth={1.5} />
              <span>ยังไม่มีงานในเดือนนี้</span>
            </div>
          ) : (
            eventsByDay.map(([dateStr, dayEvents]) => {
              const [yStr, mStr, dStr] = dateStr.split('-');
              const d = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));
              const dayName = THAI_DAYS_FULL[d.getDay()];
              const isPastDay = isPast(dateStr) && !isToday(dateStr);
              const isTodayDay = isToday(dateStr);
              const weekdayShort = THAI_DAYS_SHORT[d.getDay()];

              return (
                <div key={dateStr} className="yp-cal-list-day">
                  {/* Date header — ★ v3.9.4: improved layout, weekday badge */}
                  <div className={`yp-cal-list-day__header${isTodayDay ? ' is-today' : ''}${isPastDay ? ' is-past' : ''}`}>
                    <div className="yp-cal-list-day__date">
                      <span className="yp-cal-list-day__num">{d.getDate()}</span>
                      <div className="yp-cal-list-day__date-meta">
                        <span className="yp-cal-list-day__name">{dayName}</span>
                        <span className={`yp-cal-list-day__weekday-short${d.getDay() === 0 || d.getDay() === 6 ? ' is-weekend' : ''}`}>{weekdayShort}</span>
                      </div>
                      {isTodayDay ? <span className="yp-cal-list-day__today-badge">วันนี้</span> : null}
                    </div>
                    <span className="yp-cal-list-day__count">{dayEvents.length} งาน</span>
                  </div>

                  {/* Event items — ★ v3.9.4: improved card-like layout */}
                  <div className="yp-cal-list-day__items">
                    {dayEvents.map((ev) => {
                      const color = ev.color || '#4F46E5';
                      return (
                        <Link
                          key={ev.id}
                          href={`/events/${ev.id}`}
                          className="yp-cal-list-event"
                          style={{ ['--ev-color' as string]: color }}
                        >
                          <span className="yp-cal-list-event__bar" />
                          <div className="yp-cal-list-event__body">
                            <span className="yp-cal-list-event__title">{ev.title}</span>
                            <div className="yp-cal-list-event__meta">
                              {ev.time ? (
                                <span className="yp-cal-list-event__time">
                                  <Clock width={11} height={11} />
                                  {ev.time}
                                </span>
                              ) : null}
                              {ev.location ? (
                                <span className="yp-cal-list-event__loc">
                                  <MapPin width={11} height={11} />
                                  {ev.location}
                                </span>
                              ) : null}
                              {ev.department ? (
                                <span className="yp-cal-list-event__dept">
                                  {ev.department.icon} {ev.department.name?.replace('ฝ่าย', '')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {/* ★ v3.9.4: status dot for quick visual scanning */}
                          <span className="yp-cal-list-event__status-dot" aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** ★ v3.9.4: แปลง Date เป็น YYYY-MM-DD โดยใช้ local date (ไม่ใช่ UTC)
 *  ปลอดภัยเพราะ Date constructor ใน calendar ใช้ local components อยู่แล้ว
 *  และเราเปรียบเทียบกับ dateStr ของ event ที่เป็น YYYY-MM-DD แบบ date-only */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
