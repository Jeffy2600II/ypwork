'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - TaskRow (r48)
 * ============================================================
 * Row ของรายการย่อยในกลุ่มรายการ (task row ใน event detail)
 * - แสดง title, assignee, due/start dates, priority, tags
 * - ปุ่ม status / edit / delete
 * ============================================================
 */

import * as React from 'react';
import { AlertTriangle, Calendar as CalIcon, Check, Clock, Flag, Layers, MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { relativeDay, isPast, priorityLabel, statusLabel } from '@/lib/utils/date';
import { Avatar } from '@/components/framework/avatar';

// ═══════════════════════════════════════════════════════════════
// TaskRow — render row ของรายการย่อยในกลุ่มรายการ (เหมือน demo task-row.js)
//   ★ v3.10.0 รอบที่ 29: เพิ่ม chip "เริ่ม ..." สำหรับแสดง start_date
//     ถ้า start_date มีและต่างจาก due_date → แสดง chip "เริ่ม ..." ก่อน chip "กำหนด ..."
//     ถ้า start_date เท่ากับ due_date หรือไม่มี → ไม่ต้องแสดงซ้ำ แสดงแค่ "กำหนด ..." ตามเดิม
// ═══════════════════════════════════════════════════════════════
export function TaskRow({
  task,
  onStatusClick,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;
  const dueLabel = task.due_date ? relativeDay(task.due_date) : '';
  const overdue = task.due_date && isPast(task.due_date) && task.status !== 'done';
  const priority = task.priority || 'medium';
  const priorityLbl =
    priority === 'high' ? 'เร่งด่วน' : priority === 'low' ? 'ไม่เร่ง' : 'ปกติ';
  const tags = Array.isArray(task.tags) ? task.tags : [];

  // ★ v3.10.0 รอบที่ 29: คำนวณ chip "เริ่ม ..." ถ้า start_date มีและต่างจาก due_date
  //   ถ้า start_date เท่ากับ due_date → แสดงแค่ chip เดียว เพื่อกันซ้ำซ้อน
  //   ถ้า start_date มี แต่ due_date ไม่มี → แสดง chip "เริ่ม ..." แทน "กำหนด ..."
  const startLabel = task.start_date ? relativeDay(task.start_date) : '';
  const showStartChip = !!startLabel && startLabel !== dueLabel;

  // ★ v3.10.0 รอบที่ 42: BUG FIX — เดิมถ้ามี start_time จะแสดง chip
  //   "เวลาเริ่ม 18:00" โดยไม่บอกว่าเป็นวันไหน ผู้ใช้แจ้งว่าเห็นแค่ตัวเลข
  //   เวลาแล้วไม่รู้ว่าหมายถึงวันนี้หรือพรุ่งนี้ — แก้โดยรวมวันที่เข้าไปด้วย
  //   เสมอ: ใช้ start_date ถ้ามี ถ้าไม่มีให้ใช้ due_date แทน (วันที่ใกล้เคียง
  //   ที่สุดที่ระบบรู้จัก) แล้วแสดงเป็น chip เดียว "เริ่ม {วัน} {เวลา} น."
  const startDayForTime = startLabel || dueLabel;

  return (
    <div
      className={`yp-task-row yp-cursor-pointer${task.status === 'done' ? ' is-done' : ''}`}
      data-task-id={task.id}
      role="button"
      tabIndex={0}
      onClick={onStatusClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStatusClick();
        }
      }}
      aria-label={`เปลี่ยนสถานะรายการย่อย: ${task.title}`}
    >
      {/* ★ v3.10.0 รอบที่ 42: ลบ status dot มุมซ้ายบนออก ตามคำขอผู้ใช้ —
         status chip ใน meta row ก็บอกสถานะอยู่แล้ว ไม่ต้องมี indicator
         ซ้ำซ้อน แตะที่ row ทั้งแถวก็เปลี่ยนสถานะได้เหมือนเดิม (onClick
         ผูกอยู่กับ root ของ .yp-task-row ด้านบนอยู่แล้ว) */}
      <div className="yp-task-row__body">
        <div className="yp-task-row__title">{task.title}</div>
        <div className="yp-task-row__meta">
          <span
            className={`yp-task-row__chip yp-task-row__status yp-task-row__status--${task.status}`}
          >
            {task.status === 'done' ? (
              <Check width={11} height={11} />
            ) : task.status === 'ongoing' ? (
              <RefreshCw width={11} height={11} />
            ) : (
              <Clock width={11} height={11} />
            )}
            {statusLabel(task.status)}
          </span>

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

          {/* ★ v3.10.0 รอบที่ 42: chip "เริ่ม" รวมวัน+เวลาไว้ด้วยกันเสมอ
             ถ้ามี start_time → แสดงวัน + เวลา (ไม่ให้เวลาลอยโดยไม่มีวัน)
             ถ้ามีแค่ start_date (ไม่มีเวลา) และต่างจาก due_date → แสดงแค่วัน */}
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
            <span
              className={`yp-task-row__chip yp-task-row__chip--due${overdue ? ' is-overdue' : ''}`}
            >
              {overdue ? <AlertTriangle width={11} height={11} /> : <CalIcon width={11} height={11} />}
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

