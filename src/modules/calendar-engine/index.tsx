// Path:    src/modules/calendar-engine/index.ts
// Purpose: CalendarEngine — Module #3 of 6 Core Modules.
//          Manages calendar navigation (current month/week/day + today).

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { todayStr, addDays, getWeekRange, getMonthGrid } from '@/lib/dateUtils';

type CalendarCtx = {
  cursor: string;       // YYYY-MM-DD — date the calendar is "looking at"
  setCursor: (d: string) => void;
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  monthGrid: string[];  // 42 days for current month view
  weekRange: string[];  // 7 days for current week view
};

const CalendarContext = createContext<CalendarCtx>({
  cursor: todayStr(),
  setCursor: () => {},
  goToday: () => {},
  goPrev: () => {},
  goNext: () => {},
  monthGrid: [],
  weekRange: [],
});

export function useCalendar() { return useContext(CalendarContext); }

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [cursor, setCursor] = useState<string>(todayStr());

  const goToday = useCallback(() => setCursor(todayStr()), []);
  const goPrev = useCallback(() => setCursor(c => addDays(c, -7)), []);
  const goNext = useCallback(() => setCursor(c => addDays(c, 7)), []);

  const [year, month, day] = cursor.split('-').map(Number);
  const monthGrid = getMonthGrid(year, month);
  const weekRange = getWeekRange(cursor);

  return (
    <CalendarContext.Provider value={{
      cursor, setCursor, goToday, goPrev, goNext, monthGrid, weekRange,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export const CalendarEngineAPI = Object.freeze({
  useCalendar,
} as const);
