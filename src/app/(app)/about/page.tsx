// ═══════════════════════════════════════════════════════════════
// YP WORK · About Page (v3.10.0 r13)
// ═══════════════════════════════════════════════════════════════
// หน้าเกี่ยวกับ YP Work — แสดงข้อมูลแพลตฟอร์ม + ผู้พัฒนา + วิธีใช้งาน
// ═══════════════════════════════════════════════════════════════
//
// ★★★ IMPORTANT — สำหรับ AI ในอนาคตที่จะปรับปรุงไฟล์นี้ ★★★
//
// ตั้งแต่ v3.9.8 เป็นต้นไป:
//   - ห้ามเพิ่ม "ประวัติการอัพเดท" / "Changelog" / "What's New"
//     ในหน้า About อีกต่อไป
//   - ห้ามเพิ่ม section ที่แสดงรายการเวอร์ชันและสิ่งที่เปลี่ยนแปลง
//     ของแต่ละเวอร์ชัน (เช่น "อัปเดตล่าสุด (vX.Y.Z)", "อัปเดตก่อนหน้า" ฯลฯ)
//   - หน้า About ควรแสดงเฉพาะ:
//       1. คำอธิบายแพลตฟอร์ม (ความเป็นมา)
//       2. ข้อมูลผู้พัฒนา
//       3. ข้อมูลเวอร์ชันปัจจุบัน + tech stack
//       4. วิธีใช้งานเบื้องต้น
//       5. ความเป็นส่วนตัวและความปลอดภัย
//       6. เทคโนโลยีที่ใช้
//   - การเปลี่ยนแปลงเวอร์ชันใหม่ ๆ ไม่ต้องแสดงในหน้า About อีกต่อไป
//     หากต้องการบันทึก changelog ให้ใส่ใน commit message หรือ
//     README.md แทน ไม่ใช่ในหน้า About ที่ผู้ใช้เห็น
//
//   ผู้พัฒนา:
//     พัฒนาโดย นายนนทกร นนท์สุราช ร่วมกับ Rowingsco
//
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
        <div className="yp-page-header">
          <div className="yp-page-header__eyebrow">About</div>
          <h1 className="yp-page-header__title">เกี่ยวกับ YP Work</h1>
          <p className="yp-page-header__subtitle">
            แพลตฟอร์มจัดการรายการสำหรับสภานักเรียน
          </p>
        </div>

        {/* ── ABOUT CARD — ความเป็นมาของแพลตฟอร์ม ── */}
        <div className="yp-card">
          <div className="yp-text-body">
            <p>
              <strong>YP Work</strong> เป็นแพลตฟอร์มสำหรับช่วยบริหารจัดการรายการและติดตามภารกิจของสภานักเรียน
              พัฒนาขึ้นจากประสบการณ์การทำงานจริงภายในสภานักเรียน เพื่อแก้ไขปัญหาการลืมรายการ
              การติดตามความคืบหน้า และการประสานงานระหว่างสมาชิกให้มีประสิทธิภาพมากยิ่งขึ้น
            </p>
            <p>
              โครงการนี้เริ่มต้นจากแนวคิดของ <strong>นายนนทกร นนท์สุราช</strong>
              ซึ่งดำรงตำแหน่งประธานนักเรียน ประจำปีการศึกษา 2569
              โดยมองว่าเครื่องมือที่มีอยู่ในปัจจุบัน แม้จะมีความสามารถหลากหลาย
              แต่ยังไม่ตอบโจทย์รูปแบบการทำงานของสภานักเรียนอย่างแท้จริง
              จึงได้ออกแบบและพัฒนาแพลตฟอร์มที่เรียบง่าย ใช้งานสะดวก
              และสอดคล้องกับการทำงานจริงของทีม
            </p>
            <p>
              ตลอดการพัฒนา YP Work ได้ให้ความสำคัญกับประสบการณ์ผู้ใช้งาน
              ความรวดเร็ว ความเสถียร และการออกแบบที่ช่วยให้การจัดการรายการเป็นเรื่องง่าย
              เพื่อให้สมาชิกสภานักเรียนสามารถทำงานร่วมกันได้อย่างมีประสิทธิภาพมากขึ้น
            </p>
          </div>
        </div>

        {/* ── DEVELOPER CARD — ข้อมูลผู้พัฒนา ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">ผู้พัฒนา</h2>
          <div className="yp-info-list">
            <div className="yp-info-row">
              <span className="yp-info-row__label">พัฒนาโดย</span>
              <span className="yp-info-row__value yp-info-row__value--accent">นายนนทกร นนท์สุราช</span>
            </div>
            <div className="yp-info-row">
              <span className="yp-info-row__label">พัฒนาร่วมกับ</span>
              <span className="yp-info-row__value">Rowingsco</span>
            </div>
          </div>
        </div>

        {/* ── VERSION INFO ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">ข้อมูลเวอร์ชัน</h2>
          <div className="yp-info-list">
            <div className="yp-info-row">
              <span className="yp-info-row__label">เวอร์ชัน</span>
              <span className="yp-info-row__value">3.10.0</span>
            </div>
            <div className="yp-info-row">
              <span className="yp-info-row__label">ธีม</span>
              <span className="yp-info-row__value yp-info-row__value--accent">Indigo Trust</span>
            </div>
            <div className="yp-info-row">
              <span className="yp-info-row__label">โฮสต์</span>
              <span className="yp-info-row__value">Vercel</span>
            </div>
            <div className="yp-info-row">
              <span className="yp-info-row__label">ฐานข้อมูล</span>
              <span className="yp-info-row__value">Supabase (PostgreSQL)</span>
            </div>
            <div className="yp-info-row">
              <span className="yp-info-row__label">เฟรมเวิร์ก</span>
              <span className="yp-info-row__value">Next.js 16</span>
            </div>
          </div>
        </div>

        {/* ── BASIC USAGE ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">วิธีใช้งานเบื้องต้น</h2>
          <div className="yp-help-section">
            <div className="yp-help-section__title">การเข้าสู่ระบบ</div>
            <div className="yp-help-section__body">
              <p>ระบบรองรับ 2 ประเภทผู้ใช้:</p>
              <ul>
                <li><strong>นักเรียน</strong> — เข้าสู่ระบบด้วย เลขบัตรประชาชน 13 หลัก + รหัสนักเรียน 5 หลัก</li>
                <li><strong>ครู/อื่นๆ</strong> — เข้าสู่ระบบด้วย อีเมล + รหัสผ่าน</li>
              </ul>
              <p>หากยังไม่มีบัญชี → กด &ldquo;ลงทะเบียน&rdquo; แล้วรอผู้ดูแลอนุมัติ</p>
            </div>
          </div>
          <div className="yp-help-section">
            <div className="yp-help-section__title">การสร้างรายการ</div>
            <div className="yp-help-section__body">
              <p>กดปุ่ม <code>+</code> ที่มุมล่างขวาเพื่อสร้างรายการใหม่</p>
              <ul>
                <li><strong>กลุ่มรายการ</strong> — สร้างรายการย่อยภายในเพื่อจัดกลุ่มหรือแบ่งงานออกเป็นหลายส่วน</li>
                <li><strong>รายการ</strong> — รายการทั่วไป ไม่สามารถสร้างรายการย่อยได้</li>
              </ul>
              <p>รายการสามารถมอบหมายให้สมาชิกในฝ่ายได้ และติดตามสถานะแบบเรียลไทม์</p>
            </div>
          </div>
          <div className="yp-help-section">
            <div className="yp-help-section__title">การอัพเดตแบบเรียลไทม์</div>
            <div className="yp-help-section__body">
              <p>ทุกการเปลี่ยนแปลง (เพิ่ม/แก้ไข/ลบ รายการ, สมาชิก) อัพเดต <strong>ทันที</strong> โดยไม่ต้อง refresh หน้า</p>
              <p>คนในฝ่ายเดียวกันจะเห็นการเปลี่ยนแปลงพร้อมกันเสมอ</p>
            </div>
          </div>
        </div>

        {/* ── PRIVACY & SECURITY SECTION ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">ความเป็นส่วนตัวและความปลอดภัย</h2>
          <div className="yp-text-body">
            <p>
              <strong>ข้อมูลของคุณปลอดภัย</strong> — ระบบเก็บข้อมูลส่วนตัวเฉพาะที่จำเป็น
              และปกป้องด้วยหลายชั้น:
            </p>
            <ul className="yp-feature-list" style={{ lineHeight: 1.9 }}>
              <li><strong>Row Level Security</strong> — คุณเห็นเฉพาะข้อมูลของตัวเอง</li>
              <li><strong>Mask เลขบัตรประชาชน</strong> — ซ่อนเป็น X-XXXX โดย default</li>
              <li><strong>ไม่ส่ง PII กลับใน API</strong> — ตรวจ match ฝั่ง server แทน</li>
              <li><strong>Rate Limit</strong> — กัน brute-force login และ enumeration</li>
              <li><strong>Security Headers</strong> — CSP, HSTS, COOP, CORP, Permissions-Policy ระดับ platform ใหญ่</li>
              <li><strong>Audit Log</strong> — บันทึกการกระทำสำคัญเพื่อตรวจสอบย้อนหลัง</li>
              <li><strong>HTTPS เท่านั้น</strong> — บังคับ HSTS 1 ปี + includeSubDomains</li>
            </ul>
          </div>
        </div>

        {/* ── TECH STACK ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">เทคโนโลยีที่ใช้</h2>
          <div className="yp-tech-grid">
            {[
              'Next.js 16',
              'React 19',
              'TypeScript',
              'Tailwind CSS 4',
              'Supabase',
              'PostgreSQL',
              'Vercel',
              'Realtime WebSocket',
            ].map((tech) => (
              <div key={tech} className="yp-tech-badge">
                {tech}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
