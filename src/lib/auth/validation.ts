/**
 * ============================================================
 * YP WORK - Auth - Validation Helpers (r48)
 * ============================================================
 * Field validators สำหรับ form inputs
 * - synthesizeEmail (จากรหัสนักเรียน -> email)
 * - validateNationalId (13 digit)
 * - validateStudentCode (5 digit)
 * - validateEmail
 * - validatePassword (>=6 chars)
 * ============================================================
 */

/** สังเคราะห์ email จากรหัสนักเรียน (เหมือน YP Labs) */
export function synthesizeEmail(studentId: string): string {
  return `student_${studentId}@yplabs.internal`;
}

/** Validate national ID (13 หลัก) */
export function validateNationalId(nationalId: string): boolean {
  return /^\d{13}$/.test(nationalId.replace(/\D/g, ''));
}

/** Validate student code (5 หลัก) */
export function validateStudentCode(studentCode: string): boolean {
  return /^\d{5}$/.test(studentCode.replace(/\D/g, ''));
}

/** Validate email format */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validate password (≥6 ตัว) */
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}
