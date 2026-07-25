'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - TaskTimeGroup (r48)
 * ============================================================
 * ส่วนย่อยของรายการย่อยที่แบ่งตามช่วงเวลา (ช่วงเช้า/ช่วงบ่าย/ไม่ระบุเวลา)
 * - มีป้ายชื่อ + คำอธิบายสั้นๆ ให้ผู้ใช้เห็นชัดเจนว่ากลุ่มนี้หมายถึงอะไร
 * - ภายในมี list ของ TaskRow
 * ============================================================
 */

import * as React from 'react';
import type { Task } from '@/lib/types';
import { TaskRow } from './task-row';

// ═══════════════════════════════════════════════════════════════
// TaskTimeGroup — ★ v3.10.0 รอบที่ 11: ส่วนย่อยของรายการย่อยที่แบ่งตาม
//   ช่วงเวลา (ช่วงเช้า/ช่วงบ่าย/ไม่ระบุเวลา) — มีทั้งป้ายชื่อ + คำอธิบายสั้นๆ
//   ให้ผู้ใช้เห็นชัดเจนว่ากลุ่มนี้หมายถึงอะไร ไม่ใช่แค่หัวข้อลอยๆ
// ═══════════════════════════════════════════════════════════════
export function TaskTimeGroup({
  icon,
  label,
  caption,
  count,
  tasks,
  muted = false,
  onStatusClick,
  onEdit,
  onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  caption: string;
  count: number;
  tasks: Task[];
  muted?: boolean;
  onStatusClick: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  if (count === 0) return null;

  return (
    <div className={`yp-task-time-group${muted ? ' is-muted' : ''}`}>
      <div className="yp-task-time-group__head">
        <span className="yp-task-time-group__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="yp-task-time-group__text">
          <div className="yp-task-time-group__label">
            {label}
            <span className="yp-task-time-group__count">{count}</span>
          </div>
          <div className="yp-task-time-group__caption">{caption}</div>
        </div>
      </div>
      <div className="yp-task-time-group__body">
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onStatusClick={() => onStatusClick(t.id)}
            onEdit={() => onEdit(t.id)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

