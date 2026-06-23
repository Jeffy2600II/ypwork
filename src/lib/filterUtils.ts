// Path:    src/lib/filterUtils.ts
// Purpose: Pure helpers — apply FilterState to a list of TaskWithRelations.

import type { Task, TaskWithRelations, FilterState, UserProfile } from '@/lib/types';

export function applyFilters(
  tasks: Task[],
  filters: FilterState,
  myUid: string | null,
  assigneesByTask: Map<string, string[]>,
): Task[] {
  let result = tasks;

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes ?? '').toLowerCase().includes(q)
    );
  }
  if (filters.type !== 'all') {
    result = result.filter(t => t.type === filters.type);
  }
  if (filters.status !== 'all') {
    result = result.filter(t => t.status === filters.status);
  }
  if (filters.priority !== 'all') {
    result = result.filter(t => t.priority === filters.priority);
  }
  if (filters.categoryId !== 'all') {
    result = result.filter(t => t.category_id === filters.categoryId);
  }
  if (filters.onlyMine && myUid) {
    result = result.filter(t => {
      const ids = assigneesByTask.get(t.id) ?? [];
      return ids.includes(myUid) || t.created_by === myUid;
    });
  }

  return result;
}

/** Build a Map<taskId, userId[]> for fast lookup */
export function buildAssigneeMap(assignees: { task_id: string; user_id: string }[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const a of assignees) {
    const arr = map.get(a.task_id) ?? [];
    arr.push(a.user_id);
    map.set(a.task_id, arr);
  }
  return map;
}
