'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - EditEventSheet (r51)
 * ============================================================
 * Bottom sheet สำหรับแก้ไขรายการหลัก (event)
 * - title, type, date (task เท่านั้น), start_date, time, location,
 *   description, department, color
 *
 * ★ r51 (aerospace refactor):
 *   - เพิ่ม type picker (group/task) เพื่อให้ผู้ใช้สลับ type ได้ตอนแก้ไข
 *   - ซ่อนช่อง "กำหนดส่ง" เมื่อ type=group (group ไม่มี deadline ระดับตัวเอง)
 *   - ใช้ shared constants จาก event-colors.ts (single source of truth)
 *   - ใช้ requiresDeadline() จาก event-date.ts (single source of truth)
 * ============================================================
 */

import * as React from 'react';
import { Layers, Flag } from 'lucide-react';
import type { YPEvent, Department, EventType } from '@/lib/types';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { EVENT_COLOR_OPTIONS, DEFAULT_EVENT_COLOR } from './event-colors';
import { requiresDeadline } from '@/lib/utils/event-date';
import type { EventPatch } from './event-detail-types';

// alias สำหรับ compatibility กับโค้ดเดิม
const COLOR_OPTIONS = EVENT_COLOR_OPTIONS;

// ═══════════════════════════════════════════════════════════════
// EditEventSheet — Bottom sheet สำหรับแก้ไขรายการ (เหมือน demo edit.js)
// ═══════════════════════════════════════════════════════════════

