// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · Input Validation (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// Server-side input validation ที่เข้มงวดกว่า client
//
// หลักการ:
//   - ไม่เชื่อ input จาก client เด็ดขาด
//   - validate + sanitize ทุก field ที่เข้ามาผ่าน API
//   - reject early ก่อนเข้า DB
//   - error message กลางซื้อ (ไม่ leak รายละเอียด internal)
//
// ★ National ID validation (Thailand):
//   - ต้องเป็นตัวเลข 13 หลัก
//   - หลักสุดท้ายเป็น check digit คำนวณจาก 12 หลักแรก
//   - algorithm: sum(digit[i] × (13 - i)) mod 11, แล้ว (11 - sum) mod 10
//   - ถ้า check digit ไม่ตรง = invalid
//
// ★ Email validation:
//   - regex ตรวจ format คร่าว ๆ
//   - จำกัดความยาว ≤ 254 (RFC 5321)
//   - lowercase + trim
//
// ★ Student code:
//   - ต้องเป็นตัวเลข 5 หลัก
//   - ไม่มี leading zero ในการ compare แต่เก็บเป็น string
//
// ★ Password:
//   - อย่างน้อย 6 ตัว (basic)
//   - จำกัด ≤ 128 ตัว (กัน DoS จาก bcrypt/argon)
//   - ไม่มี whitespace ที่ไม่จำเป็น
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
}

/** ตัด whitespace ทั้งหน้า/หลัง/ระหว่าง ออกจาก string */
function cleanString(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Validate Thai National ID (13 digits + check digit)
 * ไม่ส่งคืนค่าจริง ๆ — แค่บอก valid หรือไม่
 * ใช้กลางซื้อเพื่อกัน enumeration
 */
export function validateThaiNationalId(input: string): boolean {
  const cleaned = String(input).replace(/\D/g, '');
  if (!/^\d{13}$/.test(cleaned)) return false;

  // คำนวณ check digit
  const digits = cleaned.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === digits[12];
}

/**
 * Validate + sanitize national ID
 * - ผ่านเข้ามาเป็น string อะไรก็ได้
 * - ออกไปเป็น 13 หลัก string ที่ผ่าน check digit
 */
export function validateNationalIdInput(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: 'รูปแบบเลขบัตรประชาชนไม่ถูกต้อง' };
  }
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length !== 13) {
    return { valid: false, error: 'เลขบัตรประชาชนต้องมี 13 หลัก' };
  }
  if (!validateThaiNationalId(cleaned)) {
    return { valid: false, error: 'เลขบัตรประชาชนไม่ถูกต้อง' };
  }
  return { valid: true, value: cleaned };
}

/** Validate student code (5 digits) */
export function validateStudentCodeInput(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: 'รูปแบบรหัสนักเรียนไม่ถูกต้อง' };
  }
  const cleaned = input.replace(/\D/g, '');
  if (!/^\d{5}$/.test(cleaned)) {
    return { valid: false, error: 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก' };
  }
  return { valid: true, value: cleaned };
}

/** Validate + sanitize email */
export function validateEmailInput(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  const cleaned = input.trim().toLowerCase();
  if (cleaned.length === 0) {
    return { valid: false, error: 'กรุณากรอกอีเมล' };
  }
  if (cleaned.length > 254) {
    return { valid: false, error: 'อีเมลยาวเกินไป' };
  }
  // RFC 5322 simplified
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  return { valid: true, value: cleaned };
}

/** Validate password */
export function validatePasswordInput(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }
  if (input.length < 6) {
    return { valid: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว' };
  }
  if (input.length > 128) {
    return { valid: false, error: 'รหัสผ่านยาวเกินไป' };
  }
  // ตรวจ control characters
  if (/[\x00-\x1F\x7F]/.test(input)) {
    return { valid: false, error: 'รหัสผ่านมีอักขระที่ไม่รองรับ' };
  }
  return { valid: true, value: input };
}

/** Validate full name (Thai/English letters, spaces, 1-100 chars) */
export function validateFullNameInput(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: 'ชื่อ-นามสกุลไม่ถูกต้อง' };
  }
  const cleaned = cleanString(input);
  if (cleaned.length < 2) {
    return { valid: false, error: 'กรุณากรอกชื่อ-นามสกุล' };
  }
  if (cleaned.length > 100) {
    return { valid: false, error: 'ชื่อ-นามสกุลยาวเกินไป' };
  }
  // อนุญาตตัวอักษรไทย/อังกฤษ + จุด + วงเล็บ + ขีดกลาง + ช่องว่าง
  // ป้องกัน HTML/script injection ผ่านชื่อ
  if (!/^[\u0E00-\u0E7Fa-zA-Z.\-\s()]+$/.test(cleaned)) {
    return { valid: false, error: 'ชื่อ-นามสกุลมีอักขระที่ไม่รองรับ' };
  }
  return { valid: true, value: cleaned };
}

/** Validate UUID (for IDs from DB) */
export function validateUuidInput(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: 'ID ไม่ถูกต้อง' };
  }
  const cleaned = input.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned)) {
    return { valid: false, error: 'ID ไม่ถูกต้อง' };
  }
  return { valid: true, value: cleaned.toLowerCase() };
}

/** Validate year (2567-2599 ตามระบบการศึกษาไทย) */
export function validateYearInput(input: unknown): ValidationResult<number> {
  const num = typeof input === 'number' ? input : parseInt(String(input), 10);
  if (!Number.isFinite(num)) {
    return { valid: false, error: 'ปีการศึกษาไม่ถูกต้อง' };
  }
  if (num < 2500 || num > 2600) {
    return { valid: false, error: 'ปีการศึกษาไม่อยู่ในช่วงที่รองรับ' };
  }
  return { valid: true, value: num };
}

/**
 * Sanitize string ที่จะแสดงผล (กัน XSS)
 * - ใช้สำหรับ input ที่จะ render กลับไปเป็น HTML
 * - escape < > & " '
 *
 * ★ Note: React จะ escape ให้อัตโนมัติ — แต่ถ้าใช้ dangerouslySetInnerHTML
 *   ต้องเรียก function นี้ก่อนเสมอ
 */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * ตรวจว่า string มีลักษณะ SQL injection pattern หรือไม่
 * (basic — ไม่ใช่ substitute สำหรับ parameterized queries)
 */
export function looksLikeSqlInjection(input: string): boolean {
  const lower = input.toLowerCase();
  const patterns = [
    /(\bunion\b\s+\bselect\b)/,
    /(\bor\b\s+\d+\s*=\s*\d+)/,
    /(\band\b\s+\d+\s*=\s*\d+)/,
    /(;\s*(drop|delete|insert|update)\b)/,
    /(--\s*$)/m,
    /(\/\*[\s\S]*?\*\/)/,
  ];
  return patterns.some((p) => p.test(lower));
}
