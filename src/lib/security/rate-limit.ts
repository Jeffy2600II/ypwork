// ═══════════════════════════════════════════════════════════════
// YP WORK · Security · Rate Limiter (v3.0.0)
// ═══════════════════════════════════════════════════════════════
// In-memory sliding-window rate limiter สำหรับ API routes
//
// เหตุผลที่ใช้ in-memory (ไม่ใช่ Redis):
//   - YP Work เป็น internal app ผู้ใช้จำกัด
//   - ต้องการ zero-infrastructure (deploy ได้ทุก environment)
//   - ป้องกัน abuse ที่ระดับ "รั่วไหลจาก script brute force" ได้พอ
//   - ถ้ามีหลาย instance ในอนาคต สามารถเปลี่ยนเป็น Redis-backed ได้
//
// ใช้แบบ sliding window: เก็บ timestamp ของ request ล่าสุดไว้ใน Map
// และนับเฉพาะ request ที่อยู่ใน window นั้น ๆ
//
// ★ Anti-abuse features:
//   - ป้องกัน brute-force login / pending-status check
//   - ป้องกัน enumeration attack (เช็ค student_id ทีละตัว)
//   - ป้องกัน spam submit การลงทะเบียน
//
// ★ Memory management:
//   - ทำความสะอาด entries เก่าอัตโนมัติทุก ๆ 5 นาที
//   - จำกัดขนาด Map ไม่ให้เกิน 10,000 entries
// ═══════════════════════════════════════════════════════════════

interface RateBucket {
  /** timestamp ของแต่ละ request ใน window */
  hits: number[];
  /** เวลาที่ block ถึง (epoch ms) — ถ้า set ไว้ = ปฏิเสธทุก request จนกว่าจะหมดเวลา */
  blockedUntil?: number;
}

const buckets = new Map<string, RateBucket>();
const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 นาที
let lastCleanup = Date.now();

/** กวาด entries ที่หมดอายุออก เพื่อไม่ให้ memory บวม */
function cleanup(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => t > cutoff);
    if (bucket.hits.length === 0 && (!bucket.blockedUntil || bucket.blockedUntil < now)) {
      buckets.delete(key);
    }
  }
  // ถ้ายังเกินจำกัด ลบ entries เก่าที่สุดออก
  if (buckets.size > MAX_BUCKETS) {
    const entries = [...buckets.entries()].sort(
      (a, b) => Math.max(...a[1].hits, 0) - Math.max(...b[1].hits, 0)
    );
    const overflow = buckets.size - MAX_BUCKETS;
    for (let i = 0; i < overflow; i++) {
      buckets.delete(entries[i][0]);
    }
  }
}

export interface RateLimitOptions {
  /** จำนวน request สูงสุดใน window */
  limit: number;
  /** ขนาด window (ms) */
  windowMs: number;
  /** ถ้าเกิน limit ให้ block เพิ่มอีกกี่ ms (default = windowMs × 2) */
  blockMs?: number;
}

export interface RateLimitResult {
  /** true = ผ่านได้ / false = ถูก block */
  allowed: boolean;
  /** จำนวน request ที่เหลือใน window */
  remaining: number;
  /** timestamp ที่จะ reset (epoch ms) */
  resetAt: number;
  /** ถ้า blocked: เวลาที่จะปลด block (epoch ms) */
  retryAt?: number;
  /** ถ้า blocked: จำนวน ms ที่ต้องรอ */
  retryAfterSeconds?: number;
}

/**
 * ตรวจ rate limit สำหรับ key ที่กำหนด (เช่น IP, user id, email+action)
 *
 * Usage:
 *   const rl = checkRateLimit(ip, { limit: 10, windowMs: 60_000 });
 *   if (!rl.allowed) {
 *     return NextResponse.json(
 *       { error: 'ส่งบ่อยเกินไป กรุณารอสักครู่' },
 *       { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
 *     );
 *   }
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanup(now, opts.windowMs);

  const blockMs = opts.blockMs ?? opts.windowMs * 2;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // ถ้ายังอยู่ในช่วง block → ปฏิเสทันที
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    const retryAt = bucket.blockedUntil;
    return {
      allowed: false,
      remaining: 0,
      resetAt: retryAt,
      retryAt,
      retryAfterSeconds: Math.ceil((retryAt - now) / 1000),
    };
  }

  // กรอง hits เก่าออก
  const windowStart = now - opts.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= opts.limit) {
    // ถึง limit → ตั้ง block
    bucket.blockedUntil = now + blockMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + opts.windowMs,
      retryAt: bucket.blockedUntil,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  // ผ่าน → เพิ่ม hit
  bucket.hits.push(now);
  const resetAt = now + opts.windowMs;
  return {
    allowed: true,
    remaining: opts.limit - bucket.hits.length,
    resetAt,
  };
}

/**
 * สกัด IP ของ client จาก request headers
 * รองรับทั้ง x-forwarded-for (proxy/load balancer) และ x-real-ip
 *
 * ⚠️ Note: x-forwarded-for สามารถ spoof ได้ — แต่ก็ยังดีกว่าไม่มีอะไรเลย
 *    ถ้า deploy หลัง trusted proxy ให้เช็คเฉพาะ trusted chain
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // ใช้ IP แรก (client จริง) — ถ้ามีหลายตัวคือผ่าน proxy หลายชั้น
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Preset rate limits สำหรับแต่ละชนิด endpoint
 * ป้องกัน magic number กระจัดกระจายใน codebase
 */
export const RATE_LIMITS = {
  /** Public: ตรวจสถานะคำขอ — 10 ครั้ง/นาที ต่อ IP */
  CHECK_PENDING_STATUS: { limit: 10, windowMs: 60_000, blockMs: 5 * 60_000 },
  /** Auth: login attempt — 5 ครั้ง/นาที ต่อ IP (ครอบคลุมทั้ง student + other) */
  LOGIN_ATTEMPT: { limit: 5, windowMs: 60_000, blockMs: 15 * 60_000 },
  /** Auth: register submit — 3 ครั้ง/ชั่วโมง ต่อ IP */
  REGISTER_SUBMIT: { limit: 3, windowMs: 60 * 60_000, blockMs: 60 * 60_000 },
  /** Admin API — 60 ครั้ง/นาที ต่อ IP */
  ADMIN_API: { limit: 60, windowMs: 60_000, blockMs: 60_000 },
  /** Generic API — 120 ครั้ง/นาที ต่อ IP */
  GENERIC_API: { limit: 120, windowMs: 60_000, blockMs: 60_000 },
} as const;
