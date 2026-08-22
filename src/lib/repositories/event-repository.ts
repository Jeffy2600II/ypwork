// ═══════════════════════════════════════════════════════════════
// YP WORK · Repositories · Event Repository (Round 24)
// ═══════════════════════════════════════════════════════════════
// Data access layer for events.
// Encapsulates all Supabase queries for ypwork_events so that
// API routes don't directly use the Supabase client.
//
// This separation allows:
//   - Centralized query optimization (already done in event-loader.ts)
//   - Consistent data normalization
//   - Easier testing (mock the repository)
//   - Future migration to different data source
//
// The repository builds on the existing fetchEventsWithRelations()
// and fetchEventById() functions from lib/db/event-loader.ts.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchEventsWithRelations,
  fetchEventById,
} from '@/lib/db/event-loader';
import type { YPEvent } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────

export interface EventFilterOptions {
  from?: string | null;
  to?: string | null;
  date?: string | null;
}

export interface EventCreateInput {
  id: string;
  type: 'group' | 'task';
  title: string;
  date: string | null;
  start_date?: string | null;
  time?: string;
  location?: string;
  description?: string;
  department_id?: string | null;
  color: string;
  created_by: string;
}

export interface EventUpdateInput {
  type?: 'group' | 'task';
  title?: string;
  date?: string | null;
  start_date?: string | null;
  time?: string;
  location?: string;
  description?: string;
  department_id?: string | null;
  color?: string;
}

// ── Repository ────────────────────────────────────────────────

export const eventRepository = {
  /**
   * Find all events with relations (department, tasks, assignees).
   * Delegates to the optimized fetchEventsWithRelations() loader.
   */
  async findAll(
    client: SupabaseClient,
    options?: EventFilterOptions
  ): Promise<YPEvent[]> {
    return fetchEventsWithRelations(client, options);
  },

  /**
   * Find a single event by ID with all relations.
   */
  async findById(
    client: SupabaseClient,
    id: string
  ): Promise<{ event: YPEvent | null; users: any[]; departments: any[] }> {
    return fetchEventById(client, id);
  },

  /**
   * Create a new event.
   */
  async create(client: SupabaseClient, input: EventCreateInput): Promise<{ id: string; error: string | null }> {
    const { error } = await client.from('ypwork_events').insert({
      id: input.id,
      type: input.type,
      title: input.title,
      date: input.date,
      start_date: input.start_date ?? null,
      time: input.time ?? '',
      location: input.location ?? '',
      description: input.description ?? '',
      department_id: input.department_id ?? null,
      color: input.color,
      created_by: input.created_by,
    });

    return { id: input.id, error: error?.message ?? null };
  },

  /**
   * Update an event by ID.
   */
  async update(
    client: SupabaseClient,
    id: string,
    update: EventUpdateInput
  ): Promise<string | null> {
    const { error } = await client
      .from('ypwork_events')
      .update(update)
      .eq('id', id);

    return error?.message ?? null;
  },

  /**
   * Delete an event by ID.
   * FK ON DELETE CASCADE removes tasks + assignees automatically.
   */
  async delete(client: SupabaseClient, id: string): Promise<string | null> {
    const { error } = await client
      .from('ypwork_events')
      .delete()
      .eq('id', id);

    return error?.message ?? null;
  },

  /**
   * Check if an event exists (lightweight query).
   */
  async exists(
    client: SupabaseClient,
    id: string
  ): Promise<boolean> {
    const { data, error } = await client
      .from('ypwork_events')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    return !error && !!data;
  },
};
