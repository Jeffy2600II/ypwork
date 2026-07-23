'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Create Event Form (client component)
// ═══════════════════════════════════════════════════════════════
// ฟอร์มสร้างรายการ: type, title, date, time, location, description,
// department, color
// หลัง submit → insert ลง ypwork_events → redirect ไป /events/[id]
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Flag } from 'lucide-react';
import type { Department, EventType } from '@/lib/types';
import { getLocalTodayStr } from '@/lib/utils/date';   // ★ v3.9.4: Thailand timezone
import { InfoButton, InfoSheetHeader, InfoSectionTitle, InfoOption, InfoExample, InfoCallout, InfoSteps, InfoStep, InfoKeyValue, InfoKeyValueRow, InfoPill, InfoTldr, InfoCompare } from '@/components/ui/info-button';

const COLOR_OPTIONS = [
  '#4F46E5',
  '#7C3AED',
  '#A855F7',
  '#14B8A6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#D946EF',
  '#F43F5E',
];

export interface CreateEventFormProps {
  departments: Department[];
  /** ถ้ามี editId → โหมดแก้ไข (preload event) */
  editEvent?: {
    id: string;
    type: EventType;
    title: string;
    date: string;
    start_date: string | null;   // ★ v3.10.0 รอบที่ 29
    time: string;
    location: string;
    description: string;
    department_id: string | null;
    color: string;
  } | null;
  /** created_by = user.auth_uid */
  userUid: string;
}

