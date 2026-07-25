/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Auth · Public Airlock (r52)
 * ═══════════════════════════════════════════════════════════════
 * Barrel export สำหรับ auth-related UI components
 *
 * Components:
 *   - PasswordField → input ประเภท password พร้อม show/hide toggle
 *     ใช้แทน <input type="password"> เพื่อให้ browser จับคู่กับ
 *     username field ได้ และถาม "บันทึกรหัสผ่าน?" หลัง login สำเร็จ
 * ═══════════════════════════════════════════════════════════════
 */

export { PasswordField } from './password-field';
export type { PasswordFieldProps } from './password-field';
