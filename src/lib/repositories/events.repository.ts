// ═══════════════════════════════════════════════════════════════
// YP WORK · Repository · Events (Round 22)
// ═══════════════════════════════════════════════════════════════
// Data access layer for events. Extends event-loader.ts pattern.
// API routes call these methods instead of inline Supabase queries.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import type { YPEvent, UserProfile, Department } from '@/lib/types';
import {
  EVENT_FIELDS,
  USER_FIELDS,
  normalizeEvent,
  normalizeUserProfile,
  buildAssigneesMap,
} from './normalize';
import { getUserColor } from '@/lib/utils/user-color';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface FetchEventsOptions {
  from?: string | null;
  to?: string | null;
  date?: string | null;
}

/** Fetch all events with department + tasks + assignees (2 RTT) */
export async function findAll(
  supabase: SupabaseClient,
  options: FetchEventsOptions = {}
): Promise<YPEvent[]> {
  const { from, to, date } = options;

  let eventsQuery = supabase
    .from('ypwork_events')
    .select(EVENT_FIELDS)
    .order('date', { ascending: true });

  if (date && DATE_RE.test(date)) {
    eventsQuery = eventsQuery.eq('date', date);
  } else {
    if (from && DATE_RE.test(from)) eventsQuery = eventsQuery.gte('date', from);
    if (to && DATE_RE.test(to)) eventsQuery = eventsQuery.lte('date', to);
  }

  const [eventsResult, usersResult] = await Promise.all([
    eventsQuery,
    supabase
      .from('council_users')
      .select(USER_FIELDS)
      .eq('approved', true)
      .eq('disabled', false),
  ]);

  if (eventsResult.error) {
    console.error('[events.repo findAll] error:', eventsResult.error.message);
    return [];
  }

  const eventsRaw = eventsResult.data || [];
  const usersRaw = usersResult.data || [];

  const taskIds = eventsRaw.flatMap((e: any) =>
    (e.tasks || []).map((t: any) => t.id)
  );

  let assigneesMap = new Map<string, UserProfile[]>();
  if (taskIds.length > 0) {
    const { data: assigneesRaw } = await supabase
      .from('ypwork_task_assignees')
      .select('task_id, user_auth_uid')
      .in('task_id', taskIds);
    assigneesMap = buildAssigneesMap(assigneesRaw, usersRaw);
  }

  return eventsRaw.map((e: any) => normalizeEvent(e, assigneesMap));
}

export interface FindByIdResult {
  event: YPEvent | null;
  users: UserProfile[];
  departments: Department[];
}

/** Fetch single event with full relations (2 RTT) */
export async function findById(
  supabase: SupabaseClient,
  id: string
): Promise<FindByIdResult> {
  const [eventResult, usersResult, deptsResult] = await Promise.all([
    supabase
      .from('ypwork_events')
      .select(EVENT_FIELDS)
      .eq('id', id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('council_users')
      .select(USER_FIELDS)
      .eq('approved', true)
      .eq('disabled', false)
      .order('full_name', { ascending: true }),
    supabase
      .from('departments')
      .select('id, name, color, icon, description')
      .order('name', { ascending: true }),
  ]);

  const eventRaw = eventResult.data;
  if (!eventRaw) {
    return { event: null, users: [], departments: [] };
  }

  const taskIds = (eventRaw.tasks || []).map((t: any) => t.id);
  let assigneesMap = new Map<string, UserProfile[]>();
  if (taskIds.length > 0) {
    const { data: assigneesRaw } = await supabase
      .from('ypwork_task_assignees')
      .select('task_id, user_auth_uid')
      .in('task_id', taskIds);
    assigneesMap = buildAssigneesMap(assigneesRaw, usersResult.data);
  }

  const event = normalizeEvent(eventRaw, assigneesMap);
  const users = (usersResult.data || []).map((u: any) => {
    const profile = { ...u };
    return {
      auth_uid: u.auth_uid,
      full_name: u.full_name,
      student_id: null,
      national_id: null,
      year: u.year ?? null,
      role: u.role ?? 'member',
      account_type: (u.account_type || 'student') as 'student' | 'teacher' | 'other',
      approved: true,
      disabled: false,
      email: '',
      department_id: u.department_id ?? null,
      color: getUserColor(u.auth_uid),
    } as UserProfile;
  });
  const departments = (deptsResult.data || []).map((d: any) => ({
    id: d.id, name: d.name, color: d.color, icon: d.icon, description: d.description,
  })) as Department[];

  return { event, users, departments };
}


/** Create a new event */
export async function create(
  supabase: SupabaseClient,
  data: {
    id: string;
    type: 'group' | 'task';
    title: string;
    date: string | null;
    start_date: string | null;
    time: string;
    location: string;
    description: string;
    department_id: string | null;
    color: string;
    created_by: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ypwork_events').insert(data);
  return { error: error?.message ?? null };
}

/** Update an event */
export async function update(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, any>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ypwork_events')
    .update(data)
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** Delete an event (cascade deletes tasks + assignees via FK) */
export async function remove(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ypwork_events')
    .delete()
    .eq('id', id);
  return { error: error?.message ?? null };
}
