// ═══════════════════════════════════════════════════════════════
// YP WORK · Repository · Departments (Round 22)
// ═══════════════════════════════════════════════════════════════
// Data access layer for departments.
// ═══════════════════════════════════════════════════════════════

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Department } from '@/lib/types';
import { normalizeDepartment } from './normalize';

/** Fetch all departments (cached via React cache for SSR dedup) */
export const findAll = cache(async (supabase: SupabaseClient): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, color, icon, description')
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data.map(normalizeDepartment);
});
