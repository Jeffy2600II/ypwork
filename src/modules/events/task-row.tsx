'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - TaskRow
 * ============================================================
 * Row ของรายการย่อยในกลุ่มรายการ (task row ใน event detail)
 * - แสดง title, assignee, due/start dates, priority, tags
 * - ปุ่ม edit / delete
 * Round 12: Removed overdue styling — no status system.
 * ============================================================
 */

import * as React from 'react';
import { Calendar as CalIcon, Clock, Pencil, Trash2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { relativeDay, priorityLabel } from '@/lib/utils/date';
import { Avatar } from '@/components/framework/avatar';

export function TaskRow({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;
  const dueLabel = task.due_date ? relativeDay(task.due_date) : '';
  const priority = task.priority || 'medium';
  const priorityLbl =
    priority === 'high' ? 'เร่งด่วน' : priority === 'low' ? 'ไม่เร่ง' : 'ปกติ';
  const tags = Array.isArray(task.tags) ? task.tags : [];

  const startLabel = task.start_date ? relativeDay(task.start_date) : '';
  const showStartChip = !!startLabel && startLabel !== dueLabel;
  const startDayForTime = startLabel || dueLabel;

  return (
    <div
      className={`yp-task-row yp-cursor-pointer`}
      data-task-id={task.id}
      aria-label={`รายการย่อย: ${task.title}`}
    >

      <div className="yp-task-row__body">
        <div className="yp-task-row__title">{task.title}</div>
        <div className="yp-task-row__meta">
          {priority !== 'medium' ? (
            <span
              className={`yp-task-row__chip yp-task-row__priority is-priority-${priority}`}
            >
              {priorityLbl}
            </span>
          ) : null}

          {assignee ? (
            <span className="yp-task-row__chip yp-task-row__chip--assignee">
              <span className="yp-task-row__avatar">
                <Avatar
                  name={assignee.full_name}
                  color={assignee.color || '#4F46E5'}
                  size={16}
                />
              </span>
              {assignee.full_name.split(' ')[0]}
            </span>
          ) : null}

          {task.start_time ? (
            <span className="yp-task-row__chip yp-task-row__chip--start">
              <Clock width={11} height={11} />
              <span className="yp-task-row__chip-label">เริ่ม</span>
              {startDayForTime ? `${startDayForTime} ` : ''}{task.start_time} น.
            </span>
          ) : showStartChip ? (
            <span className="yp-task-row__chip yp-task-row__chip--start">
              <CalIcon width={11} height={11} />
              <span className="yp-task-row__chip-label">เริ่ม</span>
              {startLabel}
            </span>
          ) : null}

          {dueLabel ? (
            <span className="yp-task-row__chip yp-task-row__chip--due">
              <CalIcon width={11} height={11} />
              <span className="yp-task-row__chip-label">กำหนดส่ง</span>
              {dueLabel}
            </span>
          ) : null}

          {task.estimated_time ? (
            <span className="yp-task-row__chip yp-task-row__chip--est">
              <Clock width={11} height={11} />
              <span className="yp-task-row__chip-label">ใช้เวลา</span>
              {task.estimated_time}
            </span>
          ) : null}

          {tags.map((t) => (
            <span key={t} className="yp-task-row__tag">
              #{t}
            </span>
          ))}
        </div>
        {task.notes ? <div className="yp-task-row__notes">{task.notes}</div> : null}
      </div>
      <div className="yp-task-row__actions">
        <button
          type="button"
          className="yp-task-row__edit"
          aria-label="แก้ไขรายการย่อย"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil />
        </button>
        <button
          type="button"
          className="yp-task-row__delete"
          aria-label="ลบรายการย่อย"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 />
        </button>
      </div>
    </div>
  );
}
