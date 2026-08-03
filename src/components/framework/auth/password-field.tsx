'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Framework · Auth · PasswordField (r52)
// ═══════════════════════════════════════════════════════════════
// Reusable password input with show/hide toggle.
//
// ★ r52 การแก้ปัญหา:
//   ก่อนหน้านี้ browser ไม่รับรู้ว่า input ไหนคือ username และ password
//   ทำให้ browser ไม่ถาม "บันทึกรหัสผ่านไหม?" หลัง login สำเร็จ
//
//   วิธีแก้:
//   1. ใช้ type="password" บน input ที่เป็นรหัสผ่าน (บังคับ — browser
//      ต้องการ type="password" เพื่อเปิด password manager)
//   2. ใช้ autoComplete="current-password" (login) หรือ "new-password" (register)
//   3. เพิ่ม show/hide toggle เพื่อให้ user ดูรหัสได้ (5 หลัก ดูได้สบาย)
//
// มุมมองผู้ใช้:
//   - หลัง login สำเร็จ browser ถาม "บันทึกรหัสผ่านไหม?"
//   - ครั้งต่อไป browser autofill ให้ทันที
//   - ถ้าอยากดูรหัสที่พิมพ์ กดปุ่มตาได้
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** โชว์ toggle ปุ่มตา (default: true) */
  showToggle?: boolean;
  /** className ของ toggle button */
  toggleClassName?: string;
}

/**
 * PasswordField — input ประเภท password พร้อม show/hide toggle
 *
 * Pattern:
 * ```tsx
 * <PasswordField
 *   id="password"
 *   name="password"
 *   autoComplete="current-password"
 *   placeholder="••••••••"
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 * />
 * ```
 *
 * หมายเหตุ:
 *   - ใช้ type="password" เสมอเมื่อซ่อน (browser ต้องการ type="password"
 *     เพื่อเปิด password manager)
 *   - เมื่อ user กด toggle จะเปลี่ยนเป็น type="text" ชั่วคราว
 *   - ใช้ inputMode="numeric" ได้กรณีเป็นตัวเลขล้วน (เช่น student code)
 */
export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(function PasswordField(
  { showToggle = true, toggleClassName, className, ...inputProps },
  forwardedRef
) {
  const [visible, setVisible] = React.useState(false);
  const internalRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(
    forwardedRef,
    () => internalRef.current as HTMLInputElement,
    []
  );

  const handleToggle = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setVisible((v) => !v);
      // refocus กลับไปที่ input หลัง toggle
      requestAnimationFrame(() => {
        internalRef.current?.focus();
      });
    },
    []
  );

  return (
    <div
      className="yp-password-field"
      data-visible={visible ? 'true' : 'false'}
    >
      <input
        {...inputProps}
        ref={internalRef}
        type={visible ? 'text' : 'password'}
        className={className}
      />
      {showToggle ? (
        <button
          type="button"
          className={`yp-password-field__toggle${toggleClassName ? ' ' + toggleClassName : ''}`}
          onClick={handleToggle}
          aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
});
