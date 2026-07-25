// ═══════════════════════════════════════════════════════════════
// YP WORK · Pending Status Page (v1.9 — server component shell)
// ═══════════════════════════════════════════════════════════════
// หน้านี้เป็น public route (middleware อนุญาตให้เข้าได้โดยไม่ต้อง login)
// ข้อมูล pending session อ่านจาก localStorage ใน client component
// ไม่ต้องดึงข้อมูลจาก DB ใน server component — เพราะ pending user
// ยังไม่มี auth session ที่จะใช้ query ได้
// ═══════════════════════════════════════════════════════════════

import { PendingStatusClient } from './pending-status-client';

export const dynamic = 'force-dynamic';

export default function PendingStatusPage() {
  return <PendingStatusClient />;
}
