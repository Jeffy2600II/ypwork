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
import { createClient } from '@/lib/supabase/client';

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
  departments,
  editEvent,
  userUid,
}: CreateEventFormProps) {
  const router = useRouter();
  const isEdit = !!editEvent;

  const [type, setType] = React.useState<EventType>(editEvent?.type || 'group');
  const [title, setTitle] = React.useState(editEvent?.title || '');
  const [date, setDate] = React.useState(
    editEvent?.date || new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = React.useState(editEvent?.time || '');
  const [location, setLocation] = React.useState(editEvent?.location || '');
  const [description, setDescription] = React.useState(
    editEvent?.description || ''
  );
  const [departmentId, setDepartmentId] = React.useState<string>(
    editEvent?.department_id || departments[0]?.id || ''
  );
  const [color, setColor] = React.useState<string>(
    editEvent?.color || COLOR_OPTIONS[0]
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      const supabase = createClient();
      const payload = {
        type,
        title: title.trim(),
        date,
        time: time || '',
        location: location.trim(),
        description: description.trim(),
        department_id: departmentId || null,
        status: 'todo' as const,
        color,
        created_by: userUid,
      };

      let resultId: string | null = null;

      if (isEdit && editEvent) {
        const { data, error: updateErr } = await supabase
          .from('ypwork_events')
          .update(payload)
          .eq('id', editEvent.id)
          .select('id')
          .limit(1)
          .maybeSingle();

        if (updateErr) throw updateErr;
        resultId = data?.id || editEvent.id;
      } else {
        const { data, error: insertErr } = await supabase
          .from('ypwork_events')
          .insert(payload)
          .select('id')
          .limit(1)
          .maybeSingle();

        if (insertErr) throw insertErr;
        resultId = data?.id || null;
      }

      if (!resultId) {
        throw new Error('ไม่สามารถดึง ID ของงานที่สร้าง/แก้ไข');
      }

      router.push(`/events/${resultId}`);
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
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.08)',
            color: '#BE123C',
            border: '1px solid rgba(244, 63, 94, 0.20)',
            padding: 'var(--yp-space-3) var(--yp-space-4)',
            borderRadius: 'var(--yp-radius-sm)',
            marginBottom: 'var(--yp-space-4)',
            fontSize: 'var(--yp-text-sm)',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        {/* ── TYPE PICKER ── */}
        <div className="yp-form-modal__section">
          <div className="yp-form-modal__section-title">ประเภทงาน</div>
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
              <div className="yp-type-option__title">กลุ่มงาน</div>
              <div className="yp-type-option__desc">
                งานใหญ่ที่มี task ย่อย เช่น วันแม่ วันภาษาไทย
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
              <div className="yp-type-option__title">งานเดี่ยว</div>
              <div className="yp-type-option__desc">
                Task เดียวจบ เช่น ส่งเอกสาร ขออนุมัติ
              </div>
            </button>
          </div>
        </div>

        {/* ── FIELDS ── */}
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
              className="yp-input"
              placeholder="อธิบายวัตถุประสงค์หรือสิ่งที่ต้องทำ"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              style={{ minHeight: 100, resize: 'vertical' }}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ev-dept">
              ฝ่ายที่รับผิดชอบ
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
