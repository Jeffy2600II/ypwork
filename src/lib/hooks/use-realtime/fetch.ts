'use client';

/**
 * ============================================================
 * YP WORK - Realtime - Fetch Helpers (r48)
 * ============================================================
 * HTTP fetch helpers สำหรับโหลด events จาก API routes
 * (ใช้ API route แทน direct Supabase query เพื่อ bypass RLS)
 * ============================================================
 */

import type { YPEvent } from '@/lib/types';

export async function fetchEvents(): Promise<YPEvent[]> {
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const res = await fetch('/api/events', { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดข้อมูลงานไม่สำเร็จ');
  }
  return (data.events || []) as YPEvent[];
}

export async function fetchEventById(id: string): Promise<YPEvent | null> {
  // v3.3.0: ใช้ API route แทน direct Supabase query (bypass RLS)
  const res = await fetch(`/api/events/${id}/detail`, { credentials: 'same-origin' });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'โหลดข้อมูลงานไม่สำเร็จ');
  }
  return (data.event || null) as YPEvent | null;
}
