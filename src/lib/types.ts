// Path:    src/lib/types.ts
// Purpose: TypeScript types for ypwork domain models.
//          All shared types live here so modules can import from one place.

// ─── Task ─────────────────────────────────────────────────────────

export type TaskType = 'checklist' | 'activity';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'pending_review'
  | 'done'
  | 'cancelled';

export type SubtaskStatus = 'todo' | 'in_progress' | 'done';

export type ViewName = 'month' | 'week' | 'day' | 'kanban';

// ─── Database row shapes (match Supabase tables) ──────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  start_date: string;       // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Assignee {
  task_id: string;
  user_id: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  assignee_id: string | null;
  status: SubtaskStatus;
  deadline: string | null;
  sort_order: number;
  created_at: string;
}

// ─── Composite shape (task + relations, used by UI) ────────────────

export interface TaskWithRelations extends Task {
  category?: Category | null;
  assignees?: UserProfile[];
  subtasks?: Subtask[];
}

// ─── User profile (read from yplabs' council_users table) ──────────

export interface UserProfile {
  auth_uid: string;
  full_name: string;
  student_id: string;
  email: string;
  year: number;
  role: 'admin' | 'member';
  approved: boolean;
  disabled: boolean;
  account_type: string;
  avatar_url?: string | null;
}

// ─── Filter state ─────────────────────────────────────────────────

export interface FilterState {
  search: string;
  type: TaskType | 'all';
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  categoryId: string | 'all';
  onlyMine: boolean;
}

// ─── DTOs (data transfer objects for create/update) ───────────────

export interface CreateTaskDTO {
  title: string;
  type: TaskType;
  start_date: string;
  start_time?: string | null;
  end_time?: string | null;
  deadline?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category_id?: string | null;
  notes?: string | null;
  assignee_ids?: string[];
  subtasks?: { title: string; assignee_id?: string | null; deadline?: string | null }[];
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
  id: string;
}

export interface CreateCategoryDTO {
  name: string;
  icon: string;
  color: string;
}

// ─── Custom Event types (ypwork:* events) ─────────────────────────

export interface TaskCreatedEventDetail {
  taskId: string;
  task: Task;
}

export interface TaskUpdatedEventDetail {
  taskId: string;
  changes: Partial<Task>;
}

export interface TaskDeletedEventDetail {
  taskId: string;
}

export interface FilterChangedEventDetail {
  activeFilters: FilterState;
}

export interface ViewChangedEventDetail {
  view: ViewName;
}

export interface CategoryChangedEventDetail {
  categoryId: string;
}

// ─── Toast ────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}
