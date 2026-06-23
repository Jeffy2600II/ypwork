// Path:    src/lib/profileCache.ts
// Purpose: LocalStorage-based profile cache for instant auth restore.
//          Same pattern as yplabs — prevents white flash on reload.

import type { UserProfile } from '@/lib/types';

const CACHE_KEY = 'ypwork_profile_cache';
const CACHE_TTL_KEY = 'ypwork_profile_ttl';
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

/** Read cached profile synchronously (returns null if missing/expired) */
export function getCachedProfileSync(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const ttl = localStorage.getItem(CACHE_TTL_KEY);
    if (!ttl || Date.now() - Number(ttl) > TTL_MS) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/** Read cached profile for a specific uid (sync) */
export function getCachedProfile(uid?: string): UserProfile | null {
  const cached = getCachedProfileSync();
  if (!cached) return null;
  if (uid && cached.auth_uid !== uid) return null;
  return cached;
}

/** Write profile to cache + refresh TTL */
export function setCachedProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    localStorage.setItem(CACHE_TTL_KEY, String(Date.now()));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}

/** Remove cached profile */
export function clearCachedProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TTL_KEY);
  } catch {
    // ignore
  }
}

/** Extend TTL (used after token refresh) */
export function refreshCookieTTL(uid?: string): void {
  if (typeof window === 'undefined') return;
  if (uid) {
    const cached = getCachedProfile(uid);
    if (cached) setCachedProfile(cached);
  } else {
    try {
      localStorage.setItem(CACHE_TTL_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }
}
