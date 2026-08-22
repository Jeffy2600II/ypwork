/**
 * YP WORK · Middleware Entry (Round 24)
 * ═══════════════════════════════════════════════════════════════
 * Wires the centralized proxy (rate limiting, security headers,
 * session refresh) as Next.js middleware.
 *
 * The proxy logic lives in src/proxy.ts for separation of concerns.
 * This file is the required Next.js entry point — middleware.ts
 * at the src/ level is the only filename Next.js recognizes.
 * ═══════════════════════════════════════════════════════════════
 */

export { proxy as middleware, config } from './proxy';
