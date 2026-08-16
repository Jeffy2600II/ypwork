'use client';

// MODULE 1: TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

import type {
  YPEvent,
  Task,
  Department,
  UserProfile,
  SessionUser,
} from '@/lib/types';

export interface TodayClientProps {
  initialEvents: YPEvent[];
  user: SessionUser;
  dept: Department | null;
  deptMembers: UserProfile[];
  deptStats: { total: number };
}

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
  itemDate: string | null;
}

/** Section classification — Round 12: removed 'overdue' (no status system) */
export type ItemDateContext = 'today' | 'upcoming';

/** Date-cluster grouping for upcoming sections */
export interface DateCluster {
  dateKey: string;
  items: TimelineItem[];
  itemCount: number;
}
