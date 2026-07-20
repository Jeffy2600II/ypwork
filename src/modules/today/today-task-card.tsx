// ═══════════════════════════════════════════════════════════════
// YP WORK · TodayTaskCard (v3.9.9 — sub-task card สำหรับ today dashboard)
// ═══════════════════════════════════════════════════════════════
// ★ v3.9.9: แสดง task ย่อยที่ due_date = วันนี้ แต่ parent event อยู่ในวันอื่น
//   ทำให้ "งานวันนี้" แสดงผลครบทุกงานที่ต้องทำวันนี้จริง ๆ
//   ไม่ใช่แค่ event ที่ date = วันนี้
//
// Layout คล้าย EventCard แต่มี:
//   - "↪ จาก: <event title>" badge บอกว่าเป็น task ย่อยของงานไหน
//   - icon เป็น CheckSquare (แทน Layers/Flag ของ event)
//   - link ไปยัง parent event (เพราะ task ไม่มีหน้าของตัวเอง)
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { CheckSquare, CornerDownRight } from 'lucide-react';
import type { Task, YPEvent } from '@/lib/types';
import {
  statusLabel,
  statusChipClass,
} from '@/lib/utils/date';

export interface TodayTaskCardProps {
  task: Task;
  parentEvent: YPEvent;
}

export function TodayTaskCard({ task, parentEvent }: TodayTaskCardProps) {
  const accent = parentEvent.color || '#4F46E5';

  return (
    <Link
      href={`/events/${parentEvent.id}`}
      className="yp-event-card yp-today-task-card"
      style={{ ['--accent' as string]: accent }}
      aria-label={`Task: ${task.title} (จากงาน: ${parentEvent.title})`}
    >
      <div className="yp-event-card__head">
        <div
          className="yp-event-card__icon"
          aria-hidden="true"
        >
          <CheckSquare strokeWidth={2} />
        </div>

        <div className="yp-event-card__main">
          <div className="yp-event-card__title">{task.title}</div>
          <div className="yp-event-card__meta">
            <span className="yp-today-task-card__parent">
              <CornerDownRight width={11} height={11} />
              จาก: {parentEvent.title}
            </span>
          </div>
        </div>

        <span className={`yp-chip ${statusChipClass(task.status)}`}>
          <span className="yp-chip-dot" aria-hidden="true" />
          {statusLabel(task.status)}
        </span>
      </div>
    </Link>
  );
}
