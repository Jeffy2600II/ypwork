/**
 * ═══════════════════════════════════════════════════════════════
 * YP WORK · Framework · FAB · Public Airlock (r50)
 * ═══════════════════════════════════════════════════════════════
 * Barrel export สำหรับ FAB system
 *
 * FAB = Floating Action Button (ปุ่ม +)
 *
 * Components/Hooks:
 *   - FabProvider     → context provider (ครอบที่ AppShell)
 *   - useFabAction    → อ่าน action ปัจจุบัน (ใช้ใน AppShell)
 *   - useFabRegister  → register action ของหน้า (ใช้ใน page client)
 *   - useScrollDirection → scroll-based show/hide
 * ═══════════════════════════════════════════════════════════════
 */

export {
  FabProvider,
  useFabAction,
  useFabRegister,
} from './fab-context';
export type { FabAction } from './fab-context';
export {
  useScrollDirection,
} from './use-scroll-direction';
export type { UseScrollDirectionOptions } from './use-scroll-direction';
