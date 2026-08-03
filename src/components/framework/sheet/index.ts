/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · Sheet · Public Airlock (r50)
 * ═══════════════════════════════════════════════════════════════
 * Barrel export สำหรับ mobile bottom sheet system
 *
 * Sheet = mobile-only bottom sheet (slide จากล่าง, drag-to-dismiss)
 * ใช้บนจอขนาดเล็ก (< 768px) — บน desktop ใช้ Popup แทน
 *
 * Components:
 *   - BottomSheet       → mobile bottom sheet หลัก
 *   - BottomSheetCloseButton → convenience close button (legacy)
 *
 * Hooks:
 *   - useSheetDrag      → drag-to-dismiss logic (ใช้ภายใน BottomSheet)
 * ═══════════════════════════════════════════════════════════════
 */

export { BottomSheet, BottomSheetCloseButton } from './bottom-sheet';
export type { BottomSheetProps, SheetSize } from './bottom-sheet';
export { useSheetDrag } from './use-sheet-drag';
