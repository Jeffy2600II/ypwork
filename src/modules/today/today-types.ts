'use client';

// MODULE 1: TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

import type {
  YPEvent,
  Task,
  TaskStatus,
  EventStatus,
  Department,
  UserProfile,
  SessionUser,
} from '@/lib/types';

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number; done: number; ongoing: number; overdue: number };
}

// ★ r47: STATUS_META ย้ายไป _shared/status-meta.ts แล้ว — ใช้ร่วมกับ event-detail

export const PRIORITY_LBL: Record<string, string> = {
  high: 'เร่งด่วน',
  medium: 'ปกติ',
  low: 'ไม่เร่ง',
};

/** Normalised item displayed in the timeline */
export interface TimelineItem {
  id: string;
  startTime: string | null;
  title: string;
  status: TaskStatus | EventStatus;
  accent: string;
  parentEvent: YPEvent | null;
  task: Task | null;
  event: YPEvent | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string | null;
  dueDate: string | null;
  location: string | null;
  eventTime: string | null;
  /** Which section this item belongs to */
  dateContext: string;
  /** Actual start date (for date clustering) */
  itemDate: string;
}

/** Section classification */
export type ItemDateContext = 'overdue' | 'today' | 'upcoming';

/** Date-cluster grouping for overdue / upcoming sections */
export interface DateCluster {
  dateKey: string;
  items: TimelineItem[];
  itemCount: number;
}

