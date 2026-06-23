// Path:    src/components/SummaryCards.tsx
// Purpose: 4 summary cards on dashboard — today / in-progress / soon / done-this-month.

'use client';

import React from 'react';
import { useTaskEngine } from '@/modules/task-engine';
import { useAuth } from '@/context/AuthContext';
import { todayStr, isWithinDays } from '@/lib/dateUtils';

interface SummaryCardsProps {
  onCardClick: (kind: 'today' | 'in_progress' | 'soon' | 'done_month') => void;
}

export function SummaryCards({ onCardClick }: SummaryCardsProps) {
  const { tasks, assignees } = useTaskEngine();
  const { user } = useAuth();
  const today = todayStr();

  const myTaskIds = new Set(
    assignees.filter(a => a.user_id === user?.auth_uid).map(a => a.task_id)
  );

  const todayTasks = tasks.filter(t =>
    t.status !== 'cancelled' && t.status !== 'done' &&
    (t.start_date === today || t.deadline === today)
  );

  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

  const soonTasks = tasks.filter(t =>
    t.status !== 'done' && t.status !== 'cancelled' &&
    t.deadline && isWithinDays(t.deadline, 3)
  );

  // Done this month
  const [y, m] = today.split('-').map(Number);
  const doneThisMonth = tasks.filter(t => {
    if (t.status !== 'done') return false;
    const [ty, tm] = (t.start_date || '').split('-').map(Number);
    return ty === y && tm === m;
  });

  const cards = [
    {
      kind: 'today' as const,
      label: 'งานวันนี้',
      value: todayTasks.length,
      sub: todayTasks.slice(0, 3).map(t => t.title).join(', ') || 'ไม่มีงานวันนี้',
      icon: '📋',
      iconBg: 'var(--blue-bg)',
      iconColor: 'var(--blue)',
    },
    {
      kind: 'in_progress' as const,
      label: 'กำลังทำ',
      value: inProgressTasks.length,
      sub: inProgressTasks.length > 0 ? `${inProgressTasks.length} งานกำลังดำเนินการ` : 'ไม่มีงานกำลังทำ',
      icon: '🔄',
      iconBg: 'var(--amber-bg)',
      iconColor: 'var(--amber)',
    },
    {
      kind: 'soon' as const,
      label: 'ใกล้ครบกำหนด',
      value: soonTasks.length,
      sub: soonTasks.length > 0 ? 'ภายใน 3 วัน' : 'ไม่มีงานด่วน',
      icon: '⏰',
      iconBg: 'var(--red-bg)',
      iconColor: 'var(--red)',
    },
    {
      kind: 'done_month' as const,
      label: 'เสร็จเดือนนี้',
      value: doneThisMonth.length,
      sub: doneThisMonth.length > 0 ? `เสร็จ ${doneThisMonth.length} งาน` : 'ยังไม่มีงานเสร็จ',
      icon: '✅',
      iconBg: 'var(--green-bg)',
      iconColor: 'var(--green)',
    },
  ];

  return (
    <div className="grid-4 stagger-cards">
      {cards.map((c, i) => (
        <div
          key={c.kind}
          className="stat-card"
          style={{ animationDelay: `${i * 60}ms` }}
          onClick={() => onCardClick(c.kind)}
        >
          <div className="stat-icon" style={{ background: c.iconBg, color: c.iconColor }}>
            {c.icon}
          </div>
          <div className="stat-label">{c.label}</div>
          <div className="stat-value">{c.value}</div>
          <div className="stat-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
