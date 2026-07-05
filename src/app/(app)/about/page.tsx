// ═══════════════════════════════════════════════════════════════
// YP WORK · About Page (v1.9.2)
// ═══════════════════════════════════════════════════════════════
// หน้าเกี่ยวกับ YP Work — สร้างใน v1.4, อัปเดตใน v1.5, v1.6, v1.7, v1.8, v1.8.1, v1.8.2, v1.8.3, v1.9, v1.9.1 และ v1.9.2
// อ้างอิงจาก demo v8.2 profile.js → about modal
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) return null;

  return (
    <AppShell user={user} title="เกี่ยวกับ YP Work" showBack showBottomNav={false}>
      <div className="yp-page yp-page-enter">
        <div className="yp-page-header" style={{ marginBottom: 'var(--yp-space-5)' }}>
          <div className="yp-page-header__eyebrow">About</div>
          <h1 className="yp-page-header__title">เกี่ยวกับ YP Work</h1>
          <p className="yp-page-header__subtitle">
            แพลตฟอร์มจัดการงานสำหรับสภานักเรียน
          </p>
        </div>

        {/* ── ABOUT CARD ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <div style={{ fontSize: 'var(--yp-text-sm)', lineHeight: 1.8, color: 'var(--yp-text-body)' }}>
            <p style={{ margin: '0 0 var(--yp-space-3)' }}>
              <strong>YP Work</strong> คือแพลตฟอร์มภายในสำหรับสภานักเรียน
              ที่รวบรวมตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อยไว้ในที่เดียว
            </p>
            <p style={{ margin: '0 0 var(--yp-space-3)' }}>
              เป้าหมายหลัก: เป็น &ldquo;สมองของสภานักเรียน&rdquo; —
              ช่วยให้การจัดการงานแต่ละฝ่ายเป็นระบบ สามารถติดตามความคืบหน้า
              และมองภาพรวมของทุกฝ่ายงานได้ในที่เดียว
            </p>
            <p style={{ margin: 0 }}>
              พัฒนาด้วย <strong>Next.js 16</strong> + <strong>Supabase Realtime</strong>
              โดยใช้ธีม <strong>Indigo Trust</strong>
            </p>
          </div>
        </div>

        {/* ── VERSION INFO ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--yp-space-3)',
            fontSize: 'var(--yp-text-sm)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: 'var(--yp-text-muted)' }}>เวอร์ชัน</span>
              <span style={{ fontWeight: 'var(--yp-fw-semibold)', color: 'var(--yp-text-heading)' }}>
                1.9.2
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: 'var(--yp-text-muted)' }}>Theme</span>
              <span style={{ fontWeight: 'var(--yp-fw-semibold)', color: 'var(--yp-indigo-600)' }}>
                Indigo Trust
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: 'var(--yp-text-muted)' }}>Framework</span>
              <span style={{ fontWeight: 'var(--yp-fw-semibold)', color: 'var(--yp-text-heading)' }}>
                Next.js 16 + Supabase Realtime
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: 'var(--yp-text-muted)' }}>Data Sync</span>
              <span style={{ fontWeight: 'var(--yp-fw-semibold)', color: 'var(--yp-indigo-600)' }}>
                Realtime (Push-based)
              </span>
            </div>
          </div>
        </div>

        {/* ── WHAT'S NEW IN v1.9.2 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.9.2
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> ผู้ใช้ที่ส่งคำขอสมัครแล้ว (ยังรออนุมัติ) ถูกระบบแจ้งว่า &ldquo;ถูกปฏิเสธ&rdquo; ทั้งที่ยังไม่มีการดำเนินการใด ๆ — เกิดจาก RLS policy <code>council_join_requests_select_own</code> อนุญาตเฉพาะ authenticated users ในการ SELECT ทำให้ client ที่ยังไม่ login มองไม่เห็น row ของตัวเอง</li>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>Root cause:</strong> เมื่อ <code>fetchPendingRequest()</code> คืน <code>null</code> เพราะ RLS บล็อก ระบบไปลอง <code>signIn</code> ก็ล้มเหลว (ยังไม่มี auth account) → ตีความเป็น &lsquo;rejected&rsquo; ทั้งที่จริงยัง &lsquo;pending&rsquo; อยู่ → บันทึกลง localStorage ทำให้ login ครั้งต่อไปเห็น <code>isRejected=true</code> และคืน &lsquo;rejected&rsquo; ตลอด</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>แก้ไข:</strong> สร้าง server-side API <code>GET /api/auth/check-pending-status</code> ที่ใช้ <strong>service role</strong> (bypass RLS) เพื่อตรวจสอบสถานะที่แน่นอน — ถ้า row มีอยู่ใน <code>council_join_requests</code> = pending เสมอ</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>Logic ใหม่ตาม requirement:</strong> ข้อมูลอยู่ใน <code>council_join_requests</code> = ยังรออนุมัติ (ยังไม่อนุมัติ และยังไม่ถูกปฏิเสธ) — ระบบไม่ตีความเป็น &lsquo;rejected&rsquo; อีกต่อไป</li>
            <li>แก้ <code>useRealtimePendingRequest</code> hook — ใช้ server API แทนการ query DB ตรง ๆ ฝั่ง client (ที่ติด RLS)</li>
            <li>แก้ <code>loginStudent</code> และ <code>loginOther</code> — ตรวจสถานะผ่าน server API ก่อน ใช้ localStorage <code>isRejected</code> เป็น hint เท่านั้น (ไม่ใช่ source of truth)</li>
            <li>เมื่อ login สำเร็จ → เคลียร์สถานะ rejected/pending ใน localStorage อัตโนมัติ</li>
            <li>Realtime channel ยังใช้สำหรับ trigger reload — แต่การตรวจสอบสถานะทำผ่าน server API เท่านั้น</li>
            <li>ไม่ต้องรัน SQL เพิ่ม — เป็นการแก้ code เพียวอย่างเดียว</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.9.1 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.9.1
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> หลังลบงาน หน้ารายละเอียดงาน &ldquo;ค้าง&rdquo; ไม่ปิดหน้าอัตโนมัติ — ตอนนี้ปิดทุก Bottom Sheet ที่เปิดอยู่ก่อน navigation และ force redirect ไป <code>/events</code> ทันที พร้อม safety timeout 3 วินาที (ถ้า <code>router.replace</code> ล้มเหลวจะใช้ <code>window.location</code> แทน)</li>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> หลังลบ task ภายใน Edit Task sheet, sheet อาจค้าง — ตอนนี้ปิดทุก sheet ที่เกี่ยวข้อง (confirmDeleteTask, editTask, editTaskPicker) พร้อมกัน</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>BottomSheet ปลอดภัยขึ้น:</strong> เพิ่ม safety net สำหรับ cleanup ตอน unmount — กัน <code>body.yp-sheet-open</code> class ค้างและ scroll lock ไม่ปลด ถ้า parent component unmount ระหว่าง animation</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>เข้าถึงคำขอสมัครได้แล้ว:</strong> เพิ่ม <code>lib/db/pending-requests.ts</code> — helper สำหรับดึง/จัดการคำขอสมัครใน <code>council_join_requests</code> (ดัดแปลงจาก reference repo <code>admin-sc-yp</code>)</li>
            <li>เพิ่ม <code>lib/auth/api-guard.ts</code> — <code>requireAdmin()</code> สำหรับตรวจสิทธิ์ admin ใน API routes คืน <code>adminClient</code> (service role, bypass RLS) เมื่อสำเร็จ</li>
            <li>เพิ่ม <code>createAdminClient()</code> ใน <code>lib/supabase/server.ts</code> — service-role client สำหรับ admin operations (ใช้ <code>SUPABASE_SERVICE_ROLE_KEY</code>)</li>
            <li>เพิ่ม API routes สำหรับ admin จัดการคำขอสมัคร: <code>GET /api/admin/requests</code>, <code>POST /api/admin/approve-request</code>, <code>POST /api/admin/requests/[id]/reject</code></li>
            <li>เพิ่ม hook <code>useRealtimePendingRequests</code> — subscribe รายการคำขอสมัครทั้งหมดแบบ realtime (สำหรับ admin view ในอนาคต)</li>
            <li>ฟังก์ชัน <code>approveRequest()</code> รองรับกรณี email ซ้ำ — ถ้า auth account มีอยู่แล้วแต่ยังไม่มี <code>council_users</code> row จะ reuse auth account แทนการ fail</li>
            <li>ฟังก์ชัน <code>rejectRequest()</code> ใช้ service role → bypass RLS ที่บล็อก authenticated users จากการ DELETE</li>
            <li>เพิ่ม <code>router.refresh()</code> หลัง navigation หลัก — บังคับให้ Next.js reload RSC payload ของ <code>/events</code> (กัน cached payload ที่ไม่อัพเดต)</li>
            <li>ไม่ต้องรัน SQL เพิ่ม — เป็นการแก้ code เพียวอย่างเดียว</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.9 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.9
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>Login flow ใหม่:</strong> ถ้า login แล้วไม่พบบัญชี → แนะนำให้สมัคร; ถ้ามีคำขออยู่แล้ว → redirect ไปหน้าสถานะ; ถ้าเคยถูกปฏิเสธ → แจ้งเตือน</li>
            <li>ผู้ใช้ที่ส่งคำขอสมัครแล้วแต่ยังไม่อนุมัติ สามารถเข้าสู่ระบบได้ — แต่จะเห็นเฉพาะหน้าสถานะแบบ realtime</li>
            <li>เมื่อ admin อนุมัติ → ระบบพาเข้าสู่ระบบอัตโนมัติทันที (realtime)</li>
            <li>เมื่อ admin ปฏิเสธ → ระบบ sign out อัตโนมัติ และจำบัญชีไว้ใน localStorage เพื่อแจ้งเตือนเมื่อกลับมา</li>
            <li>หลังส่งคำขอสมัคร → auto-login เป็น pending user + redirect ไปหน้าสถานะ</li>
            <li>ไม่แก้ฐานข้อมูล — ใช้ localStorage เก็บ pending session + rejected accounts</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.8.3 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.8.3
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> หน้า <strong>Home (Today)</strong> และ <strong>Profile</strong> ขึ้น "This page couldn&rsquo;t load" เมื่อเข้าใช้งาน — เกิดจาก 2 hooks ใช้ชื่อ channel เดียวกัน (AppShell + page component เรียก <code>useRealtimeSessionUser</code> ทั้งคู่) เวลา cleanup ไปทำลาย subscription ของกันและกัน → ใช้ <code>useUniqueChannelName()</code> แก้ให้แต่ละ hook มี channel ของตัวเอง</li>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> รองรับ <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (Vercel × Supabase integration ใช้ชื่อนี้) เพิ่มจาก <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (legacy) — ก่อนหน้านี้ถ้า Vercel ตั้งแค่ PUBLISHABLE_KEY จะทำให้ <code>createBrowserClient</code> throw และ crash หน้า</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>Defensive hooks:</strong> <code>getClient()</code> ไม่ throw แล้ว — คืน null แล้วให้ hook ข้าม subscription (ป้องกัน crash ทั้งหน้าเวลา env var ไม่ครบ)</li>
            <li>ทุก <code>useEffect</code> ที่ subscribe channel ถูกห่อด้วย try-catch — ถ้า subscribe ล้มเหลวจะแค่ log error ไม่ crash หน้า</li>
            <li>ทุก cleanup <code>removeChannel</code> ห่อ try-catch — กัน throw ตอน channel ถูก remove ไปแล้ว</li>
            <li>เพิ่ม <code>global-error.tsx</code> และ <code>error.tsx</code> สำหรับ (app) route group — แสดงข้อความ error จริง + ปุ่ม "ลองใหม่" / "ย้อนกลับ" แทนข้อความ generic "This page couldn&rsquo;t load"</li>
            <li>Server-side <code>createClient()</code> และ middleware รองรับ <code>SUPABASE_PUBLISHABLE_KEY</code>, <code>SUPABASE_ANON_KEY</code>, <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> แบบ fallback ตามลำดับ</li>
            <li>ไม่ต้องรัน SQL เพิ่ม — เป็นการแก้ code เพียวอย่างเดียว</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.8.2 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.8.2
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> หน้า home (Today) ไม่อัพเดตข้อมูลเมื่อย้อนกลับมาจากหน้าอื่น — เพราะ Next.js ใช้ cached RSC payload แล้ว hook ไม่ได้ reload ตอน mount</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>Realtime ทุกหน้า:</strong> เพิ่ม <code>reload()</code> ตอน mount ในทุก hook (<code>useRealtimeEvents</code>, <code>useRealtimeEventById</code>, <code>useRealtimeEventsForDate</code>) เพื่อ bypass cache</li>
            <li>เพิ่ม subscription 3 ตารางใหม่ในทุก hook: <code>council_users</code>, <code>departments</code>, <code>ypwork_event_members</code> — เมื่อคนเปลี่ยนชื่อ/สี, admin เปลี่ยนฝ่าย, คนเข้า/ออกงาน → ทุกหน้าอัพเดตทันที</li>
            <li>เพิ่ม hook ใหม่ <code>useRealtimeSessionUser</code> — ชื่อ/สี/ฝ่าย ของ user ตัวเองอัพเดต live (ใช้ใน AppShell, Today, Profile)</li>
            <li>เพิ่ม hook ใหม่ <code>useRealtimeDeptMembers</code> — สมาชิกในฝ่ายอัพเดต live (avatar group ในหน้า Today)</li>
            <li>หน้า <strong>Today</strong>: hero name/color, dept overview (name, icon, description, members) ทั้งหมดอัพเดตแบบ realtime แล้ว</li>
            <li>หน้า <strong>Profile</strong>: ชื่อ/สี/ฝ่าย ของ user อัพเดตแบบ realtime (ก่อนหน้านี้เป็น static)</li>
            <li><strong>AppShell</strong> (top-bar ทุกหน้า): avatar และ name ใน top-bar อัพเดตแบบ realtime</li>
            <li>ไม่ต้องรัน SQL เพิ่ม — ตารางที่เกี่ยวข้องอยู่ใน Realtime publication หมดแล้วตั้งแต่ v1.6/v1.7/v1.8</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.8.1 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.8.1
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> ฟอร์มสมัครส่งคำขอแต่ <strong>เลขบัตรประชาชนหาย</strong> — เพราะก่อนหน้านี้ payload ไม่ได้ส่ง field <code>national_id</code> ไปเลย ตอนนี้แก้แล้ว</li>
            <li>เพิ่มคอลัมน์ <code>national_id</code> ในตาราง <code>council_join_requests</code> และ <code>council_users</code> (ผ่าน SQL v1.8.1)</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>เปลี่ยนปีการศึกษาจาก hardcoded → ดึงจาก DB:</strong> ตอนนี้ดึงรายการปีจากตาราง <code>council_years</code> ของ YP Labs แบบ realtime แทนการ hardcoded <code>['2568','2567','2566']</code></li>
            <li>ปีที่ admin ตั้ง <code>closed=true</code> จะแสดงเป็น option ที่เลือกไม่ได้ พร้อม label <code>(ปิดรับ)</code></li>
            <li>เปิด <code>RLS SELECT</code> บน <code>council_years</code> ให้ <code>anon</code> อ่านได้ — คนที่ยังไม่ login ดึงรายการปีได้</li>
            <li>เพิ่ม hook ใหม่: <code>useRealtimeYears</code> — subscribe realtime บน <code>council_years</code></li>
            <li>เพิ่ม <code>council_years</code> เข้า <code>supabase_realtime</code> publication</li>
            <li>แปล error message ใหม่ — แนะนำให้รัน SQL v1.8.1 เมื่อเจอ column <code>national_id</code> ไม่มี</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.8 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.8
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li><strong style={{ color: 'var(--yp-rose-500)' }}>แก้บั๊กสำคัญ:</strong> ส่งคำขอสมัครเสร็จแต่ Supabase ไม่มีข้อมูล — frontend เคย swallow error เงียบ ๆ แล้วแสดง success state ทั้งที่จริงล้มเหลว</li>
            <li>เพิ่ม <code>RLS INSERT policy</code> บน <code>council_join_requests</code> ให้ anon และ authenticated ส่งคำขอได้จริง (ก่อนหน้านี้ไม่มี policy นี้ → RLS บล็อกโดยเงียบ)</li>
            <li>ฟอร์มสมัครตอนนี้ <strong>แสดง error จริง</strong> ใต้ปุ่ม submit พร้อมแปล error code ที่พบบ่อยให้เป็นข้อความที่เข้าใจ</li>
            <li><strong style={{ color: 'var(--yp-indigo-600)' }}>ขยาย Realtime ทั่วทั้งเว็บ:</strong> เพิ่ม <code>council_users</code>, <code>council_join_requests</code>, <code>ypwork_activity_log</code> เข้า publication</li>
            <li>หน้า <strong>โปรไฟล์</strong>ตอนนี้ stats และข้อมูลฝ่ายอัพเดตแบบ realtime (เมื่อ task/assignee/event เปลี่ยน หรือ admin เปลี่ยนฝ่ายของ user)</li>
            <li>หน้า <strong>Day View</strong> (<code>/events/day/[date]</code>) ตอนนี้ subscribe realtime — เห็น event ใหม่/ลบ/แก้ไขทันที</li>
            <li>หน้า <strong>Register</strong> dropdown ฝ่ายตอนนี้ realtime — เมื่อ admin เปลี่ยนชื่อ/สีฝ่าย ผู้สมัครเห็นทันที</li>
            <li>เพิ่ม hooks ใหม่: <code>useRealtimeDepartments</code>, <code>useRealtimeProfileStats</code>, <code>useRealtimeEventsForDate</code>, <code>useRealtimeActivityLog</code></li>
            <li>เพิ่ม RLS SELECT policy บน <code>council_join_requests</code> ให้ user ตรวจสอบสถานะคำขอของตัวเองได้</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.7 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.7
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li>เปลี่ยนชื่อตาราง <code>ypwork_departments</code> → <code>departments</code> (สั้นและสะอาดขึ้น)</li>
            <li>เพิ่มคอลัมน์ <code>department_id</code> ใน <code>council_users</code> — เก็บ ID ของฝ่าย ไม่ใช่ชื่อฝ่าย</li>
            <li>เพิ่มคอลัมน์ <code>department_id</code> ใน <code>council_join_requests</code> (ตารางรอยืนยัน)</li>
            <li>หน้าสมัครบัญชีใหม่ <strong>เลือกฝ่ายได้</strong> — ส่ง <code>department_id</code> ไปพร้อมคำขอ</li>
            <li>ส่งคำขอสมัครเข้า <code>council_join_requests</code> จริง (ไม่ใช่ demo ลอย ๆ อีกต่อไป)</li>
            <li>เปิดให้ anon อ่านรายชื่อฝ่ายได้ — หน้า register ดึงรายการฝ่ายได้ก่อน login</li>
            <li>เพิ่ม <code>departments</code> เข้า Supabase Realtime publication</li>
            <li>ปรับปรุง schema SQL ให้ idempotent — รันซ้ำก็ปลอดภัย</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.6 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.6
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li>เปลี่ยนระบบ sync ข้อมูลเป็น <strong>Supabase Realtime</strong> (push-based) — ไม่มี polling แล้ว</li>
            <li>ลดการยิง HTTP request โดยรวม — ประหยัด quota API</li>
            <li>แก้ปัญหาวันที่ในปฏิทินไม่ตรง (28 แทน 29) — ใช้ local timezone</li>
            <li>เพิ่ม <strong>loading skeletons</strong> ทุกหน้า — navigate เร็วขึ้นมาก</li>
            <li>คลิกที่การ์ด task ทั้งใบเพื่อเปลี่ยนสถานะได้เลย (ไม่ต้องคลิกเฉพาะจุด)</li>
            <li>ลบ task/งาน แล้วหายจากหน้าจอทันที (optimistic + realtime)</li>
            <li>ข้อมูลอัปเดต real-time ข้ามผู้ใช้ — คนอื่นแก้ คุณเห็นทันที</li>
            <li>เพิ่มเสถียรภาพระบบโดยรวม</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.5 ── */}
        <div className="yp-card" style={{ marginBottom: 'var(--yp-space-4)' }}>
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.5
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li>Bottom sheet เพิ่ม task ครบทุก field (priority, assignee, due, est, tags, notes)</li>
            <li>แก้ไข task ได้ (Edit Task sheet) — pre-fill ค่าเดิม</li>
            <li>Logout confirmation ใช้ BottomSheet เหมือน demo</li>
            <li>แก้ navigation หลังสร้าง/ลบงาน — กด back ไม่กลับมาหน้าเดิม</li>
            <li>ปรับ CSS การ์ด task ให้เหมือน demo v8.2</li>
          </ul>
        </div>

        {/* ── WHAT'S NEW IN v1.4 ── */}
        <div className="yp-card">
          <h2 style={{
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 'var(--yp-fw-bold)',
            color: 'var(--yp-text-heading)',
            margin: '0 0 var(--yp-space-3)',
          }}>
            อัปเดตใน v1.4
          </h2>
          <ul style={{
            margin: 0,
            paddingLeft: 'var(--yp-space-5)',
            fontSize: 'var(--yp-text-sm)',
            color: 'var(--yp-text-body)',
            lineHeight: 2,
          }}>
            <li>แก้ไข top-nav, bottom-nav และปุ่ม + ให้ล็อกตำแหน่งกับจอ</li>
            <li>เพิ่ม confirm dialog ก่อนออกจากระบบ</li>
            <li>เพิ่มหน้าเกี่ยวกับ YP Work</li>
            <li>ซ่อน bottom-nav บนหน้ารายละเอียด/สร้างงาน</li>
            <li>ปรับปรุงเสถียรภาพ layout สำหรับ mobile</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}