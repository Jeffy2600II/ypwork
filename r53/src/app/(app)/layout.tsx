// ═══════════════════════════════════════════════════════════════
// YP WORK · (app) Route Group Layout (v1.9)
// ═══════════════════════════════════════════════════════════════
// Server component ที่:
// - ตรวจ auth (getSessionUser + createClient จาก @/lib/supabase/server)
// - ถ้าไม่ได้ login (หรือ profile ไม่ approved) → redirect ไป /login
// - ถ้า login แล้ว → render children (page จะ render AppShell เอง
//   พร้อม user data ที่ page ดึงเอง — lightweight เพราะ Next.js 16
//   มี automatic request dedupe สำหรับซ้ำ session/profile fetch)
//
// v1.9: เพิ่ม PendingSessionCleanup — เคลียร์ pending session ที่ค้างไว้
//       ใน localStorage เมื่อ user เข้า protected route ได้ (แปลว่า approved)
//
// NOTE: middleware (src/lib/supabase/middleware.ts) เป็น auth gate
//       แรกสุด — redirect ไป /login?redirect=<path> ถ้าไม่มี auth session
//       layout นี้เป็น gate ที่สองสำหรับ edge case ที่ profile ไม่ผ่าน
//       (ไม่ approved / disabled / ไม่มี row ใน council_users)
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { PendingSessionCleanup } from '@/components/pending-session-cleanup';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    // middleware จะจัดการ redirect param ให้แล้วสำหรับ route protection
    // ใน edge case นี้ (profile ไม่ผ่าน) แค่กลับไป /login ก็พอ
    redirect('/login');
  }

  // user ผ่าน auth — page จะ render AppShell เองพร้อม user data
  // (Next.js 16 dedupe session/profile fetch ภายใน request เดียวกัน)
  return (
    <>
      {/* v1.9: เคลียร์ pending session ที่ค้างไว้ — user approved แล้ว */}
      <PendingSessionCleanup />
      {children}
    </>
  );
}
