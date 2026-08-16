'use client';

/**
 * ============================================================
 * YP WORK - Today Module - TodayItemCard
 * ============================================================
 * Card สำหรับแสดง 1 รายการใน Today dashboard
 * - 4-Row Layout: metadata → title → parent → badges
 * - Subtask Clarity: left accent bar + tinted bg + "↳ รายการย่อย" label
 *
 * Round 12: Removed overdue badge — no status system.
 * ============================================================
 */

import * as React from 'react';
import {
  Calendar as CalIcon,
  Flag,
  Clock,
  Layers,
  MoreHorizontal,
  Users,
  MapPin,
  Timer,
  CornerDownRight,
  Eye,
} from 'lucide-react';
import { Avatar } from '@/components/framework/avatar';
import { relativeDay } from '@/lib/utils/date';
import type { TimelineItem } from './today-types';
import { PRIORITY_LBL } from './today-types';
import { formatCardTimeDisplay } from './today-format';

export function TodayItemCard({
  item,
  todayStr,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onViewMore,
}: {
  item: TimelineItem;
  todayStr: string;
  isMenuOpen: boolean;
  onOpenMenu: (item: TimelineItem) => void;
  onCloseMenu: () => void;
  onViewMore: (item: TimelineItem) => void;
}) {
  const accent = item.accent;
  const isUpcoming = item.dateContext === 'upcoming';
  const priority = item.priority || 'medium';
  const priorityLbl = PRIORITY_LBL[priority] || 'ปกติ';
  const isSubItem = !!item.parentEvent && !!item.task;

  const timeDisplay = formatCardTimeDisplay(item, todayStr);

  return (
    <div
      className={`yp-today-item-card${isSubItem ? ' is-subitem' : ''}${isMenuOpen ? ' is-menu-open' : ''}`}
      style={{ ['--accent' as string]: accent }}
      aria-label={`${item.title}${isSubItem ? ' (รายการย่อย)' : ''}`}
    >
      <div className="yp-today-item-card__body">
        {/* Row 1: Subtask label + Time + Menu */}
        <div className="yp-today-item-card__top-row">
          {isSubItem ? (
            <span className="yp-today-item-card__subtag">
              <CornerDownRight width={10} height={10} strokeWidth={2.5} />
              รายการย่อย
            </span>
          ) : (
            <span className="yp-today-item-card__type-tag">
              <Flag width={10} height={10} strokeWidth={2.5} />
              รายการหลัก
            </span>
          )}

          <div className="yp-today-item-card__top-right">
            {timeDisplay ? (
              <span className="yp-today-item-card__time">
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
              <MoreHorizontal width={15} height={15} />
            </button>
          </div>
        </div>

        {/* Row 2: Title */}
        <div className="yp-today-item-card__title">
          {isSubItem ? (
            <Layers
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
            <Users width={11} height={11} />
            <span className="yp-today-item-card__group-label">
              จากกลุ่ม:
            </span>
            <span className="yp-today-item-card__group-name">
              {item.parentEvent.title}
            </span>
          </div>
        ) : null}

        {/* Row 4: Badges (priority, location, estimated time, assignee, upcoming date) */}
        <div className="yp-today-item-card__badges">
          {priority !== 'medium' ? (
            <span
              className={`yp-today-item-card__badge yp-today-item-card__badge--priority is-priority-${priority}`}
            >
              {priorityLbl}
            </span>
          ) : null}

          {item.location ? (
            <span className="yp-today-item-card__badge">
              <MapPin width={10} height={10} />
              {item.location}
            </span>
          ) : null}

          {item.estimatedTime ? (
            <span className="yp-today-item-card__badge">
              <Timer width={10} height={10} />
              {item.estimatedTime}
            </span>
          ) : null}

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

          {isUpcoming &&
          item.itemDate &&
          item.itemDate !== todayStr &&
          !timeDisplay ? (
            <span className="yp-today-item-card__badge">
              <CalIcon width={10} height={10} />
              จะเริ่ม {relativeDay(item.itemDate)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Popup menu */}
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
              <Eye width={13} height={13} />
              ดูเพิ่มเติม
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
