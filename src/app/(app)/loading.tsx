// ═══════════════════════════════════════════════════════════════
// YP WORK · Page Loading (Round 27)
// ═══════════════════════════════════════════════════════════════
// Page-level loading uses spinner — not skeleton.
// Skeleton is for component-level loading only.
// ═══════════════════════════════════════════════════════════════

import { AppLoading } from '@/components/framework/loading/loading';

export default function Loading() {
  return <AppLoading />;
}
