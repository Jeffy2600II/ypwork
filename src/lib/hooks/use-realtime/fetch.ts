'use client';

/**
 * YP WORK - Realtime - Fetch Helpers (Round 22)
 * HTTP fetch helpers — updated for standardized API response envelope.
 * Response format: { success: true, data: T, meta: { requestId } }
 */

import type { YPEvent } from '@/lib/types';

export async function fetchEvents(): Promise<YPEvent[]> {
  const res = await fetch('/api/events', { credentials: 'same-origin' });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'โหลดข้อมูลงานไม่สำเร็จ');
  }
  return (json.data || []) as YPEvent[];
}

export async function fetchEventById(id: string): Promise<YPEvent | null> {
  const res = await fetch(`/api/events/${id}/detail`, { credentials: 'same-origin' });
  if (res.status === 404) return null;
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'โหลดข้อมูลงานไม่สำเร็จ');
  }
  return (json.data || null) as YPEvent | null;
}
