// ═══════════════════════════════════════════════════════════════
// YP WORK · ID Generator (v3.4.0)
// ═══════════════════════════════════════════════════════════════
// สร้าง unique ID ฝั่ง server สำหรับ event/task — ป้องกัน user กำหนดเอง
//
// Format: <prefix>_<timestamp_base36>_<random_8_chars>
//   - prefix: บอกประเภท entity (ev = event, tk = task)
//   - timestamp: เรียงเวลาแบบ lexicographic ได้
//   - random: ป้องกันการเดาลำดับ
// ═══════════════════════════════════════════════════════════════

const RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomString(length: number): string {
  let out = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += RANDOM_CHARS[bytes[i] % RANDOM_CHARS.length];
  }
  return out;
}

function timestampBase36(): string {
  // ใช้ Date.now() แล้วแปลงเป็น base36 (เก็บในตัวอักษรน้อย)
  return Date.now().toString(36);
}

export function createId(prefix: string): string {
  return `${prefix}_${timestampBase36()}_${randomString(8)}`;
}
