// ═══════════════════════════════════════════════════════════════
// YP WORK · About Page (v3.9.7)
// ═══════════════════════════════════════════════════════════════
// หน้าเกี่ยวกับ YP Work — แสดงข้อมูลเวอร์ชันปัจจุบัน + changelog
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
            แพลตฟอร์มจัดการงานสำหรับสภานักเรียน
          </p>
        </div>

        {/* ── ABOUT CARD ── */}
        <div className="yp-card">
          <div className="yp-text-body">
            <p>
              <strong>YP Work</strong> คือแพลตฟอร์มภายในสำหรับสภานักเรียน
              ที่รวบรวมตารางงาน กลุ่มงาน ฝ่ายงาน และ task ย่อยไว้ในที่เดียว
            </p>
            <p>
              เป้าหมายหลัก: เป็น &ldquo;สมองของสภานักเรียน&rdquo; —
              ช่วยให้การจัดการงานแต่ละฝ่ายเป็นระบบ สามารถติดตามความคืบหน้า
              และมองภาพรวมของทุกฝ่ายงานได้ในที่เดียว
            </p>
            <p>
              ทุกการเปลี่ยนแปลงในระบบอัพเดต <strong>แบบเรียลไทม์</strong> —
              คนในฝ่ายเดียวกันเห็นข้อมูลเดียวกันเสมอ ไม่ต้อง refresh
            </p>
          </div>
        </div>

        {/* ── VERSION INFO ── */}
        <div className="yp-card">
          <div className="yp-info-list">
            <div className="yp-info-row">
              <span className="yp-info-row__label">เวอร์ชัน</span>
              <span className="yp-info-row__value">3.9.7</span>
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

        {/* ── WHAT'S NEW (v3.9.7) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">อัปเดตล่าสุด (v3.9.7) — Left-Rail Layout Fix</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>แก้ปัญหาเนื้อหาทับซ้อนกับแถบนำทางด้านซ้ายบนหน้าจอขนาดใหญ่:</strong>
              อาการ: บน desktop (≥900px) แถบนำทางด้านซ้าย (left-rail) ทับเนื้อหา
              เพราะ <code>.bottom-nav</code> เป็น <code>position: fixed</code> จึงไม่ได้
              เป็นส่วนหนึ่งของ flex flow — <code>.app-main</code> จึงขยายเต็ม viewport
              และเนื้อหาไปอยู่ใต้ left-rail
            </li>
            <li>
              <strong>วิธีแก้:</strong>
              <ul>
                <li>เพิ่ม CSS variable <code>--yp-left-rail-width</code> (0px บนมือถือ, 96-120px บน desktop)</li>
                <li><code>.app-main</code> มี <code>padding-left: var(--yp-left-rail-width)</code> เว้นที่ให้ left-rail</li>
                <li><code>.top-bar</code> มี <code>left: var(--yp-left-rail-width)</code> เริ่มหลัง left-rail</li>
                <li>ค่า width ที่แต่ละ breakpoint: ≥900px = 96px, ≥1280px = 108px, ≥1536px = 120px</li>
              </ul>
            </li>
            <li>
              <strong>ผลลัพธ์:</strong> เนื้อหาทุกหน้า (today, calendar, events, profile, about)
              ไม่ทับซ้อนกับ left-rail บน desktop และ top-bar ก็ไม่ถูก left-rail บัง
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.6) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">อัปเดตก่อนหน้า (v3.9.6) — Terminology Update</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>เปลี่ยนคำศัพท์ "ส่งคำขอ" → "ลงทะเบียน":</strong>
              เพื่อให้ดูเป็นมืออาชีพและคุ้นเคยมากขึ้น เปลี่ยนคำศัพท์ในกระบวนการสร้างบัญชี
              จาก "ส่งคำขอ" (submit request) เป็น "ลงทะเบียน" (register) ทั่วทั้งเว็บ
            </li>
            <li>
              <strong>ครอบคลุมทุกหน้า:</strong>
              <ul>
                <li><strong>หน้า login</strong> — ปุ่ม "ลงทะเบียน", ข้อความ "คุณต้องลงทะเบียนก่อน"</li>
                <li><strong>หน้า register</strong> — หัวข้อ "ลงทะเบียนบัญชีใหม่", ปุ่ม "ลงทะเบียน", ข้อความสำเร็จ "ลงทะเบียนสำเร็จ"</li>
                <li><strong>หน้า pending-status</strong> — "ข้อมูลการลงทะเบียน", "การลงทะเบียนได้รับการอนุมัติ", "การลงทะเบียนถูกปฏิเสธ"</li>
                <li><strong>หน้า about</strong> — คำอธิบายกระบวนการสร้างบัญชี</li>
              </ul>
            </li>
            <li>
              <strong>รวมถึงข้อความระบบ:</strong>
              <ul>
                <li>Toast messages: "ลงทะเบียนสำเร็จ", "ลงทะเบียนไม่สำเร็จ", "ลงทะเบียนยังอยู่ระหว่างพิจารณา"</li>
                <li>Error messages: "กรุณาลงทะเบียนก่อน", "ลงทะเบียนไปแล้ว รอผู้ดูแลอนุมัติ"</li>
                <li>Rate limit: "ลงทะเบียนบ่อยเกินไป กรุณารอสักครู่"</li>
                <li>ปุ่ม: "ลงทะเบียนใหม่" (สำหรับกรณีถูกปฏิเสธแล้วต้องการลองใหม่)</li>
              </ul>
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.5) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">อัปเดตก่อนหน้า (v3.9.5) — Calendar Mobile Overflow Fix</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>แก้ปัญหาปฏิทินกริดล้นออกจากกรอบบนมือถือ:</strong>
              อาการ: บนหน้าจอแคบ (มือถือ) ปฏิทินกริดมุมมองเดือนล้นออกจากกรอบ
              ทำให้วันที่บางคอลัมน์หายไปหรือเลื่อนออกนอกจอ
              <br />
              <em>สาเหตุ:</em> CSS Grid <code>repeat(7, 1fr)</code> เดิมเท่ากับ
              <code>minmax(auto, 1fr)</code> ซึ่งหมายความว่าคอลัมน์จะไม่แคบกว่า
              min-content ของเนื้อหา — ถ้า cell ใดมีเนื้อหากว้าง (เช่น 3 dots + "+N")
              คอลัมน์ทั้ง 7 จะถูกขยายให้กว้างเท่ากัน จนกระทั่งล้น container
            </li>
            <li>
              <strong>วิธีแก้:</strong>
              <ul>
                <li>เปลี่ยน <code>repeat(7, 1fr)</code> → <code>repeat(7, minmax(0, 1fr))</code> สำหรับทั้ง weekdays และ days grid — อนุญาตให้คอลัมน์แคบลงต่ำกว่า min-content</li>
                <li>เพิ่ม <code>min-width: 0</code> ให้ cells และ weekday headers — ยกเลิกพฤติกรรม default ที่ขยายตามเนื้อหา</li>
                <li>เพิ่ม <code>overflow: hidden</code> ให้ cells — clip เนื้อหาที่อาจล้น</li>
                <li>เพิ่ม <code>box-sizing: border-box</code> + <code>max-width: 100%</code> ให้ container — ป้องกัน defensively</li>
              </ul>
            </li>
            <li>
              <strong>ปรับขนาดบนมือถือให้กะทัดรัดขึ้น:</strong>
              <ul>
                <li>ลด horizontal padding ของ container บนมือถือ (0.75rem → 0.5rem)</li>
                <li>ลด min-height ของ cell บนมือถือ (50px → 44px)</li>
                <li>ลดขนาด dots บนมือถือ (6px → 5px) ประหยัดพื้นที่</li>
                <li>ลด scale hover ของ today cell (1.02 → 1.01) กัน visual overflow</li>
                <li>เพิ่ม <code>justify-content: center</code> ให้ dots row + <code>max-width: 100%</code></li>
              </ul>
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.4) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">อัปเดตก่อนหน้า (v3.9.4) — Calendar Redesign + Thailand TZ + Relaxed Patterns</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>แก้ไข timezone ปฏิทิน/วันที่ ให้ตรงกับเวลาประเทศไทย:</strong>
              ก่อนหน้านี้ถ้า user เปิดเว็บจากต่างประเทศ (เช่น สหรัฐฯ) "วันนี้"
              อาจไม่ตรงกับ "วันนี้" ในไทย → ปฏิทินแสดงวันที่ผิดในบางครั้ง
              <br />
              <em>วิธีแก้:</em> ใช้ <code>Intl.DateTimeFormat('en-CA', {`{ timeZone: 'Asia/Bangkok' }`})</code>
              สำหรับทุกการคำนวณ "วันนี้" และการเปรียบเทียบวันที่
              ผ่าน helper function <code>getThailandParts()</code>,
              <code>getLocalTodayStr()</code>, <code>isToday()</code>, <code>isPast()</code>,
              <code>relativeDay()</code>, <code>getRelativeDate()</code>,
              <code>daysBetween()</code>, <code>getTimeGreeting()</code> —
              ทั้งหมดบังคับใช้เขตเวลาไทย (UTC+7) แม่นยำเสมอ
            </li>
            <li>
              <strong>ลดความหนาแน่นของ SVG patterns:</strong>
              pattern ในพื้นหลัง body และ hero blocks ถูกปรับให้สบายตาขึ้น —
              tile size ใหญ่ขึ้น 2-3x (32px → 64px, 40px → 80px, 60px → 120px)
              และ opacity ลดลงประมาณ 40-50% (10% → 5%, 5% → 2-3%)
              ทำให้ดูมี texture แต่ไม่แน่นจนรบกวนการอ่าน
            </li>
            <li>
              <strong>ออกแบบปฏิทินใหม่ทั้ง 2 มุมมอง:</strong>
              อ้างอิงจาก Apple Calendar, Google Calendar และ Notion Calendar —
              <ul>
                <li>Container ยังคงความโค้งมนสูง (เอกลักษณ์ YP Work)</li>
                <li>Cells ภายในใช้รัศมี 10px ที่น้อยกว่า (ตามมาตรฐาน calendar ไม่จำเป็นต้องมนมาก)</li>
                <li>สัดส่วนที่สมดุลด้วย <code>aspect-ratio: 1/1</code></li>
                <li>Today cell แบบ Apple Calendar — gradient bg + white text + shadow</li>
                <li>Weekday headers มี border-bottom แยกจาก day grid</li>
                <li>เพิ่ม legend อธิบายสี (today/weekend/has-events)</li>
              </ul>
            </li>
            <li>
              <strong>List view ที่ดีขึ้น:</strong>
              <ul>
                <li>เพิ่ม month summary card แสดงจำนวนงานทั้งเดือน</li>
                <li>Day header แบบ card ที่มี hierarchy ชัดเจน (วันที่ + ชื่อวัน + weekday short)</li>
                <li>Today badge ที่โดดเด่น (indigo pill + shadow)</li>
                <li>Event items เป็น card ที่มี border + shadow + accent tint ตอน hover</li>
                <li>Color bar ใหญ่ขึ้น (3px → 4px) และมี glow shadow</li>
                <li>เพิ่ม status dot ที่ท้ายแต่ละ event สำหรับ visual scanning</li>
              </ul>
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.3) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">อัปเดตก่อนหน้า (v3.9.3) — Premium Polish & Patterned Surfaces</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>โค้งมนมากขึ้นทุกที่:</strong>
              ปรับเพิ่มค่า <code>--yp-radius-*</code> ทุกระดับ
              (xs +2, sm +2, md +4, lg +6, xl +8, 2xl +12)
              การ์ด, ปุ่ม, ช่องกรอก, การ์ดงาน, hero block — ทุกอย่างโค้งมนกว่าเดิม
              อ้างอิงจากแนวโน้มการออกแบบของ Linear, Vercel, Apple Vision Pro และ Telegram
              ที่เคลื่อนไปที่ "soft squircle" แทนมุมตรง
            </li>
            <li>
              <strong>ยกเลิก hover บนปุ่มบวก (FAB):</strong>
              ปุ่ม "+ สร้างงาน" จะไม่มี hover effect อีกต่อไป —
              ไม่ขยาย ไม่ยกขึ้น ไม่เปลี่ยนเงา ไม่มี halo glow
              คงไว้เฉพาะ <em>active (press)</em> state ที่ให้ feedback ตอนกดจริง
              เพื่อให้ FAB ดูนิ่งและเป็นธรรมชาติ
            </li>
            <li>
              <strong>เพิ่มระยะจากขอบซ้าย-ขวา:</strong>
              <code>--yp-page-pad-x</code> เพิ่มขึ้น 0.25rem ทุก breakpoint
              (mobile 1.125rem, tablet 1.75rem, desktop 2rem)
              เนื้อหาไม่ชิบขอบจอเกินไป อ่านง่ายขึ้นบนหน้าจอใหญ่
            </li>
            <li>
              <strong>ยกเครื่อง Hero block ทั้ง 3 แบบ:</strong>
              หน้าหลัก (today), หน้ากลุ่มงาน (detail), หน้างานเดี่ยว (single) —
              เปลี่ยนจาก plain gradient เป็น <em>layered surface</em> แบบ premium
              ประกอบด้วย mesh gradient (4 จุดแสง) + SVG pattern overlay (dots + sparkles
              สำหรับ dark hero, dots + plus signs สำหรับ light hero) + deeper layered shadow
              อ้างอิงจากการวิจัย Telegram chat backgrounds, Linear project pages,
              Stripe gradient mesh และ Vercel card design
            </li>
            <li>
              <strong>พื้นหลังแบบ Telegram chat:</strong>
              ตัว body ของทุกหน้ามี subtle dot grid + plus signs overlay
              แทนพื้นสีทึบ ทำให้เว็บมี "ชีวิต" และ depth โดยไม่เสียตัวตนของดีไซน์เดิม
              ใช้ SVG data-URI (no network request) + สีโปร่งใสต่ำกว่า 5% opacity
            </li>
            <li>
              <strong>ธีมของแต่ละงานสวยขึ้น:</strong>
              หน้ารายละเอียดงาน (group + single) ใช้ <code>--accent</code>
              ในเชิงลึกมากขึ้น — mesh gradient ที่ tint ด้วยสีงาน, dot pattern + plus signs
              ซ้อนบน hero, frosted glass pill สำหรับ type badge และ icon tile,
              description card ที่มี accent-tinted radial gradient
              ทำให้แต่ละงานรู้สึกมี "theme" ของตัวเองเหมือน Linear project pages
            </li>
            <li>
              <strong>รายละเอียดเล็ก ๆ ที่ดีขึ้น:</strong>
              Stat tiles บน today hero เป็น frosted glass (backdrop-filter blur)
              แทน solid color, event card มี accent-tinted radial wash + base shadow,
              yp-card มี vertical gradient + inset highlight แบบ Apple paper
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.2) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title">อัปเดตก่อนหน้า (v3.9.2)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>แนวทางออกแบบใหม่ — Gemini-inspired Calm Polish:</strong>
              ยึดมาตรฐานการออกแบบจาก Gemini Application เป็นหลัก —
              ผสานกับ Material 3 / Apple HIG / Microsoft Fluent 2
              หลักการ: <em>hover = state change, NOT motion</em>
              ความเคลื่อนไหวเกิดแค่ตอน press (เล็กน้อย) และตอน enter/exit
              ไม่ใช่ตอน hover ที่ user แค่เอาเมาส์มาวาง
            </li>
            <li>
              <strong>ยกเลิก hover ที่ขยาย/ยกองค์ประกอบทั้งหมด:</strong>
              ลบ <code>transform: scale()</code> และ <code>translateY()</code>
              ออกจาก <code>:hover</code> ทุกที่ในเว็บ —
              FAB, ปุ่ม primary/ghost/danger, card, event-card, stat, top-bar back/avatar,
              color option, type option, window close, bottom nav, profile action, info button
              เปลี่ยนเป็น state layer (background tint) แทน — สงบ ไม่เด้ง
            </li>
            <li>
              <strong>คงความโค้งมนตอน focus ช่องกรอกข้อมูล:</strong>
              แก้ปัญหาที่ช่อง input/textarea/select "หายมน" ตอน focus —
              เพิ่ม <code>border-radius: var(--yp-radius-control) !important</code>
              ใน <code>:focus</code> state เพื่อกันไม่ให้ browser/Tailwind
              reset ค่าในอนาคต + ลดความเข้มของ focus ring (10% opacity แทน 12%)
              ให้นุ่มนวลขึ้น
            </li>
            <li>
              <strong>ปุ่ม info (i) ออกแบบใหม่แบบ Gemini:</strong>
              เล็กลง (32px → 26px), สงบขึ้น (indigo tint เข้มขึ้นเล็กน้อย),
              hover ไม่ขยาย (ลบ <code>scale(1.08)</code> ออก) —
              ใช้แค่ background tint ที่เข้มขึ้น + border ที่ชัดขึ้น
              press ยังมี scale 0.92 เป็น tactile feedback
            </li>
            <li>
              <strong>จัดวางปุ่ม info ใหม่:</strong>
              ใน form-card header — title + info button อยู่บรรทัดเดียวกัน
              (flexbox align-items: center) และ subtitle อยู่บรรทัดล่าง
              ใน detail-section title — info button อยู่ติดกับข้อความ title
              ทำให้ปุ่ม info อยู่ "ถูกที่ถูกทาง" — ไม่ลอยๆ กลางบรรทัด
            </li>
            <li>
              <strong>Bottom sheet info ออกแบบใหม่แบบ Gemini:</strong>
              สีพื้นหลังนุ่มขึ้น (#FAFAFC), radius ใหญ่ขึ้น (28px แทน 20px),
              grip handle สีนุ่มขึ้น, header ใช้ align-items: center แทน flex-start,
              typography ปรับขนาด + letter-spacing ให้สบายตาขึ้น,
              code/pill/callout ใช้ radius 16px แทน 12px — เข้ากับเอกลักษณ์ YP Work
            </li>
            <li>
              <strong>สีพื้นหลังเว็บนุ่มขึ้น:</strong>
              เปลี่ยนจาก #F5F4FB → #F7F6FB (อบอุ่นขึ้นเล็กน้อย)
              + transition 220ms ตอนเปลี่ยนสี
            </li>
            <li>
              <strong>Transition สั้นลง — calmer:</strong>
              ทุก interactive element ใช้ 180ms (เดิม 220ms)
              + easing Material 3 standard — กดตอบสนองไว แต่ไม่กระตุก
            </li>
            <li>
              <strong>คงไว้ซึ่งเอกลักษณ์ YP Work ทั้งหมด:</strong>
              ความโค้งมนเดิมจาก v3.9.1 ยังอยู่ครบ —
              FAB 40px, bottom-nav 48px, back 32px, icon pill 999px
              + การปรับปรุง native จาก v3.9.0 (state layer, halo glow, velocity-aware) ยังอยู่
              v3.9.2 เปลี่ยนเฉพาะ "พฤติกรรม hover" ไม่เปลี่ยนรูปทรง
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.1) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.9.1)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>คืนค่าเอกลักษณ์ความโค้งมนเดิมของ YP Work:</strong>
              v3.9.0 ปรับตาม Material 3 spec มากเกินไปจน "เสียตัวตน" —
              FAB 18px, bottom-nav 22px, back button 14px, icon 18px
              ทำให้ดูเหมือนเว็บทั่วไป ไม่ใช่ YP Work
              v3.9.1 คืนค่าทั้งหมดกลับเป็น token เดิม —
              <code>--yp-radius-md</code> (40px) สำหรับ FAB,
              <code>--yp-radius-lg</code> (48px) สำหรับ bottom-nav,
              <code>--yp-radius-sm</code> (32px) สำหรับ back button,
              <code>--yp-radius-pill</code> (999px) สำหรับ icon pill
            </li>
            <li>
              <strong>Desktop Navigation Rail คืนรูปทรงเดิม:</strong>
              มุมบนซ้ายของ left-rail ใช้ <code>--yp-radius-lg</code> (48px)
              มุมอื่นๆ ใช้ <code>--yp-radius-sm</code> (32px) —
              ดูโค้งมนเป็นเอกลักษณ์เหมือนเดิม ไม่ใช่มนเล็กๆ แบบเว็บทั่วไป
            </li>
            <li>
              <strong>Active icon pill คืนค่าความโค้งมนเต็ม:</strong>
              pill indicator หลัง active icon ใช้ <code>--yp-radius-pill</code> (999px)
              แทน 18px แบบ v3.9.0 — ดูกลมเต็มเหมือนเดิม เป็นเอกลักษณ์ของ YP Work
            </li>
            <li>
              <strong>คงไว้ซึ่งการปรับปรุง native ทั้งหมดจาก v3.9.0:</strong>
              Material 3 state layer, halo glow, spring press, velocity-aware show/hide,
              Apple HIG translucency, 3-layer tonal elevation, calmer transitions —
              ยังอยู่ครบทุกอย่าง เปลี่ยนเฉพาะความโค้งมนกลับเป็นเอกลักษณ์เดิม
            </li>
            <li>
              <strong>หลักการออกแบบใหม่ — "Native feel, YP identity":</strong>
              เอางานวิจัยจาก Material 3 / Apple HIG / Fluent 2 มาใช้
              แต่ <strong>ไม่ทับเอกลักษณ์เดิม</strong> — ความโค้งมนที่ทำให้ YP Work
              ดูเป็น YP Work ต้องอยู่ เปลี่ยนแค่พฤติกรรม (state, motion, depth)
              ไม่เปลี่ยนรูปทรง
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.9.0) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.9.0)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>ปุ่มบวก (FAB) ระดับ Material 3 Extended FAB:</strong>
              ออกแบบใหม่ตามงานวิจัยของ Google Material 3 — ใช้ state layer
              (overlay 10% white ตอน hover, 16% ตอน press) แทนการ stack box-shadow หลายชั้น
              + halo glow (8px ring สี indigo 10%) ตอน hover + spring press (scale 0.92)
              ที่ให้สัมผัสเหมือน native app จริงๆ ไม่ใช่ "ปุ่มเว็บ"
              <br />
              <em>หมายเหตุ v3.9.2: คืนค่าความโค้งมนเดิม (40px) แทน 18px ของ v3.9.0</em>
            </li>
            <li>
              <strong>การแสดง/ซ่อนปุ่มบวกที่เสถียรขึ้น (velocity-aware):</strong>
              อัลกอริทึมใหม่ track velocity ของ scroll — ถ้า user ปัดเร็ว
              ปุ่มจะซ่อนทันที (responsive) แทนที่จะรอ threshold ครบ
              + เมื่อซ่อนจะ set <code>visibility: hidden</code> หลัง animation จบ
              กัน ghost click ที่เกิดจาก transition ค้าง — แก้ปัญหาที่เคยมีใน v3.8.x
            </li>
            <li>
              <strong>Bottom Nav แบบ Material 3 Navigation Bar:</strong>
              แทนที่ pattern เดิม (icon::before pseudo-element) ด้วย pill indicator
              สี indigo 12% ด้านหลัง active icon — สะอาดกว่า ทันสมัยกว่า
              + active icon scale 1.10 + inactive icon fade (opacity 0.85)
              + ลด bounce animation ออก (สงบขึ้น)
              <br />
              <em>หมายเหตุ v3.9.2: คืนค่าความโค้งมนเดิม (48px / pill 999px) แทน 22px / 18px</em>
            </li>
            <li>
              <strong>Top Bar แบบ Apple HIG translucency:</strong>
              เพิ่ม saturation เป็น 200% + blur เป็น 20px (เดิม 180% / 10px)
              ให้เอฟเฟกต์ frosted glass ชัดขึ้นเหมือน iOS
              + เพิ่ม <code>.is-scrolled</code> state — ตอน user เลื่อนลง ขอบล่างของ
              top bar จะเข้มขึ้นเล็กน้อย (subtle edge fade)
            </li>
            <li>
              <strong>เงา (shadow) สงบขึ้น 25%:</strong>
              ลด opacity ของ shadow ทุกระดับ (xs/sm/md/lg) ลง ~25%
              ลด visual noise — ดูนิ่งขึ้น ไม่ "เสียงดัง" ตา
              + เพิ่ม 3-layer tonal elevation สำหรับ FAB (Material 3 spec)
            </li>
            <li>
              <strong>Transition ที่นุ่มนวลและสม่ำเสมอ:</strong>
              มาตรฐานใหม่ — 220ms standard, 180ms press, 300ms large
              ใช้ easing cubic-bezier(0.2, 0, 0, 1) (Material 3 emphasized) ทั่วทั้งเว็บ
              ลด movement ลง ~30% จาก v3.8.x — กดแล้วค่อยๆ กลับ ไม่กระตุก
            </li>
            <li>
              <strong>Focus ring แบบ Material 3:</strong>
              outline 2px solid + offset 2px (เดิม 3px ring) — สะอาดกว่า
              ทำงานเฉพาะ focus-visible (keyboard nav) ไม่รบกวน mouse user
            </li>
            <li>
              <strong>Page enter ที่สงบขึ้น:</strong>
              ลด movement จาก translateY(8px) + scale(0.97) → translateY(6px) (no scale)
              + ใช้ Material 3 emphasized easing (0.3, 0, 0, 1)
              ทำให้หน้าเว็บเข้ามาเรียบ ไม่เด้ง
            </li>
            <li>
              <strong>Desktop FAB ที่ใหญ่ขึ้น (60×60):</strong>
              ตาม Material 3 spec สำหรับ desktop — touch target ใหญ่พอ
              + Navigation Rail (left-rail desktop) มี pill indicator ด้านซ้าย
              แบบ gradient indigo → violet
              <br />
              <em>หมายเหตุ v3.9.2: คืนค่าความโค้งมนเดิม (40px) แทน 20px ของ v3.9.0</em>
            </li>
            <li>
              <strong>Card entrance ที่ calmer:</strong>
              ลด stagger interval จาก 33ms → 40ms (calmer)
              + ลด movement จาก scale(0.92) → translateY(4px) (no scale)
              ทุกการ์ดเข้ามานุ่มนวล ไม่กระตุก
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.8.2.3) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.8.2.3)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>แยกระบบ "แสดง/ซ่อน" ออกจาก "ปิด/เปิด" อย่างชัดเจน:</strong>
              <em>แสดง/ซ่อน</em> = ระบบอัตโนมัติตอนเลื่อนหน้าเว็บ (มี animation ขาเข้า + ขาออก)
              — เลื่อนลง → ย่อ+จางหาย, เลื่อนขึ้น → ขยาย+จางเข้า
              <br />
              <em>ปิด/เปิด</em> = การเรียกใช้เชิงโปรแกรม (เช่น เปิด bottom sheet แล้วปุ่มบวกต้อง "ปิด")
              — ไม่มี animation ทั้งขาเข้าและขาออก ปิด/เปิดทันที
            </li>
            <li>
              <strong>เรียกคืนระบบแสดง/ซ่อนตอนเลื่อน (มี animation):</strong>
              จาก v3.8.2.2 ที่ลบทิ้งไป → ตอนนี้เอากลับมา พร้อม animation นุ่มนวล
              (scale + fade) ทั้งขาเข้าและขาออก
            </li>
            <li>
              <strong>ปิด/เปิดเชิงโปรแกรมไม่มี animation:</strong>
              เมื่อเปิด bottom sheet/window → ปุ่มบวก "ปิด" ทันที (ไม่ค่อยๆ จาง)
              เมื่อปิด sheet → ปุ่มบวก "เปิด" ทันที (ไม่ค่อยๆ ปรากฏ)
              กันความสับสนระหว่างสองระบบ
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.8.1) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.8.1)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>Custom caret ทั่วทั้งเว็บ:</strong>
              ไอ้ตัวเคอร์เซอร์กระพริบหลังข้อความที่พิมพ์ (เดิมสีดำกระพริบแข็งๆ)
              เปลี่ยนเป็นสีแบรนด์ indigo พร้อม animation แบบนุ่มนวล (fade แทน hard blink)
              ใช้กับทุกช่องกรอกข้อความในเว็บ
            </li>
            <li>
              <strong>Character reveal/delete animation:</strong>
              ในหน้า login และลงทะเบียน — เวลาพิมพ์ตัวอักษรใหม่หรือลบ
              ตัวอักษรจะมี transition นุ่มนวล (typing pulse + scale) แทนการปรากฏ/หายแบบปุ๊บปั๊บ
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.8.0) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.8.0)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>FAB scroll show/hide ที่ใช้งานได้จริง:</strong>
              เขียน scroll-direction algorithm ใหม่แบบ native-app —
              ใช้ velocity tracking + threshold แบบ pixel-accurate
              ปัดนิ้วขึ้น (เนื้อหาเลื่อนลง) → ซ่อน FAB ทันที
              ปัดนิ้วลง (เลื่อนขึ้นบน) → แสดง FAB กลับมา
              แก้ปัญหาที่กด FAB ไม่ได้หลังเลื่อนใน v3.7.14 จริงๆ
            </li>
            <li>
              <strong>FAB transitions นุ่มนวลแบบ native:</strong>
              active state (squish) มี transition 220ms cubic-bezier
              show/hide ใช้ scale + fade พร้อมกัน (scale 0.6 + opacity 0 → 1)
              เหมือนปุ่มบวกในแอปมืออาชีพระดับ Notion / Linear
            </li>
            <li>
              <strong>เปลี่ยน &ldquo;หมายเหตุ&rdquo; → &ldquo;รายละเอียด&rdquo;:</strong>
              ใน Add/Edit Task sheet — เปลี่ยน label และ placeholder ให้สื่อความหมายมากขึ้น
              เอา placeholder เดิมที่บอกว่า &ldquo;ไฟล์แนบ&rdquo; ออก (ระบบยังไม่รองรับไฟล์แนบ)
            </li>
            <li>
              <strong>&ldquo;เวลาโดยประมาณ&rdquo; เป็น picker แทน text:</strong>
              เปลี่ยนจาก text input → select dropdown พร้อมตัวเลือกที่ครบถ้วน
              15 นาที · 30 นาที · 1 ชม. · 2 ชม. · ครึ่งวัน · 1 วัน · ไม่ระบุ
              กัน user พิมพ์ค่าที่ไม่มาตรฐาน
            </li>
            <li>
              <strong>Placeholders ครบทุกช่อง:</strong>
              EditTaskSheet ก่อนหน้านี้ไม่มี placeholder ในช่องชื่อ task
              ตอนนี้ครบทุกช่อง + ข้อความเป็นมิตรขึ้น
            </li>
            <li>
              <strong>เวลางานที่ไม่ได้เลือก:</strong>
              ตอนนี้แสดง &ldquo;ยังไม่ได้เลือกเวลา&rdquo; แทนที่จะไม่แสดงอะไรเลย
              ทำให้ user รู้ว่า field นี้มี แค่ยังไม่ได้กรอก
            </li>
            <li>
              <strong>เลขบัตรประชาชน auto-format ครบทุกจุด:</strong>
              หน้า register ตอนนี้ใส่ขีดคั่น X-XXXX-XXXXX-XX-X อัตโนมัติเหมือนหน้า login
              ขีดจะถูกตัดออกก่อนเก็บลง DB (UI-only formatting)
            </li>
            <li>
              <strong>Global transition polish:</strong>
              เพิ่ม transition นุ่มนวลให้ทุกที่ที่เคยเปลี่ยน state แบบปุ๊บปั๊บ
              ทุกปุ่ม · การ์ด · chip · input · nav item · color option
              ใช้ cubic-bezier(0.2, 0, 0, 1) 220ms เป็น default
            </li>
            <li>
              <strong>API layer ประหยัด request:</strong>
              เพิ่ม Cache-Control headers ที่เหมาะสม + dedupe guard
              ลด duplicate request เมื่อ cache ยัง fresh — ลด CPU/load บน Vercel
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.14) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.14)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>แก้ไขความโค้งมน (มากขึ้นจริงๆ):</strong>
              v3.7.13 ผมลดค่า (ผิด) → v3.7.14 เพิ่มค่าจริง: xs:24, sm:32, md:40, lg:48, xl:60, 2xl:72
              ทุกองค์ประกอบโค้งมนมากขึ้นจาก v3.7.12 จริงๆ
            </li>
            <li>
              <strong>แก้ไข FAB scroll show/hide:</strong>
              เปลี่ยนจาก app-main scroll → window scroll (ทำงานได้จริง)
              + ย่อ+จางหาย (scale 0.5) / ขยาย+จางเข้า (scale 1)
              + transition นุ่มนวล 320ms
            </li>
            <li>
              <strong>แก้ไข FAB active นุ่มนวลขึ้น:</strong>
              เพิ่ม transition 120ms สำหรับ active state + scale 0.92 + shadow ลด
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.13) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.13)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>เลขบัตรประชาชน auto-format:</strong>
              พิมพ์เลขบัตร → ระบบใส่ dash คั่นอัตโนมัติตามรูปแบบไทย
            </li>
            <li>
              <strong>Bottom sheet ไม่ซ่อน top-bar:</strong>
              เปิด bottom sheet แล้ว top-bar ยังคงอยู่
            </li>
            <li>
              <strong>Filter re-animation:</strong>
              เปลี่ยน filter → ทุก item re-animate พร้อมกัน
            </li>
            <li>
              <strong>Global transition system:</strong>
              ทุกองค์ประกอบที่เปลี่ยน state มี transition แบบ smooth
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.11) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.11)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>ปฏิทิน redesign ใหม่:</strong>
              ลบ Hero block แยกออก → toolbar รวมเข้ากับ page header
              ทำให้กดปุ่มต่างๆ สะดวกขึ้น ไม่ต้องเลื่อนหา + ดีไซน์สะอาด
              ใช้ <code>.yp-card</code> wrapper แทน gradient hero
            </li>
            <li>
              <strong>มุมมองรายการ (List view):</strong>
              เพิ่ม toggle ระหว่าง &ldquo;ปฏิทิน&rdquo; และ &ldquo;รายการ&rdquo; —
              list view แสดงงานเรียงตามวันที่ จัดกลุ่มตามเดือน
              มี date block สีตาม event + meta (วัน, เวลา, สถานที่)
            </li>
            <li>
              <strong>ปฏิทินใหม่:</strong>
              ใช้ gap แทน border ระหว่างวัน → ดูสะอาดขึ้น
              + min-height 72px (เดิม 80px) → กระทัดรัดขึ้น
              + legend อยู่ใน card แทนแยกออกมา
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.10) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.10)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>Google-style animations (no blur):</strong>
              ลบ <code>filter: blur()</code> ออกจาก entrance animations ทั้งหมด —
              ประหยัด GPU แต่ยังดู premium ใช้ scale + opacity แบบ Google Material Design 3
              + stagger 33ms (snappy, not sluggish)
            </li>
            <li>
              <strong>Content change animations:</strong>
              เพิ่ม <code>.yp-content-enter</code> + <code>.yp-content-exit</code> —
              content ที่เพิ่ม/ลบ/กรอง มี animation แทนการเปลี่ยนแบบปุ๊บปั๊บ
              + event card entrance (scale + slide) + task row slide-in + filter pop
            </li>
            <li>
              <strong>Chubby stat cards (อ้วนน่ารัก):</strong>
              ปรับ stat card ให้ centered, มนโค้งมากขึ้น (radius-lg), min-height 110px —
              ดูสมส่วน ไม่ยืด ไม่แบน + icon ใหญ่ขึ้น (40px) + text center
            </li>
            <li>
              <strong>Chubbier buttons:</strong>
              เพิ่ม padding (0.9em → 1.8em) + min-height 50px —
              ปุ่มอ้วนขึ้นเหมือนปุ่มเพิ่ม task + active state แรงขึ้น (scale 0.95)
            </li>
            <li>
              <strong>Squishy active states:</strong>
              ทุกปุ่ม/card มี active scale ที่แรงขึ้น —
              FAB (0.92), nav (0.92), close (0.88), stat (0.97), event-card (0.98)
            </li>
            <li>
              <strong>Smooth scroll:</strong>
              เพิ่ม <code>scroll-behavior: smooth</code> ทั่วทั้งเว็บ
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.9) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.9)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>Premium card design:</strong>
              การ์ดทุกใบมี depth แบบ layered shadow (multi-layer) ที่ดูมีมิติ
              + hover lift + shadow expand + border glow → ดูมินิมอลแต่ไม่แบน
            </li>
            <li>
              <strong>Premium entrance animations:</strong>
              การ์ดเข้าแบบ scale + blur + spring (ไม่ใช่แค่ translateY)
              + stagger delay ที่ลื่นไหล → รู้สึก premium exclusive
            </li>
            <li>
              <strong>Premium page transition:</strong>
              หน้าเว็บเข้าแบบ scale + blur + spring (460ms)
              → รู้สึกเหมือน native app
            </li>
            <li>
              <strong>Premium bottom sheet:</strong>
              sheet เลื่อนขึ้นแบบ spring (overshoot เล็กน้อย) + deeper shadow
              → ดูมี depth และ smooth
            </li>
            <li>
              <strong>Premium modal:</strong>
              modal scale-in แบบ spring + layered shadow + indigo glow
              → ดูพรีเมียม
            </li>
            <li>
              <strong>Premium button hover:</strong>
              ปุ่ม primary/danger/ghost มี lift + glow on hover
              + FAB spring entrance (rotate + scale)
            </li>
            <li>
              <strong>Premium type/color picker:</strong>
              type-option lift + glow, color-option spring scale + rotate
            </li>
            <li>
              <strong>Premium close button:</strong>
              rotate 90° on hover + rose tint
            </li>
            <li>
              <strong>Premium input focus:</strong>
              indigo glow pulse ตอน focus
            </li>
            <li>
              <strong>Premium nav bounce:</strong>
              bottom-nav active item มี subtle bounce animation
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.8) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.8)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>Design renovation — yp-form-card:</strong>
              สร้าง <code>.yp-form-card</code> class ใหม่ — card wrapper สำหรับ full-page forms
              ที่ให้ depth + space เหมือน bottom sheet →
              create-event-form ดูมีพื้นที่และ depth เท่า AddTaskSheet แล้ว
            </li>
            <li>
              <strong>Login form autocomplete:</strong>
              เพิ่ม <code>autocomplete</code> attributes ในทุก input —
              browser รับรู้ว่าเป็นรหัสนักเรียน/อีเมล/รหัสผ่าน →
              สามารถ save รหัสผ่านได้ (รองรับ password manager)
            </li>
            <li>
              <strong>Modular CSS structure:</strong>
              เพิ่ม <code>.yp-form-section</code>, <code>.yp-form-section__title</code>,
              <code>.yp-form-card__header</code>, <code>.yp-form-card__title</code>,
              <code>.yp-form-card__subtitle</code>, <code>.yp-form-card__actions</code> —
              ใช้แทน inline styles ใน form headers
            </li>
            <li>
              <strong>Consistent spacing:</strong>
              ปรับ <code>.yp-form-modal__section</code> ให้มี spacing สม่ำเสมอ
              ระหว่าง full-page และ bottom sheet forms
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.7) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.7)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>แก้ปัญหา login ไม่ได้หลัง logout (RLS issue):</strong>
              สาเหตุจริง: <code>council_users</code> มี RLS policy &ldquo;SELECT ตัวเอง&rdquo;
              (WHERE <code>auth_uid = auth.uid()</code>) หลัง signIn สำเร็จ
              Supabase auth session อาจยังไม่พร้อมทันที →
              <code>auth.uid()</code> คืนค่า null → RLS บล็อก →
              query คืนค่าว่าง → &ldquo;ไม่พบบัญชี&rdquo;
              <br /><br />
              <strong>วิธีแก้:</strong> สร้าง <code>/api/auth/login</code> server-side endpoint
              ที่ใช้ <code>adminClient</code> (service role) query council_users →
              bypass RLS → query ได้แน่นอนแม้ session ยังไม่พร้อม
              <br />
              <code>loginStudent</code> + <code>loginOther</code> เรียก endpoint นี้แทน
              client-side query (มี fallback ไปใช้วิธีเดิมถ้า server ไม่พร้อม)
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.6) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.6)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>แก้ปัญหา logout แล้ว login ไม่ได้ (วิกฤต!):</strong>
              หลัง logout ระบบล้างเฉพาะ Supabase cookies แต่
              <strong>ไม่ได้ล้าง localStorage</strong> →
              <code>yp_rejected_accounts</code> ยังคงอยู่ →
              เมื่อ login ใหม่ ระบบตรวจพบว่า &ldquo;ถูกปฏิเสธ&rdquo;
              ทั้งที่จริงๆ บัญชีถูกอนุมัติแล้ว → แสดงข้อความ &ldquo;ไม่พบบัญชี&rdquo;
              <br /><br />
              <strong>วิธีแก้:</strong> เพิ่ม <code>clearAllAuthStorage()</code> —
              ล้าง localStorage ทั้งหมดที่เกี่ยวข้องกับ auth ก่อน navigate ไป /login
              (pending session, rejected accounts, CSRF token, tutorial state)
            </li>
            <li>
              <strong>Design system documentation:</strong>
              เพิ่ม comment อธิบาย &ldquo;ศูนย์กลางการออกแบบ&rdquo; ที่ส่วนบนของ globals.css —
              ระบุคลาสศูนย์กลางที่ใช้บ่อย (form fields, buttons, banners, typography, layout)
              เพื่อให้ developer รู้ว่าควร reuse อะไร แทนการสร้างใหม่
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.5) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.5)</h2>
          <ul className="yp-feature-list">
            <li>
              <strong>รวม token ที่ซ้ำซ้อนให้เหลือจุดเดียว:</strong>
              หลายจุด (<code>.yp-page-header</code>, <code>.yp-card</code>,
              <code>.yp-skeleton</code>, <code>.yp-select</code>, <code>.yp-btn</code>)
              เคยถูกประกาศสไตล์ซ้ำ 2-3 รอบในไฟล์เดียวกัน แต่ละรอบใช้ token คนละตัว
              ทับกันไปเรื่อยๆ ตอนนี้เหลือ 1 นิยาม ใช้ 1 token ต่อ 1 property เท่านั้น
            </li>
            <li>
              <strong>Selected state เรียบง่ายขึ้น:</strong>
              ตัวเลือก (ประเภทงาน, สี, ระดับความสำคัญ) ตอนถูกเลือกแสดงแค่
              &ldquo;กรอบ&rdquo; เส้นเดียวรอบนอก — เอา background tint + shadow ซ้อน
              + scale ที่เคยทับกันหลายชั้นออก ให้ทุกหน้าสัมผัสเดียวกัน
            </li>
            <li>
              <strong>เลิก inline style ที่แปะ token ทับ class:</strong>
              เช่น <code>.yp-card</code> ที่มี <code>style={'{{ marginBottom: ... }}'}</code>
              แปะซ้ำทุกจุด — เปลี่ยนเป็น CSS adjacency rule
              (<code>.yp-page &gt; .yp-card + .yp-card</code>) ครั้งเดียวจบ
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.4) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.4)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>แก้ปัญหา "UI คนละยุค":</strong>
              ปัญหาจริงไม่ใช่ design tokens แต่อยู่ที่ <strong>วิธีใช้</strong> —
              แต่ละหน้าเอา tokens มา "บวกเพิ่ม" ด้วย inline styles ทำให้ความรู้สึกไม่เหมือนกัน
              ตอนนี้สร้าง pattern-based utility classes แทน inline styles กระจัดกระจาย
            </li>
            <li>
              <strong>เพิ่ม banner classes:</strong>
              <code>.yp-error-banner</code>, <code>.yp-success-banner</code>,
              <code>.yp-info-banner</code> — reuse แทน inline style ทั้งก้อน
            </li>
            <li>
              <strong>เพิ่ม icon/text utilities:</strong>
              <code>.yp-icon-inline</code>, <code>.yp-btn__text-with-icon</code>,
              <code>.yp-stat__icon-text</code>, <code>.yp-stat__value--text</code>
            </li>
            <li>
              <strong>เพิ่ม flex/text utilities:</strong>
              <code>.yp-flex-inline</code>, <code>.yp-flex-row</code>, <code>.yp-flex-col</code>,
              <code>.yp-text-xs/sm/base/lg</code>, <code>.yp-fw-normal/medium/semibold/bold</code>,
              <code>.yp-text-muted/secondary/body/heading/strong/accent/danger/success</code>
            </li>
            <li>
              <strong>เพิ่ม accent-driven pattern:</strong>
              <code>.yp-accented</code> สำหรับ components ที่ต้องการ dynamic accent color
              (event color, department color)
            </li>
            <li>
              <strong>Refactor event-detail:</strong>
              ลด inline styles จาก 32 → ~15 จุด (เหลือเฉพาะ CSS variable injection ที่จำเป็น)
            </li>
            <li>
              <strong>Refactor event-card:</strong>
              ลด inline styles จาก 3 → 2 จุด (icon ใช้ <code>color-mix</code> + <code>--accent</code>)
            </li>
            <li>
              <strong>Refactor create-event-form:</strong>
              ลด inline styles จาก 5 → 1 จุด (เหลือเฉพาะ color picker background)
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.3) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.3)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>Unified design system:</strong>
              เพิ่ม design tokens สำหรับ form fields + utility classes ใหม่ 8 ตัว
            </li>
            <li>
              <strong>ลด CSS duplication:</strong>
              merge <code>.yp-textarea</code> และ <code>.field__hint</code> ที่ซ้ำซ้อน
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.2) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.2)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>แก้ปัญหาอนุมัติแล้วไม่เข้าระบบอัตโนมัติ:</strong>
              สร้าง <code>/api/auth/auto-login</code> server-side endpoint + hard navigation
            </li>
            <li>
              <strong>แก้ปัญหาสมัครเสร็จแล้วผ่านหน้า login ก่อน:</strong>
              ใช้ <code>window.location.replace('/pending-status')</code> ตรงไปเลย
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.1) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.1)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>แก้ปัญหา logout ไม่สำเร็จจริง:</strong>
              สร้าง <code>/api/auth/logout</code> server-side endpoint ล้าง httpOnly cookies
            </li>
            <li>
              Middleware ยอมรับ <code>?logged_out=1</code> — ป้องกัน redirect กลับ <code>/today</code>
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.7.0) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.7.0)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>แก้ปัญหา "column council_users.color does not exist":</strong>
              ลบการ query column <code>color</code> ทั้งหมด 7 จุด แทนที่ด้วย <code>getUserColor()</code>
            </li>
            <li>
              <strong>สี user ที่สวยและคงที่:</strong>
              <code>getUserColor()</code> ใช้ hash function สร้างสีจาก auth_uid
            </li>
          </ul>
        </div>

        {/* ── WHAT'S NEW (v3.6.0 — เก็บไว้อ้างอิง) ── */}
        <div className="yp-card">
          <h2 className="yp-section-title yp-section-title--muted">อัปเดตก่อนหน้า (v3.6.0)</h2>
          <ul className="yp-feature-list yp-feature-list--muted">
            <li>
              <strong>ความเร็วในการลบงาน:</strong>
              ใช้ hard navigation + loading overlay — feedback ภายใน 1 เฟรม
            </li>
            <li>
              <strong>การออกแบบที่สอดคล้องกัน:</strong>
              ปรับ input และ form ทุกหน้าให้มีสไตล์เดียวกับหน้า login
            </li>
            <li>
              <strong>ลบคำว่า "Demo":</strong>
              เปลี่ยนข้อความทั้งหมดเป็นข้อความที่เหมาะสมสำหรับ production
            </li>
            <li>
              <strong>ความเสถียร:</strong>
              เพิ่ม error boundary, retry logic, offline handling
            </li>
          </ul>
        </div>

        {/* ── HELP & TUTORIAL SECTION ── */}
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
            <div className="yp-help-section__title">การสร้างงาน</div>
            <div className="yp-help-section__body">
              <p>กดปุ่ม <code>+</code> ที่มุมล่างขวาเพื่อสร้างงานใหม่</p>
              <ul>
                <li><strong>กลุ่มงาน</strong> — งานใหญ่ที่มีหลาย task ย่อย</li>
                <li><strong>งานเดี่ยว</strong> — งานเดียวที่ไม่มี task</li>
              </ul>
              <p>งานสามารถมอบหมายให้สมาชิกในฝ่ายได้ และติดตามสถานะแบบเรียลไทม์</p>
            </div>
          </div>
          <div className="yp-help-section">
            <div className="yp-help-section__title">การอัพเดตแบบเรียลไทม์</div>
            <div className="yp-help-section__body">
              <p>ทุกการเปลี่ยนแปลง (เพิ่ม/แก้ไข/ลบ งาน, task, สมาชิก) อัพเดต <strong>ทันที</strong> โดยไม่ต้อง refresh หน้า</p>
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