export function CreateEventForm({
  departments: initialDepartments,
  editEvent,
  userUid,
}: CreateEventFormProps) {
  const router = useRouter();
  const isEdit = !!editEvent;

  // ★ v3.4.0: รองรับ client-side department fetch
  // หน้า create (ไม่มี editEvent) จะส่ง departments = [] มา
  // form จะ render ทันที แล้ว fetch departments ใน background
  const [departments, setDepartments] = React.useState<Department[]>(
    initialDepartments
  );
  const [deptLoading, setDeptLoading] = React.useState(
    initialDepartments.length === 0
  );

  const [type, setType] = React.useState<EventType>(editEvent?.type || 'group');
  const [title, setTitle] = React.useState(editEvent?.title || '');
  // ★ v3.10.0 รอบที่ 29: start_date — วันที่เริ่มลงมือทำ (ไม่บังคับ)
  //   ถ้าโหมดแก้ไขและมี start_date → ใช้ค่าเดิม
  //   ถ้าโหมดสร้างใหม่ → เริ่มว่าง (ผู้ใช้กรอกเอง หรือจะปล่อยว่างก็ได้)
  const [startDate, setStartDate] = React.useState<string>(editEvent?.start_date || '');
  // ★ v3.10.0 รอบที่ 29: เปลี่ยน label ของ `date` จาก "วันที่" → "กำหนดส่ง"
  //   เพื่อสื่อความหมายชัดเจนว่านี่คือ deadline ไม่ใช่วันเริ่มต้น
  //   ค่า default สำหรับโหมดสร้างใหม่ = วันนี้ (เหมือนเดิม)
  const [date, setDate] = React.useState(
    // ★ v3.9.4: ใช้ getLocalTodayStr() แทน new Date().toISOString().slice(0, 10)
    //   เพราะ toISOString() แปลงเป็น UTC ก่อน slice — ถ้า user อยู่ timezone อื่น
    //   "วันนี้" อาจกลายเป็นเมื่อวานหรือพรุ่งนี้
    editEvent?.date || getLocalTodayStr()
  );
  const [time, setTime] = React.useState(editEvent?.time || '');
  const [location, setLocation] = React.useState(editEvent?.location || '');
  const [description, setDescription] = React.useState(
    editEvent?.description || ''
  );
  const [departmentId, setDepartmentId] = React.useState<string>(
    editEvent?.department_id || initialDepartments[0]?.id || ''
  );
  const [color, setColor] = React.useState<string>(
    editEvent?.color || COLOR_OPTIONS[0]
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ★ v3.4.0: fetch departments ฝั่ง client (เฉพาะเมื่อยังไม่มี)
  React.useEffect(() => {
    if (initialDepartments.length > 0) return; // มีมาจาก server แล้ว
    if (editEvent) return; // โหมดแก้ไข — server จะส่งมาภายหลัง

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/departments', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
          // ถ้ายังไม่ได้เลือก dept → เลือกอันแรกให้อัตโนมัติ
          if (!departmentId && data.departments.length > 0) {
            setDepartmentId(data.departments[0].id);
          }
        }
      } catch {
        // silent fail — user ยังเลือก "ไม่ระบุ" ได้
      } finally {
        if (!cancelled) setDeptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('กรุณากรอกชื่อรายการ');
      return;
    }
    if (!date) {
      setError('กรุณาเลือกวันกำหนดส่ง');
      return;
    }
    // ★ v3.10.0 รอบที่ 31: ตรวจสอบวันกำหนดส่ง >= วันที่เริ่ม
    //   ถ้าตั้งวันที่เริ่มไว้ → วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม
    //   ถ้าวันเดียวกัน → ไม่มีการตรวจสอบเวลา (เพราะ event มีแค่เวลาเริ่ม ไม่มีเวลาสิ้นสุด)
    if (startDate && date < startDate) {
      setError('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม');
      return;
    }

    setSubmitting(true);

    try {
      // v3.4.1: ใช้ fetch ปกติ — CSRF validation ถูกลบออกจาก middleware แล้ว
      // SameSite=Lax cookies ป้องกัน CSRF ได้เพียงพอ
      if (isEdit && editEvent) {
        const res = await fetch(`/api/events/${editEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            title: title.trim(),
            date,
            start_date: startDate || null,   // ★ v3.10.0 รอบที่ 29
            time: time || '',
            location: location.trim(),
            description: description.trim(),
            department_id: departmentId || null,
            color,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ไม่สามารถแก้ไขรายการ');
        }
        router.replace(`/events/${editEvent.id}`);
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            title: title.trim(),
            date,
            start_date: startDate || null,   // ★ v3.10.0 รอบที่ 29
            time: time || '',
            location: location.trim(),
            description: description.trim(),
            department_id: departmentId || null,
            color,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.id) {
          throw new Error(data.error || 'ไม่สามารถสร้างรายการ');
        }
        router.replace(`/events/${data.id}`);
      }
    } catch (e: any) {
      setError(`เกิดข้อผิดพลาด: ${e.message || 'unknown error'}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="yp-page yp-page-enter">
      <div className="yp-page-header">
        <div className="yp-page-header__eyebrow">
          {isEdit ? 'แก้ไขรายการ' : 'สร้างรายการใหม่'}
        </div>
        <h1 className="yp-page-header__title">
          {isEdit ? 'แก้ไขรายละเอียดรายการ' : 'สร้างรายการใหม่'}
        </h1>
        <p className="yp-page-header__subtitle">
          {isEdit
            ? 'ปรับปรุงข้อมูลรายการแล้วกดบันทึก'
            : 'เลือกประเภทรายการและกรอกรายละเอียด'}
        </p>
      </div>

      {error ? (
        <div className="yp-error-banner">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        {/* ── TYPE PICKER ── */}
        <div className="yp-form-card">
          <div className="yp-form-card__header">
            <h2 className="yp-form-card__title">ประเภทรายการ</h2>
            <p className="yp-form-card__subtitle">
              เลือกให้ตรงกับลักษณะงานจริง — มีผลต่อวิธีจัดการรายการนั้น
              <InfoButton
                size="sm"
                content={
                  <>
                    <InfoSheetHeader
                      icon={<Layers size={20} strokeWidth={2} />}
                      title="ประเภทรายการ"
                      subtitle="เลือกให้ตรงกับลักษณะงานจริง — มีผลต่อวิธีจัดการรายการนั้น"
                    />

                    <InfoTldr>
                      มี 2 ประเภทให้เลือก:{' '}
                      <InfoPill>กลุ่มรายการ</InfoPill>{' '}
                      ใช้เมื่อต้องแบ่งงานเป็นหลายส่วนย่อย ส่วน{' '}
                      <InfoPill>รายการ</InfoPill>{' '}
                      ใช้กับงานที่ทำครั้งเดียวจบ ไม่ต้องแบ่งย่อย
                    </InfoTldr>

                    <InfoSectionTitle>เปรียบเทียบ 2 ประเภท</InfoSectionTitle>

                    <InfoCompare
                      left={{
                        title: <><Layers size={14} strokeWidth={2.4} className="yp-icon-inline" />กลุ่มรายการ</>,
                        tone: 'accent',
                        items: [
                          <>มี <strong>รายการย่อย</strong> ได้หลายรายการ</>,
                          <>เปลี่ยนสถานะไม่ได้โดยตรง — เปลี่ยนที่รายการย่อยแต่ละอัน</>,
                          <>เพิ่มรายการย่อยได้เรื่อย ๆ</>,
                          <>มอบหมายรายการย่อยให้คนละฝ่ายได้</>,
                        ],
                      }}
                      right={{
                        title: <><Flag size={14} strokeWidth={2.4} className="yp-icon-inline" />รายการ</>,
                        items: [
                          <>ไม่มีรายการย่อย — ทำทีเดียวจบ</>,
                          <>เปลี่ยนสถานะเป็น &ldquo;กำลังดำเนินการ&rdquo; / &ldquo;เสร็จสมบูรณ์&rdquo; ได้เลย</>,
                          <>เหมาะกับงานที่ไม่ซับซ้อน</>,
                          <>เปลี่ยนเป็นกลุ่มรายการทีหลังได้</>,
                        ],
                      }}
                    />

                    <InfoSectionTitle>ตัวอย่างการใช้งานจริง</InfoSectionTitle>

                    <InfoKeyValue>
                      <InfoKeyValueRow
                        k={<><InfoPill>กลุ่มรายการ</InfoPill></>}
                        v={<>วันแม่ · วันวิทยาศาสตร์ · วันกีฬาสี · วันครู</>}
                      />
                      <InfoKeyValueRow
                        k={<><InfoPill>รายการ</InfoPill></>}
                        v={<>ส่งเอกสาร · ขออนุมัติเวที · ส่งรายงานการประชุม · ซื้อของ</>}
                      />
                    </InfoKeyValue>

                    <InfoSectionTitle>เลือกประเภทไหนดี?</InfoSectionTitle>

                    <InfoSteps>
                      <InfoStep title="งานนี้ต้องแบ่งเป็นหลายส่วนไหม?">
                        ถ้าใช่ → เลือก <InfoPill>กลุ่มรายการ</InfoPill>
                        (สร้างรายการย่อยเพื่อแบ่งงานกันทำ)
                      </InfoStep>
                      <InfoStep title="งานนี้ทำทีเดียวจบไหม?">
                        ถ้าใช่ → เลือก <InfoPill>รายการ</InfoPill>
                        (เปลี่ยนสถานะได้เลย ไม่ต้องสร้างรายการย่อย)
                      </InfoStep>
                      <InfoStep title="ยังไม่แน่ใจ?">
                        เริ่มจาก <strong>รายการ</strong> ก่อน — ถ้าทำไปแล้วเห็นว่ามีหลายส่วนย่อย
                        ค่อยเปลี่ยนเป็น <strong>กลุ่มรายการ</strong> ทีหลังได้
                      </InfoStep>
                    </InfoSteps>

                    <InfoCallout type="tip" title="เลือกผิดแก้ไขได้ ไม่เสียหาย">
                      เลือกผิดก็แก้ไขได้ภายหลัง — เข้าไปที่รายการนั้นแล้วกด &ldquo;แก้ไข&rdquo;
                      ระบบจะปรับประเภทให้ (ถ้ามีรายการย่อยอยู่แล้วจะถูกเก็บไว้)
                    </InfoCallout>
                  </>
                }
              />
            </p>
          </div>
          <div className="yp-type-picker">
            <button
              type="button"
              className={`yp-type-option${type === 'group' ? ' is-selected' : ''}`}
              onClick={() => setType('group')}
              aria-pressed={type === 'group'}
            >
              <div className="yp-type-option__icon">
                <Layers width={20} height={20} />
              </div>
              <div className="yp-type-option__title">กลุ่มรายการ</div>
              <div className="yp-type-option__desc">
                สร้างรายการย่อยภายในได้ เช่น วันแม่ วันภาษาไทย
              </div>
            </button>

            <button
              type="button"
              className={`yp-type-option${type === 'task' ? ' is-selected' : ''}`}
              onClick={() => setType('task')}
              aria-pressed={type === 'task'}
            >
              <div className="yp-type-option__icon">
                <Flag width={20} height={20} />
              </div>
              <div className="yp-type-option__title">รายการ</div>
              <div className="yp-type-option__desc">
                รายการเดียวจบ เช่น ส่งเอกสาร ขออนุมัติ
              </div>
            </button>
          </div>
        </div>

        {/* ── FIELDS ── */}
        <div className="yp-form-card">
          <div className="yp-form-card__header">
            <h2 className="yp-form-card__title">รายละเอียดรายการ</h2>
            <p className="yp-form-card__subtitle">กรอกข้อมูลให้ครบถ้วนเพื่อให้ทีมเข้าใจรายการได้ชัดเจน</p>
          </div>
        <div className="yp-form-modal__section">
          {/* ★ v3.10.0 รอบที่ 29: เรียงลำดับฟอร์มใหม่ — กรอกข้อมูลที่จำเป็นไปเรื่อยๆ
              ไม่ใช่กรอกลัดไปลัดมา ตามหลักการ "จากส่วนที่ต้องรู้ก่อน → ส่วนที่ตามมา"
              1. ชื่อรายการ (required, ตัวตนของงาน)
              2. รายละเอียด (เลื่อนขึ้นมาใกล้ชื่อ — เพื่อนต้องรู้บริบทก่อน)
              3. วันที่เริ่ม (จะเริ่มลงมือทำเมื่อไหร่)
              4. เวลาเริ่ม (เวลาที่เริ่มในวันนั้น)
              5. กำหนดส่ง (deadline — ส่งภายในเมื่อไหร่)
              6. สถานที่
              7. ฝ่ายที่รับผิดชอบ
              8. สีประจำรายการ */}
          <div className="field">
            <label className="field__label" htmlFor="ev-title">
              ชื่อรายการ <span className="yp-required">*</span>
            </label>
            <input
              id="ev-title"
              type="text"
              className="yp-input"
              required
              placeholder="เช่น วันแม่แห่งชาติ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* ★ v3.10.0 รอบที่ 29: รายละเอียดย้ายขึ้นมาใกล้ชื่อ — เพราะเพื่อนต้องเข้าใจ
              บริบทของงานก่อนที่จะรู้วันเวลา การเลื่อนขึ้นมาช่วยให้กรอกได้เป็นลำดับ
              ตามธรรมชาติของการวางแผน: "อะไร → ทำไม → เมื่อไหร่ → ที่ไหน → ใคร" */}
          <div className="field">
            <label className="field__label" htmlFor="ev-desc">
              รายละเอียด{' '}
              <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
            </label>
            <textarea
              id="ev-desc"
              className="yp-textarea"
              placeholder="อธิบายวัตถุประสงค์หรือสิ่งที่ต้องทำ"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* ★ v3.10.0 รอบที่ 29: วันที่เริ่ม — วันที่จะลงมือทำ (ไม่บังคับ)
              ผู้ใช้สามารถระบุวันเริ่มต่างจากวันกำหนดส่งได้ เพื่อให้ระบบอ้างอิง
              จากจุดเริ่มต้นแทนที่จะอ้างแค่จุดสิ้นสุด ทำให้เห็นภาพรวมของงาน
              "จะเริ่มตอนไหน → ส่งเมื่อไหร่" แทนที่จะเห็นแค่ "ส่งเมื่อไหร่" */}
          <div className="field">
            <label className="field__label" htmlFor="ev-start-date">
              วันที่เริ่ม{' '}
              <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
            </label>
            <input
              id="ev-start-date"
              type="date"
              className="yp-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={submitting}
            />
            <div className="field__hint">
              วันที่จะลงมือทำงานนี้ — ถ้าไม่ระบุ ระบบจะถือว่าเริ่มในวันกำหนดส่ง
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ev-time">
              เวลาเริ่ม{' '}
              <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
            </label>
            <input
              id="ev-time"
              type="time"
              className="yp-input"
              placeholder="08:00"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* ★ v3.10.0 รอบที่ 29: เปลี่ยน label จาก "วันที่" → "กำหนดส่ง"
              ตามคำขอของผู้ใช้ที่ต้องการให้สื่อความหมายชัดเจนว่านี่คือ deadline
              (แต่ไม่เปลี่ยนชื่อ field ใน DB ยังเก็บที่ column `date` เหมือนเดิม) */}
          <div className="field">
            <label className="field__label" htmlFor="ev-date">
              กำหนดส่ง <span className="yp-required">*</span>
            </label>
            <input
              id="ev-date"
              type="date"
              className="yp-input"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
            />
            <div className="field__hint">
              วันสุดท้ายที่ต้องส่งมอบงานนี้
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ev-location">
              สถานที่{' '}
              <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
            </label>
            <input
              id="ev-location"
              type="text"
              className="yp-input"
              placeholder="เช่น หอประชุมโรงเรียน"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ev-dept">
              ฝ่ายที่รับผิดชอบ
              {deptLoading ? (
                <span className="field__label-hint">· กำลังโหลด...</span>
              ) : null}
            </label>
            <select
              id="ev-dept"
              className="yp-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={submitting}
            >
              <option value="">— ไม่ระบุ —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label">สีประจำรายการ</label>
            <div className="yp-color-picker">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`yp-color-option${color === c ? ' is-selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`เลือกสี ${c}`}
                  aria-pressed={color === c}
                  disabled={submitting}
                />
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="yp-form-actions">
          <button
            type="button"
            className="yp-btn yp-btn--ghost yp-btn--block"
            onClick={() => router.back()}
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="yp-btn yp-btn--primary yp-btn--block"
            disabled={submitting}
          >
            {submitting
              ? 'กำลังบันทึก...'
              : isEdit
              ? 'บันทึกการแก้ไข'
              : 'สร้างรายการ'}
          </button>
        </div>
      </form>
    </div>
  );
}
