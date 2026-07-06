'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · InfoButton (v2.0.0 — onboarding & help system)
// ═══════════════════════════════════════════════════════════════
// ปุ่มข้อมูล (i) สำหรับอธิบายจุดต่าง ๆ ในระบบ
// - คลิกเพื่อเปิด popover แสดงคำอธิบายสั้น ๆ
// - รองรับ title + body (รองรับ ReactNode สำหรับ formatting)
// - ใช้ Radix Popover → ปิดได้ด้วย click นอก / Escape / ปุ่มปิด
// - ขนาดเล็ก ไม่บังเนื้อหา — fit ในจุดที่มีพื้นที่จำกัด
// - aria-label สำหรับ screen reader
// - ป้องกัน event bubbling เพื่อไม่ให้ trigger parent onClick
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface InfoButtonProps {
  /** หัวข้อสั้น ๆ ของคำอธิบาย */
  title?: React.ReactNode;
  /** เนื้อหาคำอธิบาย (รองรับ ReactNode เช่น list, code, strong) */
  content: React.ReactNode;
  /** ขนาดของ icon: 'sm' (14px) | 'md' (16px) | 'lg' (18px) — default 'sm' */
  size?: 'sm' | 'md' | 'lg';
  /** ตำแหน่ง popover สัมพันธ์กับ trigger — default 'top' */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** การจัดวางแนวนอนของ popover — default 'center' */
  align?: 'start' | 'center' | 'end';
  /** className เพิ่มเติมสำหรับ trigger button */
  className?: string;
  /** ปิด hover-to-open (default เปิดแค่ click) */
  /** aria-label สำหรับ screen reader — default 'ข้อมูลเพิ่มเติม' */
  ariaLabel?: string;
}

export function InfoButton({
  title,
  content,
  size = 'sm',
  side = 'top',
  align = 'center',
  className,
  ariaLabel = 'ข้อมูลเพิ่มเติม',
}: InfoButtonProps) {
  const [open, setOpen] = React.useState(false);

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
  const btnSize = size === 'sm' ? 22 : size === 'md' ? 26 : 30;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`yp-info-btn${className ? ` ${className}` : ''}`}
          aria-label={ariaLabel}
          // ป้องกัน click ไป trigger parent (เช่น card click หรือ form submit)
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={{
            width: btnSize,
            height: btnSize,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid var(--yp-border, rgba(99, 102, 241, 0.25))',
            background: 'rgba(99, 102, 241, 0.08)',
            color: 'var(--yp-indigo-600, #4F46E5)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
            flexShrink: 0,
            verticalAlign: 'middle',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
          }}
        >
          <Info size={iconSize} strokeWidth={2.2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className="yp-info-popover"
        style={{
          maxWidth: 320,
          padding: 0,
          border: '1px solid var(--yp-border, rgba(0,0,0,0.08))',
          borderRadius: 'var(--yp-radius-md, 12px)',
          background: 'var(--yp-bg-surface, #FFFFFF)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '12px 14px 10px',
            borderBottom: title ? '1px solid var(--yp-border, rgba(0,0,0,0.06))' : 'none',
          }}
        >
          {title ? (
            <div
              style={{
                fontSize: '0.92em',
                fontWeight: 600,
                color: 'var(--yp-text-heading, #1E293B)',
                flex: 1,
                lineHeight: 1.4,
              }}
            >
              {title}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="ปิด"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--yp-text-muted, #64748B)',
              padding: 0,
              display: 'inline-flex',
              flexShrink: 0,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div
          style={{
            padding: '10px 14px 12px',
            fontSize: '0.88em',
            lineHeight: 1.6,
            color: 'var(--yp-text-body, #334155)',
          }}
        >
          {content}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Helper component: แสดง InfoButton คู่กับ label
 * ใช้สำหรับ field labels ใน form — แสดงเป็น "label ⓘ"
 */
export function InfoLabel({
  children,
  info,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  info: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
      {required ? <span className="yp-required">*</span> : null}
      <InfoButton content={info} size="sm" side="right" align="start" />
    </label>
  );
}
