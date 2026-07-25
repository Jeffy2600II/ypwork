'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Pending Session Cleanup (v1.9)
// ═══════════════════════════════════════════════════════════════
// ใส่ใน (app)/layout.tsx (protected routes)
// เมื่อ user เข้าถึง protected route ได้ → แปลว่า approved แล้ว
// → เคลียร์ pending session ที่ค้างไว้ใน localStorage (ถ้ามี)
//
// กรณีที่ต้องการ:
//   - user ลงทะเบียน → set pending session → ไป /pending-status
//   - admin อนุมัติ → user อยู่บน /pending-status → realtime redirect ไป /today
//   - cookie หมดอายุ → user กลับมาวันต่อมา → cookie ยัง valid → เข้า /today ได้เลย
//   - แต่ pending session ใน localStorage ยังค้าง → ต้องเคลียร์ตอนเข้า protected route
//
// (ถ้าไม่เคลียร์ → user อาจไป /login จะถูก auto-redirect ไป /pending-status ผิด)
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { clearPendingSession } from '@/lib/pending-session';

export function PendingSessionCleanup() {
  React.useEffect(() => {
    clearPendingSession();
  }, []);

  return null;
}
