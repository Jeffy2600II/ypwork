// ═══════════════════════════════════════════════════════════════
// YP WORK · User Color Helper (v3.7.0)
// ═══════════════════════════════════════════════════════════════
// Generate deterministic color จาก user's auth_uid หรือ full_name
//
// ★ ทำไมต้องมี helper นี้?
//   ก่อนหน้านี้: ระบบ query `council_users.color` จาก DB แต่ column นี้ไม่มีอยู่จริง
//   → ทำให้ API หลายตัว error "column council_users.color does not exist"
//
//   ตอนนี้: ใช้ deterministic color generation จาก auth_uid
//   → แต่ละ user จะได้สีที่คงที่เสมอ (ไม่เปลี่ยนทุกครั้งที่ reload)
//   → ไม่ต้อง query จาก DB → ลด round-trip + ไม่ error
//
// ★ Algorithm:
//   1. Hash auth_uid ด้วย simple hash function
//   2. Map hash → hue (0-360)
//   3. ใช้ HSL ที่ saturation + lightness คงที่ → สีที่สวยและอ่านง่าย
// ═══════════════════════════════════════════════════════════════

// ชุดสีที่คัดสรรแล้ว — สวยและอ่านง่ายบนพื้นขาว
const USER_COLORS = [
  '#4F46E5', // indigo
  '#7C3AED', // violet
  '#A855F7', // purple
  '#EC4899', // pink
  '#F43F5E', // rose
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#EAB308', // yellow
  '#84CC16', // lime
  '#22C55E', // green
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
];

/**
 * Simple hash function สำหรับ string → number
 * (ไม่ cryptographic แค่ต้องการ distribution ที่ดีพอ)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic color จาก user identifier
 *
 * @param identifier - auth_uid, full_name, หรือ string อื่น ๆ
 * @returns hex color string (เช่น '#4F46E5')
 *
 * Usage:
 *   const color = getUserColor(user.auth_uid);
 *   // หรือ
 *   const color = getUserColor(user.full_name);
 */
export function getUserColor(identifier: string | null | undefined): string {
  if (!identifier) return USER_COLORS[0];
  const hash = hashString(identifier);
  return USER_COLORS[hash % USER_COLORS.length];
}

/**
 * Generate color จากหลาย fields (เช่น auth_uid + full_name)
 * ใช้เมื่อต้องการ color ที่ unique มากขึ้น
 */
export function getUserColorFromFields(
  authUid: string | null | undefined,
  fullName: string | null | undefined
): string {
  // 优先ใช้ auth_uid (คงที่กว่า)
  if (authUid) return getUserColor(authUid);
  if (fullName) return getUserColor(fullName);
  return USER_COLORS[0];
}
