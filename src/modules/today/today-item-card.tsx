'use client';

/**
 * ============================================================
 * YP WORK - Today Module - TodayItemCard (r48)
 * ============================================================
 * Card สำหรับแสดง 1 รายการใน Today dashboard
 * - 4-Row Layout (r46): metadata → title → parent → badges
 * - Subtask Clarity: left accent bar + tinted bg + "↳ รายการย่อย" label
 * ============================================================
 */

import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalIcon,
  Flag,
  Check,
  Clock,
  Layers,
  Sunrise,
  Sunset,
  CircleDashed,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  MoreHorizontal,
  Users,
  Eye,
  MapPin,
  User as UserIcon,
  Timer,
  CornerDownRight,
} from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { STATUS_META } from '@/modules/_shared/status-meta';
import { StatusPickerSheet } from '@/modules/_shared/status-picker-sheet';
import { relativeDay, statusLabel } from '@/lib/utils/date';
import type { TimelineItem } from './today-types';
import { PRIORITY_LBL } from './today-types';
import { formatScheduleLabel, formatCardTimeDisplay } from './today-format';

// MODULE 7: TODAY ITEM CARD (v3.10.0-r68 — 4-Row Layout + Subtask Clarity + Soft Feel)
// ═══════════════════════════════════════════════════════════════
//
// Card layout (TOP → BOTTOM):
//
//  Row 1: [↳ รายการย่อย*]            [🕐 เวลา] [•••]     *subtask เท่านั้น
//         ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─      (faint hairline)
//  Row 2: 🔷 ชื่องาน (Title — พระเอก ใหญ่ เด่น)            *icon = subtask เท่านั้น
//  Row 3: 👥 จากกลุ่ม: XXX  (รายการย่อยเท่านั้น)
//  Row 4: [🔴 เลยกำหนด] [🟡 รอเริ่ม] [📍 สถานที่]
//
//  ★ r46: Subtask vs Standalone Clarity
//    - Subtask: left accent bar + tinted bg + "↳ รายการย่อย" label +
//               prominent Layers icon (16px, accent color)
//    - Standalone: clean white card, no left bar, no label, no title icon
//
//  ★ r46: Row Breathing — margin-top ระหว่างบรรทัดเพิ่มขึ้น
//    - Row 1 → Row 2: 12px (was 2px) + faint hairline divider
//    - Row 2 → Row 3:  8px (was 4px)
//    - Row 3 → Row 4: 14px (was 8px)
//    - Card padding: 18px (was 16px)
//
//  ★ ไม่มีเส้น Divider หนา — ใช้ Padding/Spacing จัดกลุ่มข้อมูล
//  ★ เวลาใน Row 1 ไม่โดดเด่น ไม่มีกรอบแคปซูล
// ═══════════════════════════════════════════════════════════════

