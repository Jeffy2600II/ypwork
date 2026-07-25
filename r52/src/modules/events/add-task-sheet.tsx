'use client';

/**
 * ============================================================
 * YP WORK - Event Detail - AddTaskSheet (r48)
 * ============================================================
 * Bottom sheet สำหรับเพิ่มรายการย่อย (ครบทุก field)
 * - title, priority, assignee, start_date, start_time, est_time,
 *   due_date, tags, notes
 * - form reset ผ่าน key-prop remount pattern (parent ส่ง key ที่เปลี่ยนเมื่อ open)
 * ============================================================
 */

import * as React from 'react';
import { AlertTriangle, Check, Flag, Layers, Plus } from 'lucide-react';
import type { YPEvent, UserProfile, TaskPriority } from '@/lib/types';
import { BottomSheet } from '@/components/framework/bottom-sheet';
import { ESTIMATED_TIME_OPTIONS, PRIORITY_META, getEstimatedTimeSelectValue, type TaskPayload } from './event-detail-types';

// ═══════════════════════════════════════════════════════════════
// AddTaskSheet — Bottom sheet สำหรับเพิ่มรายการย่อย (ครบทุก field)
// ═══════════════════════════════════════════════════════════════

export function AddTaskSheet({
  open,
  onClose,
  event,
  users,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  event: YPEvent;
  users: UserProfile[];
  onSubmit: (payload: TaskPayload) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = React.useState<string>('');
  // ★ v3.10.0 รอบที่ 29: เรียงลำดับ field ใหม่ — start_date ก่อน due_date
  //   เพราะ "จะเริ่มเมื่อไหร่" เป็นข้อมูลที่ต้องรู้ก่อน "ส่งเมื่อไหร่"
  //   ผู้ใช้กรอกได้เป็นลำดับธรรมชาติของการวางแผน
  const [startDate, setStartDate] = React.useState<string>('');
  const [startTime, setStartTime] = React.useState<string>('');
  const [estimatedTime, setEstimatedTime] = React.useState('');
  const [dueDate, setDueDate] = React.useState<string>(event.date || '');
  const [tagsStr, setTagsStr] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);

  // v1.5: รีเซ็ต form โดยใช้ key-prop remount pattern แทน useEffect
  // (parent component ส่ง key ที่เปลี่ยนเมื่อ open เปลี่ยน → component remount → state กลับสู่ค่าเริ่มต้น)

  const handleSubmit = () => {
    if (!title.trim()) {
      setErr('กรุณากรอกชื่อ task');
      return;
    }
    // ★ v3.10.0 รอบที่ 31: ตรวจสอบกำหนดส่ง >= วันที่เริ่ม
    //   ถ้าตั้งทั้งสองวัน → กำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม
    if (startDate && dueDate && dueDate < startDate) {
      setErr('วันกำหนดส่งต้องไม่น้อยกว่าวันที่เริ่ม');
      return;
    }
    const tags = tagsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    onSubmit({
      title: title.trim(),
      priority,
      assigneeId: assigneeId || null,
      startDate: startDate || null,   // ★ v3.10.0 รอบที่ 29
      startTime: startTime || null,
      estimatedTime: estimatedTime.trim(),
      dueDate: dueDate || null,
      tags,
      notes: notes.trim(),
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="เพิ่มรายการย่อยใหม่"
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
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'กำลังเพิ่ม...' : (
              <>
                <Plus width={16} height={16} />
                <span className="yp-btn__text-with-icon">เพิ่มรายการย่อย</span>
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Parent chip */}
      <div className="yp-form-modal__parent">
        <span className="yp-form-modal__parent-label">ในรายการ</span>
        <span
          className="yp-form-modal__parent-chip"
          style={{ ['--accent' as string]: event.color || '#4F46E5' }}
        >
          {event.type === 'group' ? <Layers width={14} height={14} /> : <Flag width={14} height={14} />}
          <span>{event.title}</span>
        </span>
      </div>

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

      {/* ★ v3.10.0 รอบที่ 29: เรียงลำดับฟอร์มใหม่ —
          1. ชื่อ task (required)
          2. รายละเอียด (notes — ย้ายขึ้นมาใกล้ชื่อ เพื่อนต้องเข้าใจบริบทก่อน)
          3. วันที่เริ่ม (จะเริ่มเมื่อไหร่)
          4. เวลาเริ่ม (เวลาที่เริ่มในวันนั้น)
          5. ระยะเวลาที่คาดการณ์ (ใช้เวลาเท่าไหร่)
          6. กำหนดส่ง (deadline — ส่งภายในเมื่อไหร่)
          7. ความเร่งด่วน
          8. ผู้รับผิดชอบ
          9. หมวด/ป้าย */}

      {/* Title */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">ชื่อ task</div>
        <div className="field">
          <input
            id="task-title"
            type="text"
            className="yp-input yp-input--lg"
            required
            placeholder="เช่น จองหอประชุมและเวที"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          <div className="field__hint">
            อธิบายสิ่งที่ต้องทำให้ชัดเจน — จะได้ติดตามง่าย
          </div>
        </div>
      </div>

      {/* ★ v3.10.0 รอบที่ 29: รายละเอียด (notes) ย้ายขึ้นมาใกล้ชื่อ */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          รายละเอียด{' '}
          <span className="yp-text-faint-normal">
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <textarea
            id="task-notes"
            className="yp-textarea"
            placeholder="อธิบายขอบเขตของรายการย่อยนี้ สิ่งที่ต้องทำ หรือหมายเหตุเพิ่มเติม เช่น ต้องประสานงานกับฝ่ายเอกสารก่อนเริ่มงาน"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={4}
          />
        </div>
      </div>

      {/* ★ v3.10.0 รอบที่ 29: กำหนดการ — เริ่ม → เวลาเริ่ม → ระยะเวลา → กำหนดส่ง */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">กำหนดการ</div>

        {/* วันที่เริ่ม — วันที่จะลงมือทำ (ไม่บังคับ) */}
        <div className="field">
          <label className="field__label" htmlFor="task-start-date">
            วันที่เริ่ม{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="task-start-date"
            type="date"
            className="yp-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            วันที่จะลงมือทำรายการย่อยนี้ — ถ้าไม่ระบุ ระบบจะใช้วันกำหนดส่งเป็นจุดอ้างอิง
          </div>
        </div>

        {/* เวลาเริ่ม — เวลาที่เริ่มในวันนั้น */}
        <div className="field">
          <label className="field__label" htmlFor="task-start">
            เวลาเริ่ม{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="task-start"
            type="time"
            className="yp-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            ระบุเวลาที่ควรเริ่มลงมือทำรายการย่อยนี้
          </div>
        </div>

        {/* ระยะเวลาที่คาดการณ์ */}
        <div className="field">
          <label className="field__label" htmlFor="task-est">
            ระยะเวลาที่คาดการณ์{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ)
            </span>
          </label>
          {/* ★ v3.8.0: เปลี่ยนจาก text input → select picker
              กัน user พิมพ์ค่าที่ไม่มาตรฐาน เช่น "20 นาทีๆ" หรือ "2 ชม 30 นา" */}
          <select
            id="task-est"
            className="yp-select"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            disabled={submitting}
          >
            {ESTIMATED_TIME_OPTIONS.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="field__hint">
            ระยะเวลาที่คาดว่าจะใช้ทำรายการย่อยนี้ — จะแสดงเป็นข้อมูลเพิ่มเติมในรายการย่อย
          </div>
        </div>

        {/* กำหนดส่ง — deadline (ส่งภายในเมื่อไหร่) */}
        <div className="field">
          <label className="field__label" htmlFor="task-due">
            กำหนดส่ง{' '}
            <span className="yp-text-faint-medium">
              (ไม่บังคับ)
            </span>
          </label>
          <input
            id="task-due"
            type="date"
            className="yp-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            วันสุดท้ายที่ต้องส่งมอบรายการย่อยนี้
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">ความเร่งด่วน</div>
        <div className="yp-priority-picker">
          {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
            return (
              <button
                key={p}
                type="button"
                className={`yp-priority-option${priority === p ? ' is-selected' : ''}`}
                onClick={() => setPriority(p)}
              >
                <div className={`yp-priority-option__dot ${meta.dotClass}`} />
                <div className="yp-priority-option__title">{meta.label}</div>
                <div className="yp-priority-option__desc">{meta.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          ผู้รับผิดชอบ{' '}
          <span className="yp-text-faint-normal">
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <select
            id="task-assignee"
            className="yp-select"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={submitting}
          >
            <option value="">— ยังไม่ระบุ —</option>
            {users.map((u) => (
              <option key={u.auth_uid} value={u.auth_uid}>
                {u.full_name}
                {u.role ? ` · ${u.role}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div className="yp-form-modal__section">
        <div className="yp-form-modal__section-title">
          หมวด/ป้าย{' '}
          <span className="yp-text-faint-normal">
            (ไม่บังคับ)
          </span>
        </div>
        <div className="field">
          <input
            id="task-tags"
            type="text"
            className="yp-input"
            placeholder="เช่น ด้านเอกสาร, ด้านสถานที่, ด้านการเงิน"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            disabled={submitting}
          />
          <div className="field__hint">
            คั่นด้วยจุลภาค — จะแสดงเป็น{' '}
            <span className="yp-text-tag">#ด้านเอกสาร</span>{' '}
            <span className="yp-text-tag">#ด้านสถานที่</span>{' '}
            เพื่อกรองและจัดกลุ่มรายการย่อย
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

