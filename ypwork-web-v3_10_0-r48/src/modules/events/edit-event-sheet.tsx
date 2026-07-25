'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - EditEventSheet (r48)
 * ============================================================
 * Bottom sheet สำหรับแก้ไขรายการหลัก (event)
 * - title, date, start_date, time, location, description,
 *   department, color
 * ============================================================
 */

import * as React from 'react';
import type { YPEvent, Department } from '@/lib/types';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { COLOR_OPTIONS, type EventPatch } from './event-detail-types';

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
  const [title, setTitle] = React.useState(event.title);
  // ★ v3.10.0 รอบที่ 29: เพิ่ม start_date — วันที่เริ่มลงมือทำ (ไม่บังคับ)
  const [startDate, setStartDate] = React.useState<string>(event.start_date || '');
  const [date, setDate] = React.useState(event.date);
  const [time, setTime] = React.useState(event.time || '');
  const [location, setLocation] = React.useState(event.location || '');
  const [description, setDescription] = React.useState(event.description || '');
  const [departmentId, setDepartmentId] = React.useState(
    event.department_id || departments[0]?.id || ''
  );
  const [color, setColor] = React.useState(event.color || COLOR_OPTIONS[0]);
  // ★ v3.10.0 รอบที่ 31: เพิ่ม err state สำหรับ validation
  const [err, setErr] = React.useState<string | null>(null);

  // v1.5: รีเซ็ต form โดยใช้ key-prop remount pattern แทน useEffect
  // (parent ส่ง key={`edit-event-${open ? 'open' : 'closed'}`} → remount เมื่อ open เปลี่ยน)

  const handleSubmit = () => {
    // ★ v3.10.0 รอบที่ 31: ตรวจสอบวันกำหนดส่ง >= วันที่เริ่ม
    if (startDate && date && date < startDate) {
      setErr('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม');
      return;
    }
    setErr(null);
    onSubmit({
      title: title.trim() || event.title,
      date: date || event.date,
      start_date: startDate || null,   // ★ v3.10.0 รอบที่ 29
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
      {/* ★ v3.10.0 รอบที่ 29: เรียงลำดับฟอร์มใหม่ — ให้กรอกได้เป็นลำดับตามธรรมชาติ
          ของการวางแผน: ชื่อ → รายละเอียด → วันเริ่ม → เวลาเริ่ม → กำหนดส่ง →
          สถานที่ → ฝ่าย → สี
          (เหมือน CreateEventForm เพื่อความสม่ำเสมอ) */}
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

      {/* ★ v3.10.0 รอบที่ 29: เปลี่ยน label จาก "วันที่" → "กำหนดส่ง" */}
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
