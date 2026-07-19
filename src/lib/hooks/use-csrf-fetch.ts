'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Client · CSRF Fetch Hook (v3.4.0)
// ═══════════════════════════════════════════════════════════════
// Drop-in replacement สำหรับ fetch() ที่ auto-attach CSRF token
// สำหรับ mutation requests (POST/PATCH/PUT/DELETE)
//
// Usage:
//   import { useCsrfFetch } from '@/lib/hooks/use-csrf-fetch';
//
//   const csrfFetch = useCsrfFetch();
//   const res = await csrfFetch('/api/events', {
//     method: 'POST',
//     body: JSON.stringify({...}),
//   });
//
// Hook จะ:
//   1. ตรวจว่ามี CSRF token ใน memory แล้วหรือไม่
//   2. ถ้ายัง → fetch /api/auth/csrf เพื่อขอ token
//   3. แนบ X-CSRF-Token header ในทุก mutation request
//   4. ถ้าได้ 403 (token หมดอายุ) → refresh token แล้ว retry 1 ครั้ง
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;

  tokenFetchPromise = (async () => {
    try {
      const res = await fetch('/api/auth/csrf', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.token) throw new Error('No token in response');
      cachedToken = data.token;
      return cachedToken!;
    } catch (err) {
      tokenFetchPromise = null;
      throw err;
    }
  })();

  return tokenFetchPromise;
}

export function useCsrfFetch() {
  return React.useCallback(
    async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
      const method = (init.method || 'GET').toUpperCase();

      // GET/HEAD/OPTIONS — ไม่ต้องการ CSRF
      if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        return fetch(input, init);
      }

      // Mutation — attach CSRF token
      let token = cachedToken;
      if (!token) {
        try {
          token = await fetchCsrfToken();
        } catch {
          // ไม่สามารถขอ token ได้ → ส่ง request ไปก่อน (server จะตอบ 403)
        }
      }

      const headers = new Headers(init.headers);
      if (token) {
        headers.set('X-CSRF-Token', token);
      }

      const res = await fetch(input, { ...init, headers });

      // ถ้า 403 (token หมดอายุ) → refresh token แล้ว retry 1 ครั้ง
      if (res.status === 403 && cachedToken) {
        cachedToken = null;
        tokenFetchPromise = null;
        try {
          const newToken = await fetchCsrfToken();
          headers.set('X-CSRF-Token', newToken);
          return fetch(input, { ...init, headers });
        } catch {
          // ถ้า refresh ไม่ได้ → return 403 original
        }
      }

      return res;
    },
    []
  );
}

/**
 * Helper function (non-hook version) สำหรับใช้นอก component
 */
export async function csrfFetch(
  input: string | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    return fetch(input, init);
  }

  let token = cachedToken;
  if (!token) {
    try {
      token = await fetchCsrfToken();
    } catch {
      // ส่ง request ไปก่อน
    }
  }

  const headers = new Headers(init.headers);
  if (token) {
    headers.set('X-CSRF-Token', token);
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 403 && cachedToken) {
    cachedToken = null;
    tokenFetchPromise = null;
    try {
      const newToken = await fetchCsrfToken();
      headers.set('X-CSRF-Token', newToken);
      return fetch(input, { ...init, headers });
    } catch {
      // return 403 original
    }
  }

  return res;
}
