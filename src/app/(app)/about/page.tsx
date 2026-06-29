// ═══════════════════════════════════════════════════════════════
// YP WORK · About Page
// ═══════════════════════════════════════════════════════════════
// หน้าเกี่ยวกับ YP Work — สร้างใน v1.4
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
              พัฒนาด้วย <strong>Next.js 16</strong> + <strong>Supabase</strong>
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
                1.4
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
                Next.js 16 + Supabase
              </span>
            </div>
          </div>
        </div>

        {/* ── WHAT&apos;S NEW IN v1.4 ── */}
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