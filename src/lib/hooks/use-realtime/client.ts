'use client';

/**
 * ============================================================
 * YP WORK - Realtime - Client Singleton (r48)
 * ============================================================
 * Shared Supabase client สำหรับ realtime hooks
 * - Singleton pattern: สร้างครั้งเดียว, ใช้ทั่วทั้ง app
 * - Defensive: ไม่ throw ถ้า env var ไม่ครบ — คืน null แล้ว hook ข้าม subscription
 * - useUniqueChannelName: สร้าง channel name ที่ unique ต่อ hook instance
 *   (กัน conflict เมื่อ 2 hooks ใช้ prefix เดียวกัน)
 * ============================================================
 */

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _clientError: string | null = null;

export function getClient(): SupabaseClient | null {
  if (_client) return _client;
  if (_clientError) return null; // ลองสร้างแล้วล้มเหลว — ไม่ต้องลอกซ้ำ
  try {
    _client = createClient();
    return _client;
  } catch (e: any) {
    _clientError = e?.message || 'ไม่สามารถสร้าง Supabase client ได้';
    // eslint-disable-next-line no-console
    console.error('[use-realtime] getClient() failed:', _clientError);
    return null;
  }
}

export function getClientError(): string | null {
  return _clientError;
}

/**
 * สร้าง channel name ที่ unique ต่อ hook instance
 * ป้องกันปัญหา 2 hooks ที่ใช้ชื่อ channel เดียวกัน (เช่น AppShell + TodayClient
 * ที่เรียก useRealtimeSessionUser ทั้งคู่) ทำให้ removeChannel ของอันหนึ่ง
 * ไปทำลาย subscription ของอีกอัน
 */
export function useUniqueChannelName(prefix: string, suffix?: string): string {
  const id = React.useId();
  return suffix
    ? `${prefix}__${suffix}__${id}`
    : `${prefix}__${id}`;
}
