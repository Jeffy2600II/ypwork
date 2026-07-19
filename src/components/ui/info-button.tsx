'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · InfoButton (v3.1.0 — ใช้ Window Framework)
// ═══════════════════════════════════════════════════════════════
// ปุ่มข้อมูล (i) แบบ mobile-app — คลิกแล้วเปิด "docs sheet" ขึ้นมา
//
// v3.1.0 — ใช้ Window Framework (type="sheet") แทน CSS แยก:
//   ✓ รองรับ nested popups (เปิด sheet แล้วเปิด sheet ละเอียดในได้)
//   ✓ ปิด bottom-nav/FAB อัตโนมัติ (ผ่าน body.yp-window-open)
//   ✓ Drag-to-dismiss smooth (ตามนิ้ว 1:1)
//   ✓ Backdrop close animation ครบถ้วน
//   ✓ Stack manager จัดการ z-index + ESC + back-button
//
// หลักการออกแบบ (mobile-first, app-style):
// - ใช้ bottom sheet ที่ slide ขึ้นจากล่าง — เหมือน native app
// - รองรับเนื้อหายาว — มี scroll, มี grip handle, มี header sticky
// - รองรับรูป, list, section, code — ผ่าน ReactNode content
// - ปิดได้ 4 ทาง: tap backdrop / กดปุ่ม X / กด Escape / swipe down
// - ไม่บล็อก parent onClick ของ card ที่ห่ออยู่
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { Info } from 'lucide-react';
import { Window } from '@/components/framework/window';

export interface InfoButtonProps {
  /**
   * เนื้อหา docs — ใช้ <InfoSheetHeader> เป็นหัวข้อ + ส่วนอธิบายข้างในได้
   * รองรับ ReactNode ทุกประเภท (text, list, image, code, section)
   */
  content: React.ReactNode;
  /** ขนาดของ icon: 'sm' (14px) | 'md' (16px) | 'lg' (18px) — default 'sm' */
  size?: 'sm' | 'md' | 'lg';
  /** className เพิ่มเติมสำหรับ trigger button */
  className?: string;
  /** aria-label สำหรับ screen reader — default 'ข้อมูลเพิ่มเติม' */
  ariaLabel?: string;
}

