'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Calendar View (v1.6 — realtime + local date fix)
// ═══════════════════════════════════════════════════════════════
// Month view ภาษาไทย (พ.ศ.) พร้อม event indicator
// - ปุ่มเดือนก่อน/ถัดไป + ปุ่ม "วันนี้"
// - วันที่มี 1 งาน → link ไป /events/[id]
// - วันที่มีหลายงาน → link ไป /events/day/[date]
// - v1.6: ใช้ getLocalTodayStr() แทน toISOString() — แก้ปัญหา
//   "วันที่ 28 แทน 29" ตอนเข้าหน้าปฏิทินรอบเที่ยงคืน UTC
// - v1.6: subscribe Supabase Realtime — เมื่อ events/tasks เปลี่ยน
//   ปฏิทินอัพเดตทันที ไม่ต้อง refresh
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { YPEvent } from '@/lib/types';
import { THAI_MONTHS, getLocalTodayStr } from '@/lib/utils/date';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime';
import { InfoButton } from '@/components/ui/info-button';

const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export interface CalendarViewProps {
  initialEvents: YPEvent[];
  /** เดือนเริ่มต้น (0-11) — default = เดือนปัจจุบัน */
  initialYear?: number;
  initialMonth?: number;
}

interface DayCell {
  day: number;
  month: number; // 0-11
  year: number;
  other: boolean;
  dateStr: string; // YYYY-MM-DD
}