export function EditEventSheet({
  open,
  onClose,
  event,
  departments,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  event: YPEvent;
  departments: Department[];
  onSubmit: (patch: EventPatch) => void;
  submitting: boolean;
}) {
  const [type, setType] = React.useState<EventType>(event.type);
  const [title, setTitle] = React.useState(event.title);
  // ★ v3.10.0 รอบที่ 29: เพิ่ม start_date — วันที่เริ่มลงมือทำ (ไม่บังคับ)
  const [startDate, setStartDate] = React.useState<string>(event.start_date || '');
  // ★ r51: date อาจเป็น null สำหรับ group → state ใช้ '' เป็นค่าว่างใน form
  const [date, setDate] = React.useState<string>(event.date || '');
  const [time, setTime] = React.useState(event.time || '');
  const [location, setLocation] = React.useState(event.location || '');
  const [description, setDescription] = React.useState(event.description || '');
  const [departmentId, setDepartmentId] = React.useState(
    event.department_id || departments[0]?.id || ''
  );
  const [color, setColor] = React.useState(event.color || DEFAULT_EVENT_COLOR);
  // ★ v3.10.0 รอบที่ 31: เพิ่ม err state สำหรับ validation
  const [err, setErr] = React.useState<string | null>(null);

  // v1.5: รีเซ็ต form โดยใช้ key-prop remount pattern แทน useEffect
  // (parent ส่ง key={`edit-event-${open ? 'open' : 'closed'}`} → remount เมื่อ open เปลี่ยน)

  // ★ r51: ไม่ต้องมี useEffect เพื่อ clear date state เมื่อ type=group
  //   เพราะ submit handler ส่ง date='' สำหรับ group type อยู่แล้ว (API จะ set null)
  //   และ UI ซ่อน field อยู่แล้วเมื่อ type=group → user ไม่เห็นค่า date ใน form

  const handleSubmit = () => {
    // ★ r51: ตรวจ date เฉพาะเมื่อ type=task
    if (requiresDeadline(type) && !date) {
      setErr('กรุณาเลือกวันกำหนดส่ง');
      return;
    }
    // ★ v3.10.0 รอบที่ 31: ตรวจสอบวันกำหนดส่ง >= วันที่เริ่ม
    //   ★ r51: date อาจเป็นค่าว่างสำหรับ group → ข้ามการตรวจ range
    if (startDate && date && date < startDate) {
      setErr('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม');
      return;
    }
    setErr(null);
    onSubmit({
      type,
      title: title.trim() || event.title,
      // ★ r51: ส่ง date เป็น string ว่าง ถ้า group type (API จะ normalize เป็น null)
      date: requiresDeadline(type) ? (date || event.date || '') : '',
      start_date: startDate || null,
      time,
      location: location.trim(),
      description: description.trim(),
      departmentId,
      color,
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="แก้ไขรายการ"
      footer={
        <div className="yp-form-actions">
          <button
            type="button"
            className="yp-btn yp-btn--ghost yp-btn--block"
            onClick={onClose}
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary yp-btn--block"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      }
    >
      {/* ★ v3.10.0 รอบที่ 31: แสดง error จาก validation */}
      {err ? (
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
          {err}
        </div>
      ) : null}

      {/* ★ r51: Type picker — ให้ผู้ใช้สลับ type ระหว่าง group/task ได้ตอนแก้ไข
          (ก่อนหน้านี้ไม่มี ทำให้ลืม task ที่สร้างผิด type แก้ไขไม่ได้) */}
      <div className="field">
        <label className="field__label">ประเภทรายการ</label>
        <div className="yp-type-picker">
          <button
            type="button"
            className={`yp-type-option${type === 'group' ? ' is-selected' : ''}`}
            onClick={() => setType('group')}
            aria-pressed={type === 'group'}
            disabled={submitting}
          >
            <div className="yp-type-option__icon">
              <Layers width={20} height={20} />
            </div>
            <div className="yp-type-option__title">กลุ่มรายการ</div>
            <div className="yp-type-option__desc">
              สร้างรายการย่อยภายในได้
            </div>
          </button>

          <button
            type="button"
            className={`yp-type-option${type === 'task' ? ' is-selected' : ''}`}
            onClick={() => setType('task')}
            aria-pressed={type === 'task'}
            disabled={submitting}
          >
            <div className="yp-type-option__icon">
              <Flag width={20} height={20} />
            </div>
            <div className="yp-type-option__title">รายการ</div>
            <div className="yp-type-option__desc">
              รายการเดียวจบ
            </div>
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="ed-title">ชื่อรายการ</label>
        <input
          id="ed-title"
          type="text"
          className="yp-input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
      </div>

      {/* ★ v3.10.0 รอบที่ 29: รายละเอียดย้ายขึ้นมาใกล้ชื่อ */}
      <div className="field">
        <label className="field__label" htmlFor="ed-desc">
          รายละเอียด{' '}
          <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
        </label>
        <textarea
          id="ed-desc"
          className="yp-textarea"
          placeholder="อธิบายวัตถุประสงค์หรือสิ่งที่ต้องทำ"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={4}
        />
      </div>

      {/* ★ v3.10.0 รอบที่ 29: วันที่เริ่ม — วันที่จะลงมือทำ (ไม่บังคับ) */}
      <div className="field">
        <label className="field__label" htmlFor="ed-start-date">
          วันที่เริ่ม{' '}
          <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
        </label>
        <input
          id="ed-start-date"
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
        <label className="field__label" htmlFor="ed-time">
          เวลาเริ่ม{' '}
          <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
        </label>
        <input
          id="ed-time"
          type="time"
          className="yp-input"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={submitting}
        />
      </div>

      {/* ★ r51: ซ่อนช่อง "กำหนดส่ง" เมื่อ type=group
          เหตุผล: group ไม่มี deadline ระดับตัวเอง — ให้ตั้ง deadline ที่รายการย่อย
          ใช้ requiresDeadline() จาก event-date.ts (single source of truth) */}
      {requiresDeadline(type) ? (
        <div className="field">
          <label className="field__label" htmlFor="ed-date">
            กำหนดส่ง <span className="yp-required">*</span>
          </label>
          <input
            id="ed-date"
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
      ) : (
        <div className="yp-info-callout yp-info-callout--info">
          <div className="yp-info-callout__title">
            กลุ่มรายการไม่มีกำหนดส่ง
          </div>
          <div className="yp-info-callout__body">
            กลุ่มรายการสามารถมีรายการย่อยได้หลายอัน — ให้ตั้งค่า
            &ldquo;กำหนดส่ง&rdquo; ที่รายการย่อยแต่ละอันแทน
          </div>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor="ed-location">
          สถานที่{' '}
          <span className="yp-text-faint-normal">(ไม่บังคับ)</span>
        </label>
        <input
          id="ed-location"
          type="text"
          className="yp-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ed-dept">ฝ่ายที่รับผิดชอบ</label>
        <select
          id="ed-dept"
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
              disabled={submitting}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