export function InfoButton({
  content,
  size = 'sm',
  className,
  ariaLabel = 'ข้อมูลเพิ่มเติม',
}: InfoButtonProps) {
  const [open, setOpen] = React.useState(false);

  const iconSize = size === 'sm' ? 15 : size === 'md' ? 17 : 19;
  const btnSize = size === 'sm' ? 32 : size === 'md' ? 36 : 40;

  return (
    <>
      <button
        type="button"
        className={`yp-info-btn${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        style={{
          width: btnSize,
          height: btnSize,
        }}
      >
        <Info size={iconSize} strokeWidth={2.2} />
      </button>

      <Window
        type="sheet"
        open={open}
        onClose={() => setOpen(false)}
        size="tall"
        hideHandle={false}
        hideCloseButton={false}
      >
        <div className="yp-info-sheet__inner">{content}</div>
      </Window>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helper components สำหรับเขียน docs content ที่สวยงาม
// ─────────────────────────────────────────────────────────────────

/** หัวข้อบนสุดของ sheet — ใช้เป็น <InfoSheetHeader>ภายใน content</InfoSheetHeader> */
export function InfoSheetHeader({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="yp-info-sheet__header">
      {icon ? <div className="yp-info-sheet__header-icon">{icon}</div> : null}
      <div className="yp-info-sheet__header-text">
        <h2 className="yp-info-sheet__title">{title}</h2>
        {subtitle ? (
          <p className="yp-info-sheet__subtitle">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

/** หัวข้อ section ในเนื้อหา — ใช้แบ่งหมวด */
export function InfoSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="yp-info-sheet__section-title">{children}</h3>;
}

/** ตัวอย่าง/กล่องเน้นข้อความ */
export function InfoExample({
  label = 'ตัวอย่าง',
  children,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="yp-info-sheet__example">
      <div className="yp-info-sheet__example-label">{label}</div>
      <div className="yp-info-sheet__example-body">{children}</div>
    </div>
  );
}

/** รายการตัวเลือกแบบ "เลือกอันนี้แล้วจะเป็นยังไง" */
export function InfoOption({
  name,
  children,
}: {
  name: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="yp-info-sheet__option">
      <div className="yp-info-sheet__option-name">{name}</div>
      <div className="yp-info-sheet__option-body">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Discussion-style docs helpers
// ─────────────────────────────────────────────────────────────────

/** แท็กเล็ก ๆ สำหรับ keyword / tag — เน้นคำสำคัญให้กระโดดเข้าตา */
export function InfoPill({ children }: { children: React.ReactNode }) {
  return <span className="yp-info-pill">{children}</span>;
}

export type InfoCalloutType = 'tip' | 'warn' | 'info' | 'danger';

/** กล่องเน้นข้อความ สำหรับ tip / warning / info / danger */
export function InfoCallout({
  type = 'info',
  title,
  children,
}: {
  type?: InfoCalloutType;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`yp-info-callout yp-info-callout--${type}`}>
      {title ? <div className="yp-info-callout__title">{title}</div> : null}
      <div className="yp-info-callout__body">{children}</div>
    </div>
  );
}

/** ลำดับขั้นตอนแบบมีตัวเลข — ใช้สำหรับอธิบาย flow / process */
export function InfoSteps({ children }: { children: React.ReactNode }) {
  return <div className="yp-info-steps">{children}</div>;
}

export function InfoStep({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="yp-info-step">
      <div className="yp-info-step__marker" aria-hidden="true" />
      <div className="yp-info-step__content">
        <div className="yp-info-step__title">{title}</div>
        <div className="yp-info-step__body">{children}</div>
      </div>
    </div>
  );
}

/** ตาราง key-value แบบ 2 คอลัมน์ — ใช้แสดง metadata / ข้อมูลจำเพาะ */
export function InfoKeyValue({ children }: { children: React.ReactNode }) {
  return <div className="yp-info-keyvalue">{children}</div>;
}

export function InfoKeyValueRow({
  k,
  v,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
}) {
  return (
    <div className="yp-info-keyvalue__row">
      <div className="yp-info-keyvalue__k">{k}</div>
      <div className="yp-info-keyvalue__v">{v}</div>
    </div>
  );
}

/** กล่องเปรียบเทียบ 2 ตัวเลือกแบบ side-by-side */
export interface InfoCompareSide {
  title: React.ReactNode;
  tone?: 'accent' | 'default';
  items?: React.ReactNode[];
  children?: React.ReactNode;
}

export function InfoCompare({
  left,
  right,
}: {
  left: InfoCompareSide;
  right: InfoCompareSide;
}) {
  return (
    <div className="yp-info-compare">
      <InfoCompareCol side={left} position="left" />
      <div className="yp-info-compare__vs" aria-hidden="true">VS</div>
      <InfoCompareCol side={right} position="right" />
    </div>
  );
}

function InfoCompareCol({
  side,
  position,
}: {
  side: InfoCompareSide;
  position: 'left' | 'right';
}) {
  return (
    <div
      className={`yp-info-compare__col yp-info-compare__col--${position}${
        side.tone === 'accent' ? ' is-accent' : ''
      }`}
    >
      <div className="yp-info-compare__title">{side.title}</div>
      {side.items && side.items.length > 0 ? (
        <ul className="yp-info-compare__items">
          {side.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null}
      {side.children ? (
        <div className="yp-info-compare__body">{side.children}</div>
      ) : null}
    </div>
  );
}

/** กล่อง quote — ใช้สำหรับตัวอย่างคำพูด / สถานการณ์จำลอง */
export function InfoQuote({
  children,
  author,
}: {
  children: React.ReactNode;
  author?: React.ReactNode;
}) {
  return (
    <blockquote className="yp-info-quote">
      <div className="yp-info-quote__body">{children}</div>
      {author ? <div className="yp-info-quote__author">— {author}</div> : null}
    </blockquote>
  );
}

/** ไฮไลต์ข้อความสั้น ๆ ใน paragraph — เน้น keyword สำคัญ */
export function InfoHighlight({ children }: { children: React.ReactNode }) {
  return <mark className="yp-info-highlight">{children}</mark>;
}

/** กล่อง "TL;DR" — สรุปประเด็นสำคัญไว้บนสุด */
export function InfoTldr({ children }: { children: React.ReactNode }) {
  return (
    <div className="yp-info-tldr">
      <div className="yp-info-tldr__label">สรุปสั้น ๆ</div>
      <div className="yp-info-tldr__body">{children}</div>
    </div>
  );
}

/** Helper component: แสดง InfoButton คู่กับ label */
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
      <InfoButton content={info} size="sm" />
    </label>
  );
}