export function TodayItemCard({
  item,
  onOpenStatusPicker,
  todayStr,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onViewMore,
}: {
  item: TimelineItem;
  onOpenStatusPicker: (item: TimelineItem) => void;
  todayStr: string;
  isMenuOpen: boolean;
  onOpenMenu: (item: TimelineItem) => void;
  onCloseMenu: () => void;
  onViewMore: (item: TimelineItem) => void;
}) {
  const accent = item.accent;
  const isOverdue = item.dateContext === 'overdue';
  const isUpcoming = item.dateContext === 'upcoming';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';
  const isSubItem = !!item.parentEvent && !!item.task;

  // Row 1: Time display (subtle, no capsule)
  const timeDisplay = formatCardTimeDisplay(item, todayStr);

  return (
    <div
      className={`yp-today-item-card${isSubItem ? ' is-subitem' : ''}${item.status === 'done' ? ' is-done' : ''}${isMenuOpen ? ' is-menu-open' : ''}`}
      style={{ ['--accent' as string]: accent }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenStatusPicker(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenStatusPicker(item);
        }
      }}
      aria-label={`${item.title}${isSubItem ? ' (รายการย่อย)' : ''} — ${statusLabel(item.status)} — แตะเพื่อเลือกสถานะ`}
    >
      {/* ── Body ── */}
      <div className="yp-today-item-card__body">
        {/* Row 1: Subtask label (left) + Time + Menu (right) */}
        <div className="yp-today-item-card__top-row">
          {/* ★ r46: Subtask label — explicit text identifier
              แสดงเฉพาะรายการย่อย — ทำให้ user รู้ทันทีว่าเป็น subtask
              ใช้ไอคอน CornerDownRight + ข้อความ "รายการย่อย"
              สี accent ของ parent event เพื่อเชื่อมโยงกับพ่อแม่ */}
          {isSubItem ? (
            <span className="yp-today-item-card__subtag">
              {/* ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ */}
              <CornerDownRight width={10} height={10} strokeWidth={2.5} />
              รายการย่อย
            </span>
          ) : (
            <span className="yp-today-item-card__type-tag">
              {/* ★ r46: Standalone indicator — ใช้ icon เดียวบอกประเภท
                  (Flag = standalone task, Layers = subtask)
                  ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ */}
              <Flag width={10} height={10} strokeWidth={2.5} />
              รายการหลัก
            </span>
          )}

          <div className="yp-today-item-card__top-right">
            {timeDisplay ? (
              <span className="yp-today-item-card__time">
                {/* ★ r64: ลด icon จาก 12×12 → 11×11 ให้สมดุลกับ type scale ใหม่ */}
                <Clock width={11} height={11} />
                {timeDisplay}
              </span>
            ) : null}
            <button
              type="button"
              className="yp-today-item-card__menu"
              aria-label="ตัวเลือกเพิ่มเติม"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={(e) => {
                e.stopPropagation();
                if (isMenuOpen) onCloseMenu();
                else onOpenMenu(item);
              }}
            >
              {/* ★ r64: ลด icon จาก 16×16 → 15×15 ให้สมดุลกับ type scale ใหม่ */}
              <MoreHorizontal width={15} height={15} />
            </button>
          </div>
        </div>

        {/* Row 2: Title (hero — large, prominent, with type icon) */}
        <div className="yp-today-item-card__title">
          {isSubItem ? (
            <Layers
              /* ★ r64: ลด icon จาก 16×16 → 14×14 ให้สมดุลกับ title text ที่เล็กลง */
              width={14}
              height={14}
              strokeWidth={2.25}
              className="yp-today-item-card__title-icon"
            />
          ) : null}
          {item.title}
        </div>

        {/* Row 3: From group (sub-items only) */}
        {isSubItem && item.parentEvent ? (
          <div className="yp-today-item-card__group">
            {/* ★ r64: ลด icon จาก 12×12 → 11×11 ให้สมดุลกับ type scale ใหม่ */}
            <Users width={11} height={11} />
            <span className="yp-today-item-card__group-label">
              จากกลุ่ม:
            </span>
            <span className="yp-today-item-card__group-name">
              {item.parentEvent.title}
            </span>
          </div>
        ) : null}

        {/* Row 4: Badges (status, priority, location, etc.) */}
        <div className="yp-today-item-card__badges">
          {/* Status / Overdue badge */}
          {isOverdue && item.itemDate && item.itemDate !== todayStr ? (
            <span className="yp-today-item-card__badge yp-today-item-card__badge--overdue">
              {/* ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ — badge ที่บรรจุ relative-day label ควรเล็กที่สุด */}
              <AlertTriangle width={10} height={10} />
              เลยกำหนด {relativeDay(item.itemDate)}
            </span>
          ) : (
            <span
              className={`yp-today-item-card__badge yp-today-item-card__badge--status yp-today-item-card__badge--${item.status}`}
            >
              {/* ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ */}
              {item.status === 'done' ? (
                <Check width={10} height={10} />
              ) : item.status === 'ongoing' ? (
                <RefreshCw width={10} height={10} />
              ) : (
                <Clock width={10} height={10} />
              )}
              {statusLabel(item.status)}
            </span>
          )}

          {/* Priority badge (skip medium) */}
          {priority !== 'medium' ? (
            <span
              className={`yp-today-item-card__badge yp-today-item-card__badge--priority is-priority-${priority}`}
            >
              {priorityLbl}
            </span>
          ) : null}

          {/* Location badge */}
          {item.location ? (
            <span className="yp-today-item-card__badge">
              {/* ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ */}
              <MapPin width={10} height={10} />
              {item.location}
            </span>
          ) : null}

          {/* Estimated time badge */}
          {item.estimatedTime ? (
            <span className="yp-today-item-card__badge">
              {/* ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ */}
              <Timer width={10} height={10} />
              {item.estimatedTime}
            </span>
          ) : null}

          {/* Assignee badge */}
          {item.assigneeName ? (
            <span className="yp-today-item-card__badge yp-today-item-card__badge--assignee">
              {item.assigneeColor ? (
                <Avatar
                  name={item.assigneeName}
                  color={item.assigneeColor}
                  size={14}
                />
              ) : null}
              {item.assigneeName}
            </span>
          ) : null}

          {/* Upcoming date badge (only if no time display in Row 1) */}
          {isUpcoming &&
          item.itemDate &&
          item.itemDate !== todayStr &&
          !timeDisplay ? (
            <span className="yp-today-item-card__badge">
              {/* ★ r64: ลด icon จาก 11×11 → 10×10 ให้สมดุลกับ type scale ใหม่ */}
              <CalIcon width={10} height={10} />
              จะเริ่ม {relativeDay(item.itemDate)}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Popup menu ── */}
      {isMenuOpen ? (
        <>
          <div
            className="yp-today-item-card__popup-overlay"
            onClick={(e) => {
              e.stopPropagation();
              onCloseMenu();
            }}
            aria-hidden="true"
          />
          <div className="yp-today-item-card__popup" role="menu">
            <button
              type="button"
              className="yp-today-item-card__popup-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onViewMore(item);
              }}
            >
              {/* ★ r64: ลด icon จาก 14×14 → 13×13 ให้สมดุลกับ type scale ใหม่ */}
              <Eye width={13} height={13} />
              ดูเพิ่มเติม
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
