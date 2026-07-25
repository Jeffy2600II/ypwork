/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Popup · Public Airlock (r50)
 * ═══════════════════════════════════════════════════════════════
 * Barrel export สำหรับ desktop popup system
 *
 * Popup = desktop-only centered modal dialog
 * ใช้บนจอขนาดใหญ่ (≥ 768px) — บนมือถือใช้ BottomSheet แทน
 *
 * Components:
 *   - Dialog            → centered modal
 *   - SidePanel         → slide-in side panel
 *   - FullscreenOverlay → full-page overlay
 *
 * Backward compat: Modal = alias ของ Dialog
 * ═══════════════════════════════════════════════════════════════
 */

export { Dialog } from './dialog';
export type { DialogProps, PopupSize } from './dialog';

export { SidePanel } from './side-panel';
export type { SidePanelProps, SidePanelSide } from './side-panel';

export { FullscreenOverlay } from './fullscreen-overlay';
export type { FullscreenOverlayProps } from './fullscreen-overlay';

// Backward compatibility: Modal = Dialog
export { Dialog as Modal } from './dialog';
