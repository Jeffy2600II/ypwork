// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · PII Protection (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// PII (Personally Identifiable Information) Protection
// สำหรับข้อมูลส่วนตัว: เลขบัตรประชาชน, ชื่อ, อีเมล, รหัสนักเรียน
//
// ★ หลักการ:
//   - ไม่ log PII ลง console หรือ external service เด็ดขาด
//   - ไม่ส่ง PII กลับไปใน API response ถ้าไม่จำเป็น
//   - mask ข้อมูลเวลาแสดงผล (เช่น "1-2345-67890-12-3" → "1XXX-XXXXX-X-X")
//   - เก็บ PII ใน DB เท่านั้น และจำกัดการเข้าถึงด้วย RLS
//
// ★ ข้อมูลที่นิยามว่าเป็น PII ใน YP Work:
//   - national_id (เลขบัตรประชาชน 13 หลัก) — SENSITIVE
//   - student_code (รหัสนักเรียน 5 หลัก) — เป็น password ด้วย → SENSITIVE
//   - full_name (ชื่อ-นามสกุล) — PERSONAL
//   - email — PERSONAL
//   - phone (ถ้ามี) — PERSONAL
// ═══════════════════════════════════════════════════════════════

/**
 * Mask เลขบัตรประชาชน 13 หลัก
 * "1234567890123" → "1-XXXX-XXXXX-X-X" (เห็นเฉพาะหลักแรกและท้าย)
 *
 * ⚠️ ใช้สำหรับ log/display เท่านั้น — ห้ามเก็บค่า masked ใน DB
 */
export function maskNationalId(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = String(input).replace(/\D/g, '');
  if (cleaned.length !== 13) return '***';
  // เก็บหลักแรก + mask 11 หลักกลาง + เก็บหลักสุดท้าย
  return `${cleaned[0]}-XXXX-XXXXX-X-${cleaned[12]}`;
}

/**
 * ★ v3.8.0: Format Thai national ID with dashes for UI display only.
 *
 * Thai national ID format: X-XXXX-XXXXX-XX-X (13 digits, 4 dashes)
 *   - 1 digit
 *   - 4 digits
 *   - 5 digits
 *   - 2 digits
 *   - 1 digit (check digit)
 *
 * Input may contain anything (digits + existing dashes + spaces).
 * Output: only digits, formatted with dashes at the correct positions.
 *
 * Example:
 *   "1234567890123"     → "1-2345-67890-12-3"
 *   "1-2345-67890-12-3" → "1-2345-67890-12-3"
 *   "12345"             → "1-2345"
 *   ""                  → ""
 *
 * ⚠️ This is UI-only formatting. The DB stored value should be stripped
 *    with stripNonDigits() before save — never persist the dashes.
 */
export function formatThaiNationalId(input: string | null | undefined): string {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '').slice(0, 13);
  if (digits.length === 0) return '';

  // Build with dashes: X | XXXX | XXXXX | XX | X
  const parts: string[] = [digits.slice(0, 1)];
  if (digits.length > 1) parts.push(digits.slice(1, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 10));
  if (digits.length > 10) parts.push(digits.slice(10, 12));
  if (digits.length > 12) parts.push(digits.slice(12, 13));
  return parts.join('-');
}

/**
 * ★ v3.8.0: Strip all non-digit characters from a string.
 * Used before saving national ID / student code / phone numbers
 * to ensure DB only stores the pure numeric value (no UI dashes).
 *
 * "1-2345-67890-12-3" → "1234567890123"
 * "12345"             → "12345"
 * ""                  → ""
 */
export function stripNonDigits(input: string | null | undefined): string {
  if (!input) return '';
  return String(input).replace(/\D/g, '');
}

/**
 * Mask รหัสนักเรียน (เป็น password ด้วย)
 * "12345" → "•••••" (ทั้งหมด)
 */
export function maskStudentCode(input: string | null | undefined): string {
  if (!input) return '';
  return '•'.repeat(Math.min(String(input).length, 10));
}

/**
 * Mask email
 * "teacher@school.ac.th" → "t***@school.ac.th"
 * "a@b.co" → "***@b.co" (สั้นเกินไป)
 */
export function maskEmail(input: string | null | undefined): string {
  if (!input) return '';
  const email = String(input).trim().toLowerCase();
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (local.length <= 1) return `***${domain}`;
  return `${local[0]}***${domain}`;
}

/**
 * Mask ชื่อ-นามสกุล
 * "สมชาย ใจดี" → "ส*** ใ***"
 * "John Doe" → "J*** D***"
 */
export function maskFullName(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? '•' : `${part[0]}${'•'.repeat(Math.min(part.length - 1, 4))}`))
    .join(' ');
}

/**
 * Sanitize object สำหรับ log
 * แทนที่ field ที่เป็น PII ด้วยค่า masked
 *
 * Usage:
 *   console.log('request:', sanitizeForLog({ national_id, student_code, email, name }))
 *   // → { national_id: '1-XXXX-XXXXX-X-X', student_code: '•••••', email: 't***@...', name: 'ส*** ใ***' }
 */
export function sanitizeForLog<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (lowerKey.includes('national_id') || lowerKey === 'nationalid' || lowerKey === 'nid') {
      result[key] = maskNationalId(String(value));
    } else if (lowerKey.includes('student_code') || lowerKey === 'studentcode' || lowerKey === 'studentcode5') {
      result[key] = maskStudentCode(String(value));
    } else if (lowerKey === 'password' || lowerKey === 'pwd' || lowerKey === 'pass') {
      result[key] = '***REDACTED***';
    } else if (lowerKey === 'email') {
      result[key] = maskEmail(String(value));
    } else if (lowerKey.includes('full_name') || lowerKey === 'fullname' || lowerKey === 'name') {
      result[key] = maskFullName(String(value));
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForLog(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * ตรวจว่ามี PII ใน message หรือไม่ (เช่น ก่อน console.error)
 * ถ้ามี → return masked version
 */
export function redactPiiFromMessage(message: string): string {
  if (!message) return message;
  let result = message;
  // 13 หลักติดกัน → mask
  result = result.replace(/\b\d{13}\b/g, '[REDACTED:NATIONAL_ID]');
  // email
  result = result.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[REDACTED:EMAIL]');
  return result;
}

/**
 * สร้าง hash แบบ short สำหรับ lookup (เช่น hash national_id สำหรับ index)
 * ไม่ใช่ cryptographic — ใช้สำหรับ non-reversible lookup เท่านั้น
 *
 * ★ Note: ถ้าต้องการ reversible encryption ใช้ Supabase Vault
 *   หรือ AWS KMS — แต่ YP Work ไม่จำเป็นต้องถึงขนาดนั้น
 *   เพราะข้อมูลอยู่หลัง RLS อยู่แล้ว
 */
export function shortHash(input: string): string {
  let hash = 0;
  const str = String(input);
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}