export function CalendarView({
  initialEvents,
  initialYear,
  initialMonth,
}: CalendarViewProps) {
  // v1.6: ใช้ local date (ไม่ใช้ toISOString ที่แปลงเป็น UTC)
  const todayStr = getLocalTodayStr();
  const now = new Date();
  const [viewYear, setViewYear] = React.useState<number>(
    initialYear ?? now.getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState<number>(
    initialMonth ?? now.getMonth()
  );

  // v1.6: subscribe realtime — events list อัพเดตอัตโนมัติ
  const { events: liveEvents } = useRealtimeEvents(initialEvents);

  // Build events by date map
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, YPEvent[]>();
    for (const ev of liveEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [liveEvents]);

  // Build day cells
  const cells = React.useMemo<DayCell[]>(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();

    const list: DayCell[] = [];

    // leading days from prev month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLast - i;
      const d = new Date(viewYear, viewMonth - 1, day);
      list.push({
        day,
        month: d.getMonth(),
        year: d.getFullYear(),
        other: true,
        dateStr: toISODate(d),
      });
    }

    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      list.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        other: false,
        dateStr: toISODate(date),
      });
    }

    // trailing days from next month — until 42 cells (6 weeks)
    while (list.length < 42) {
      const last = list[list.length - 1];
      const next = new Date(last.year, last.month, last.day + 1);
      list.push({
        day: next.getDate(),
        month: next.getMonth(),
        year: next.getFullYear(),
        other: next.getMonth() !== viewMonth,
        dateStr: toISODate(next),
      });
    }

    return list;
  }, [viewYear, viewMonth]);

  // Legend — auto-generate from colors used in this month
  const legend = React.useMemo(() => {
    const used = new Map<
      string,
      { color: string; label: string; icon: string }
    >();
    for (const c of cells) {
      if (c.other) continue;
      const dayEvents = eventsByDate.get(c.dateStr) || [];
      for (const ev of dayEvents) {
        const color = ev.color || '#4F46E5';
        if (!used.has(color)) {
          const deptName = ev.department?.name?.replace('ฝ่าย', '') || '';
          const label = deptName || (ev.type === 'task' ? 'งานเดี่ยว' : 'งานกลุ่ม');
          const icon = ev.department?.icon || (ev.type === 'task' ? '◉' : '◎');
          used.set(color, { color, label, icon });
        }
      }
    }
    return Array.from(used.values()).slice(0, 6);
  }, [cells, eventsByDate]);

  const handlePrev = () => {
    let m = viewMonth - 1;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleNext = () => {
    let m = viewMonth + 1;
    let y = viewYear;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  return (
    <div className="yp-page yp-page-enter">
      {/* ── HERO + TOOLBAR ── */}
      <div className="yp-cal-hero yp-hero-enter">
        <div className="yp-cal-hero__bar">
          <button
            type="button"
            className="yp-cal-hero__nav"
            onClick={handlePrev}
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="yp-cal-hero__today"
            onClick={handleToday}
          >
            วันนี้
          </button>
          <button
            type="button"
            className="yp-cal-hero__nav"
            onClick={handleNext}
            aria-label="เดือนถัดไป"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="yp-cal-hero__title-wrap">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className="yp-cal-hero__eyebrow">ปฏิทินกิจกรรม</span>
            <InfoButton
              size="sm"
              side="bottom"
              align="start"
              title="วิธีใช้ปฏิทิน"
              content={
                <>
                  ปฏิทินแสดงกิจกรรมทั้งหมดในแต่ละเดือน
                  <br />
                  <br />
                  <strong>จุดสี</strong> ใต้วันที่ = มีงานในวันนั้น
                  <br />
                  <strong>คลิกวันที่</strong> = ดูงานในวันนั้น (วันเดียว → หน้ารายละเอียดงาน, หลายงาน → หน้ารวมวัน)
                  <br />
                  <strong>ปุ่ม ‹ ›</strong> = เดือนก่อน/ถัดไป
                  <br />
                  <strong>ปุ่ม “วันนี้”</strong> = กลับมาเดือนปัจจุบัน
                </>
              }
            />
          </span>
          <span className="yp-cal-hero__title">
            {THAI_MONTHS[viewMonth]} {viewYear + 543}
          </span>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="yp-cal-grid">
        <div className="yp-cal-weekdays" role="row">
          {THAI_DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={`yp-cal-weekday${i === 0 || i === 6 ? ' is-weekend' : ''}`}
              role="columnheader"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="yp-cal-days" role="grid">
          {cells.map((c) => {
            const dayEvents = eventsByDate.get(c.dateStr) || [];
            const isTodayCell = c.dateStr === todayStr;
            const hasEvents = dayEvents.length > 0;
            const weekend = new Date(c.year, c.month, c.day).getDay();
            const isWeekend = weekend === 0 || weekend === 6;

            const classes = [
              'yp-cal-day',
              c.other ? 'is-other-month' : '',
              isTodayCell ? 'is-today' : '',
              isWeekend && !c.other ? 'is-weekend' : '',
            ]
              .filter(Boolean)
              .join(' ');

            // Click target: 1 event → detail; multiple → day view
            const targetHref = hasEvents
              ? dayEvents.length === 1
                ? `/events/${dayEvents[0].id}`
                : `/events/day/${c.dateStr}`
              : null;

            const content = (
              <>
                <div className="yp-cal-day__num">{c.day}</div>
                {dayEvents.length > 0 ? (
                  <>
                    <div className="yp-cal-day__events">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const color = ev.color || '#4F46E5';
                        return (
                          <div
                            key={ev.id}
                            className="yp-cal-day__event"
                            style={{ ['--ev-color' as string]: color }}
                          >
                            <span className="yp-cal-day__event-dot" />
                            <span className="yp-cal-day__event-text">
                              {ev.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="yp-cal-day__dots">
                      {dayEvents.slice(0, 4).map((ev) => (
                        <div
                          key={ev.id}
                          className="yp-cal-day__dot"
                          style={{
                            background: ev.color || '#4F46E5',
                          }}
                        />
                      ))}
                    </div>
                    {dayEvents.length > 2 ? (
                      <div className="yp-cal-day__more">
                        +{dayEvents.length - 2} งาน
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            );

            if (targetHref) {
              return (
                <Link
                  key={c.dateStr}
                  href={targetHref}
                  className={classes}
                  aria-label={`${c.day} ${THAI_MONTHS[c.month]} ${c.year + 543} — ${dayEvents.length} งาน`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={c.dateStr}
                className={classes}
                aria-label={`${c.day} ${THAI_MONTHS[c.month]} ${c.year + 543}`}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div className="yp-cal-legend">
        {legend.length === 0 ? (
          <div className="yp-cal-legend__empty">
            <span
              className="yp-cal-legend__dot"
              style={{ background: 'var(--yp-border-subtle)' }}
            />
            ยังไม่มีงานในเดือนนี้
          </div>
        ) : (
          legend.map((it) => (
            <div key={it.color} className="yp-cal-legend__item">
              <span
                className="yp-cal-legend__dot"
                style={{ background: it.color }}
              />
              <span className="yp-cal-legend__label">
                {it.icon} {it.label}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
