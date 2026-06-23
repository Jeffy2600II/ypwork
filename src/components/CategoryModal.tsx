// Path:    src/components/CategoryModal.tsx
// Purpose: Modal for create/edit category — name + emoji + color picker.

'use client';

import React, { useState, useEffect } from 'react';
import { useCategory } from '@/modules/category-manager';
import { useToast } from '@/context/ToastContext';
import type { Category } from '@/lib/types';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  editingCategory?: Category | null;
}

const EMOJI_OPTIONS = ['🏫', '📋', '🎉', '📢', '🧹', '💰', '📚', '⚙️', '📝', '🎯', '🎨', '🎵', '🏆', '💡', '📌', '⚡'];
const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#F59E0B', '#22C55E',
  '#6B7280', '#EF4444', '#06B6D4', '#EC4899',
  '#10B981', '#F97316', '#A855F7', '#6366F1',
];

export function CategoryModal({ open, onClose, editingCategory }: CategoryModalProps) {
  const { createCategory, updateCategory, deleteCategory } = useCategory();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⚙️');
  const [color, setColor] = useState('#6B7280');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      setName(editingCategory.name);
      setIcon(editingCategory.icon);
      setColor(editingCategory.color);
    } else {
      setName('');
      setIcon('⚙️');
      setColor('#6B7280');
    }
  }, [open, editingCategory]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { showToast('กรุณากรอกชื่อหมวดหมู่', 'error'); return; }
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: name.trim(), icon, color });
        showToast('อัปเดตหมวดหมู่เรียบร้อย', 'success');
      } else {
        await createCategory({ name: name.trim(), icon, color });
        showToast('สร้างหมวดหมู่เรียบร้อย', 'success');
      }
      onClose();
    } catch (e: any) {
      showToast(`ล้มเหลว: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingCategory) return;
    if (!confirm(`ลบหมวดหมู่ "${editingCategory.name}" ?`)) return;
    setSaving(true);
    try {
      await deleteCategory(editingCategory.id);
      showToast('ลบหมวดหมู่เรียบร้อย', 'success');
      onClose();
    } catch (e: any) {
      showToast(`ลบล้มเหลว: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>{editingCategory ? '✏️ แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่'}</h2>
          <button className="btn-icon" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-3)' }} onClick={onClose} aria-label="ปิด">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">ชื่อหมวดหมู่ *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น งานกีฬา"
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">ไอคอน</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    className={icon === e ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    style={{ fontSize: 18, padding: '6px 10px', minWidth: 36 }}
                    onClick={() => setIcon(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">สี</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: c, cursor: 'pointer',
                      border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                      transition: 'border-color 120ms',
                    }}
                    aria-label={`สี ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>ตัวอย่าง:</div>
              <span className="badge" style={{ background: `${color}22`, color }}>
                {icon} {name || 'ชื่อหมวดหมู่'}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            {editingCategory && (
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                🗑️ ลบ
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
