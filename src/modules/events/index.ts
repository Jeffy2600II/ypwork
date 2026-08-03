'use client';

/**
 * ============================================================
 * YP WORK - Events Module - Barrel Export (r48)
 * ============================================================
 * "Public Airlock" ของ events module
 *
 * File structure:
 *   event-detail-types.ts       - shared types & constants
 *   event-detail-client.tsx     - main orchestrator (EventDetailClient)
 *   task-row.tsx                - TaskRow (single sub-task row)
 *   task-time-group.tsx         - TaskTimeGroup (group of TaskRows)
 *   add-task-sheet.tsx          - AddTaskSheet (add sub-task form)
 *   edit-task-sheet.tsx         - EditTaskSheet (edit sub-task form)
 *   edit-event-sheet.tsx        - EditEventSheet (edit event form)
 *   create-event-form.tsx       - CreateEventForm (new event)
 *   event-card.tsx              - EventCard (list item)
 *   events-list-view.tsx        - EventsListView (events list page)
 *   day-view-client.tsx         - DayViewClient (day view page)
 *
 * Backward compat: imports from '@/modules/events/event-detail-client' ยังทำงาน
 * ============================================================
 */

export { EventDetailClient } from './event-detail-client';
export type { EventDetailClientProps, TaskPayload, EventPatch } from './event-detail-types';
export { PRIORITY_META, ESTIMATED_TIME_OPTIONS, COLOR_OPTIONS, getEstimatedTimeSelectValue } from './event-detail-types';
export { TaskTimeGroup } from './task-time-group';
export { TaskRow } from './task-row';
export { AddTaskSheet } from './add-task-sheet';
export { EditTaskSheet } from './edit-task-sheet';
export { EditEventSheet } from './edit-event-sheet';
