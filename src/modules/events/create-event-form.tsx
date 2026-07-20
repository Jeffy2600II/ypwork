'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · Create Event Form (client component)
// ═══════════════════════════════════════════════════════════════
// ฟอร์มสร้างงาน: type, title, date, time, location, description,
// department, color
// หลัง submit → insert ลง ypwork_events → redirect ไป /events/[id]
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Flag } from 'lucide-react';
import type { Department, EventType } from '@/lib/types';
import { getLocalTodayStr } from '@/lib/utils/date';   // ★ v3.9.4: Thailand timezone
import { InfoButton, InfoSheetHeader, InfoSectionTitle, InfoOption, InfoExample, InfoCallout, InfoSteps, InfoStep, InfoKeyValue, InfoKeyValueRow, InfoPill, InfoHighlight, InfoTldr, InfoCompare, InfoQuote } from '@/components/ui/info-button';

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
      setError('กรุณากรอกชื่องาน');
      return;
    }
    if (!date) {
      setError('กรุณาเลือกวันที่');
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
            time: time || '',
            location: location.trim(),
            description: description.trim(),
            department_id: departmentId || null,
            color,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ไม่สามารถแก้ไขงาน');
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
            time: time || '',
            location: location.trim(),
            description: description.trim(),
            department_id: departmentId || null,
            color,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.id) {
          throw new Error(data.error || 'ไม่สามารถสร้างงาน');
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
          {isEdit ? 'แก้ไขงาน' : 'สร้างงานใหม่'}
        </div>
        <h1 className="yp-page-header__title">
          {isEdit ? 'แก้ไขรายละเอียดงาน' : 'สร้างงานใหม่'}
        </h1>
        <p className="yp-page-header__subtitle">
          {isEdit
            ? 'ปรับปรุงข้อมูลงานแล้วกดบันทึก'
            : 'เลือกประเภทงานและกรอกรายละเอียด'}
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
            <h2 className="yp-form-card__title">ประเภทงาน</h2>
            <p className="yp-form-card__subtitle">
              เลือกให้ตรงกับลักษณะของงานจริง — จะมีผลต่อวิธีจัดการงานนั้น
              <InfoButton
                size="sm"
                content={
                  <>
                    <InfoSheetHeader
                      icon={<Layers size={20} strokeWidth={2} />}
                      title="ประเภทงาน"
                      subtitle="เลือกให้ตรงกับลักษณะของงานจริง — จะมีผลต่อวิธีจัดการงานนั้น"
                    />

                    <InfoTldr>
                      เพื่อจัดการสะดวกและดูแลง่าย เราจึงแยกประเภทของงาน —
                      <InfoPill>งานหลายขั้นตอน</InfoPill>{' '}
                      คืองานใหญ่ที่มี ขั้นตอนย่อย,{' '}
                      <InfoPill>งานเดียว</InfoPill>{' '}
                      คืองานเล็กที่ทำทีเดียวจบ
                    </InfoTldr>

                    <p>
                      ลองนึกถึงความแตกต่างระหว่าง &ldquo;จัดงานวันแม่&rdquo; กับ &ldquo;ซื้อกระดาษ A4 ให้ครู&rdquo; —
                      งานแรกต้องทำหลายอย่างมาก (ตกแต่งบูธ, ซ้อมร้องเพลง, ดูแลวันจริง) กว่าจะเสร็จ
                      ส่วนงานที่สองไปซื้อทีเดียวจบ เพราะงานทั้งสองมี{' '}
                      <InfoHighlight>ความซับซ้อนต่างกันมาก</InfoHighlight>{' '}
                      ระบบจึงแยกประเภทเพื่อให้จัดการได้เหมาะสม — งานใหญ่แบ่งเป็น ขั้นตอนย่อย
                      ส่วนงานเล็กเปลี่ยนสถานะเลย
                    </p>

                    <InfoSectionTitle>เปรียบเทียบ 2 ประเภท</InfoSectionTitle>

                    <InfoCompare
                      left={{
                        title: <><Layers size={14} strokeWidth={2.4} className="yp-icon-inline" />งานหลายขั้นตอน</>,
                        tone: 'accent',
                        items: [
                          <>มี <strong>ขั้นตอนย่อย</strong> หลายขั้นตอน</>,
                          <>เปลี่ยนสถานะไม่ได้โดยตรง — เปลี่ยนที่ task</>,
                          <>สร้าง task เพิ่มได้เรื่อย ๆ</>,
                          <>มอบหมาย task ให้คนละฝ่ายได้</>,
                        ],
                      }}
                      right={{
                        title: <><Flag size={14} strokeWidth={2.4} className="yp-icon-inline" />งานเดียว</>,
                        items: [
                          <>ไม่มี ขั้นตอนย่อย — ทำทีเดียวจบ</>,
                          <>เปลี่ยนสถานะเป็น &ldquo;กำลังทำ&rdquo; / &ldquo;เสร็จแล้ว&rdquo; ได้เลย</>,
                          <>เหมาะกับงานที่ไม่ซับซ้อน</>,
                          <>เปลี่ยนเป็นงานหลายขั้นตอนทีหลังได้</>,
                        ],
                      }}
                    />

                    <InfoSectionTitle>ตัวอย่างจริงในแต่ละประเภท</InfoSectionTitle>

                    <InfoKeyValue>
                      <InfoKeyValueRow
                        k={<><InfoPill>งานหลายขั้นตอน</InfoPill></>}
                        v={<>วันแม่ · วันวิทยาศาสตร์ · วันกีฬาสี · วันครู</>}
                      />
                      <InfoKeyValueRow
                        k={<><InfoPill>งานเดียว</InfoPill></>}
                        v={<>ส่งเอกสาร · ขออนุมัติเวที · ส่งรายงานการประชุม · ซื้อของ</>}
                      />
                    </InfoKeyValue>

                    <InfoSectionTitle>เลือกยังไงให้ถูก?</InfoSectionTitle>

                    <InfoSteps>
                      <InfoStep title="งานนี้ต้องทำหลายขั้นตอนก่อนจะเสร็จ?">
                        ถ้าใช่ → เลือก <InfoPill>งานหลายขั้นตอน</InfoPill>
                        (เพราะต้องสร้าง ขั้นตอนย่อยเพื่อแบ่งงานกันทำ)
                      </InfoStep>
                      <InfoStep title="งานนี้ทำทีเดียวจบ?">
                        ถ้าใช่ → เลือก <InfoPill>งานเดียว</InfoPill>
                        (เปลี่ยนสถานะได้เลย ไม่ต้องสร้าง task)
                      </InfoStep>
                      <InfoStep title="ไม่แน่ใจ?">
                        เริ่มจาก <strong>งานเดียว</strong> ก่อน — ถ้าทำไปเห็นว่ามีหลายขั้นตอน
                        แก้เป็น <strong>งานหลายขั้นตอน</strong> ทีหลังได้
                      </InfoStep>
                    </InfoSteps>

                    <InfoQuote author="ตัวอย่าง: วันแม่">
                      &ldquo;วันแม่แห่งชาติ&rdquo; → มี ขั้นตอนย่อย ซื้อของ / ตกแต่งบูธ /
                      ซ้อมร้องเพลง / ดูแลวันจริง — แต่ละ task มอบหมายให้คนละฝ่ายทำได้
                    </InfoQuote>

                    <InfoCallout type="tip" title="เลือกผิดก็ไม่เสียหาย">
                      เลือกผิดก็แก้ไขได้ภายหลัง — เข้าไปที่งานนั้นแล้วกด &ldquo;แก้ไข&rdquo;
                      ระบบจะปรับประเภทให้ (ถ้ามี task อยู่แล้วจะถูกเก็บไว้)
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
              <div className="yp-type-option__title">งานหลายขั้นตอน</div>
              <div className="yp-type-option__desc">
                งานใหญ่ที่มี ขั้นตอนย่อย เช่น วันแม่ วันภาษาไทย
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
              <div className="yp-type-option__title">งานเดียว</div>
              <div className="yp-type-option__desc">
                Task เดียวจบ เช่น ส่งเอกสาร ขออนุมัติ
              </div>
            </button>
          </div>
        </div>

        {/* ── FIELDS ── */}
        <div className="yp-form-card">
          <div className="yp-form-card__header">
            <h2 className="yp-form-card__title">รายละเอียดงาน</h2>
            <p className="yp-form-card__subtitle">กรอกข้อมูลให้ครบถ้วนเพื่อให้ทีมเข้าใจงานได้ชัดเจน</p>
          </div>
        <div className="yp-form-modal__section">
          <div className="field">
            <label className="field__label" htmlFor="ev-title">
              ชื่องาน <span className="yp-required">*</span>
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

          <div className="field">
            <label className="field__label" htmlFor="ev-date">
              วันที่ <span className="yp-required">*</span>
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
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ev-time">
              เวลา (ไม่บังคับ)
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

          <div className="field">
            <label className="field__label" htmlFor="ev-location">
              สถานที่ (ไม่บังคับ)
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
            <label className="field__label" htmlFor="ev-desc">
              รายละเอียด (ไม่บังคับ)
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
            <label className="field__label">สีประจำงาน</label>
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
              : 'สร้างงาน'}
          </button>
        </div>
      </form>
    </div>
  );
}
