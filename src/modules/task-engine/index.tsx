// Path:    src/modules/task-engine/index.ts
// Purpose: TaskEngine — Module #1 of 6 Core Modules.
//          Manages CRUD + query/filter/sort for tasks, subtasks, assignees.
//
// Architecture: This module is the SINGLE source of truth for task data.
//   - Components interact via TaskContext (React Context)
//   - Other modules communicate via Custom Events (ypwork:task-*)
//   - Public API is frozen — internals are not exported

'use client';

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type {
  Task, Subtask, UserProfile, TaskWithRelations,
  CreateTaskDTO, UpdateTaskDTO,
  TaskCreatedEventDetail, TaskUpdatedEventDetail, TaskDeletedEventDetail,
} from '@/lib/types';

// ─── Context shape ────────────────────────────────────────────────

type TaskCtx = {
  tasks: Task[];
  subtasks: Subtask[];
  assignees: { task_id: string; user_id: string }[];
  members: UserProfile[];
  loading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  createTask: (dto: CreateTaskDTO) => Promise<Task | null>;
  updateTask: (dto: UpdateTaskDTO) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: Task['status']) => Promise<void>;
  addSubtask: (taskId: string, title: string, assigneeId?: string | null, deadline?: string | null) => Promise<void>;
  toggleSubtask: (subtaskId: string, status: Subtask['status']) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  getTaskWithRelations: (taskId: string) => TaskWithRelations | null;
};

const TaskContext = createContext<TaskCtx>({
  tasks: [], subtasks: [], assignees: [], members: [],
  loading: true, error: null,
  fetchAll: async () => {},
  createTask: async () => null,
  updateTask: async () => null,
  deleteTask: async () => false,
  updateStatus: async () => {},
  addSubtask: async () => {},
  toggleSubtask: async () => {},
  deleteSubtask: async () => {},
  getTaskWithRelations: () => null,
});

export function useTaskEngine() { return useContext(TaskContext); }

// ─── Event dispatchers (loose coupling — Fantrove pattern) ────────

function dispatchTaskCreated(task: Task) {
  if (typeof window === 'undefined') return;
  const detail: TaskCreatedEventDetail = { taskId: task.id, task };
  window.dispatchEvent(new CustomEvent('ypwork:task-created', { detail }));
}

function dispatchTaskUpdated(taskId: string, changes: Partial<Task>) {
  if (typeof window === 'undefined') return;
  const detail: TaskUpdatedEventDetail = { taskId, changes };
  window.dispatchEvent(new CustomEvent('ypwork:task-updated', { detail }));
}

function dispatchTaskDeleted(taskId: string) {
  if (typeof window === 'undefined') return;
  const detail: TaskDeletedEventDetail = { taskId };
  window.dispatchEvent(new CustomEvent('ypwork:task-deleted', { detail }));
}

// ─── Provider ─────────────────────────────────────────────────────

export function TaskEngineProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [assignees, setAssignees] = useState<{ task_id: string; user_id: string }[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  // ── Fetch all data ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserSupabase();

      const [tasksRes, subtasksRes, assigneesRes, membersRes] = await Promise.all([
        sb.from('ypwork_tasks').select('*').order('start_date', { ascending: true }),
        sb.from('ypwork_subtasks').select('*').order('sort_order', { ascending: true }),
        sb.from('ypwork_assignees').select('task_id, user_id'),
        sb.from('council_users')
          .select('auth_uid,full_name,student_id,email,year,role,account_type,approved,disabled')
          .eq('approved', true)
          .eq('disabled', false)
          .order('full_name', { ascending: true }),
      ]);

      if (tasksRes.error) throw new Error(tasksRes.error.message);
      if (subtasksRes.error) throw new Error(subtasksRes.error.message);
      if (assigneesRes.error) throw new Error(assigneesRes.error.message);
      if (membersRes.error) throw new Error(membersRes.error.message);

      setTasks((tasksRes.data ?? []) as Task[]);
      setSubtasks((subtasksRes.data ?? []) as Subtask[]);
      setAssignees((assigneesRes.data ?? []) as { task_id: string; user_id: string }[]);
      // avatar_url is not in the shared council_users schema — normalize to null
      setMembers((membersRes.data ?? []).map((m: any) => ({ ...m, avatar_url: null })) as UserProfile[]);
    } catch (e: any) {
      setError(e?.message ?? 'โหลดข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void fetchAll();
  }, [fetchAll]);

  // ── Create task ───────────────────────────────────────────────
  const createTask = useCallback(async (dto: CreateTaskDTO): Promise<Task | null> => {
    try {
      const sb = getBrowserSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน');

      const insertPayload = {
        title: dto.title,
        type: dto.type,
        start_date: dto.start_date,
        start_time: dto.start_time ?? null,
        end_time: dto.end_time ?? null,
        deadline: dto.deadline ?? null,
        priority: dto.priority,
        status: dto.status,
        category_id: dto.category_id ?? null,
        notes: dto.notes ?? null,
        created_by: user.id,
      };

      const { data: taskRow, error: taskErr } = await sb
        .from('ypwork_tasks')
        .insert(insertPayload)
        .select()
        .single();

      if (taskErr || !taskRow) throw new Error(taskErr?.message ?? 'สร้างงานไม่สำเร็จ');
      const newTask = taskRow as Task;

      // Insert assignees (many-to-many)
      if (dto.assignee_ids && dto.assignee_ids.length > 0) {
        const assigneeRows = dto.assignee_ids.map(uid => ({ task_id: newTask.id, user_id: uid }));
        const { error: assigneeErr } = await sb.from('ypwork_assignees').insert(assigneeRows);
        if (assigneeErr) console.error('[TaskEngine] insert assignees failed:', assigneeErr.message);
        setAssignees(prev => [...prev, ...assigneeRows]);
      }

      // Insert subtasks (only for activity type)
      if (dto.type === 'activity' && dto.subtasks && dto.subtasks.length > 0) {
        const subtaskRows = dto.subtasks.map((s, i) => ({
          task_id: newTask.id,
          title: s.title,
          assignee_id: s.assignee_id ?? null,
          deadline: s.deadline ?? null,
          status: 'todo' as const,
          sort_order: i,
        }));
        const { data: insertedSubs, error: subErr } = await sb
          .from('ypwork_subtasks')
          .insert(subtaskRows)
          .select();
        if (subErr) console.error('[TaskEngine] insert subtasks failed:', subErr.message);
        if (insertedSubs) setSubtasks(prev => [...prev, ...(insertedSubs as Subtask[])]);
      }

      setTasks(prev => [...prev, newTask]);
      dispatchTaskCreated(newTask);
      return newTask;
    } catch (e: any) {
      console.error('[TaskEngine] createTask error:', e);
      throw e;
    }
  }, []);

  // ── Update task ───────────────────────────────────────────────
  const updateTask = useCallback(async (dto: UpdateTaskDTO): Promise<Task | null> => {
    try {
      const sb = getBrowserSupabase();
      const { id, assignee_ids, subtasks, ...patch } = dto;

      const { data: updatedRow, error: updateErr } = await sb
        .from('ypwork_tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (updateErr || !updatedRow) throw new Error(updateErr?.message ?? 'อัปเดตงานไม่สำเร็จ');
      const updated = updatedRow as Task;

      // Sync assignees if provided
      if (assignee_ids) {
        await sb.from('ypwork_assignees').delete().eq('task_id', id);
        if (assignee_ids.length > 0) {
          const rows = assignee_ids.map(uid => ({ task_id: id, user_id: uid }));
          await sb.from('ypwork_assignees').insert(rows);
        }
        setAssignees(prev => {
          const filtered = prev.filter(a => a.task_id !== id);
          return [...filtered, ...(assignee_ids.map(uid => ({ task_id: id, user_id: uid })))];
        });
      }

      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      dispatchTaskUpdated(id, patch);
      return updated;
    } catch (e: any) {
      console.error('[TaskEngine] updateTask error:', e);
      throw e;
    }
  }, []);

  // ── Delete task ───────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const sb = getBrowserSupabase();
      const { error: delErr } = await sb.from('ypwork_tasks').delete().eq('id', id);
      if (delErr) throw new Error(delErr.message);

      setTasks(prev => prev.filter(t => t.id !== id));
      setSubtasks(prev => prev.filter(s => s.task_id !== id));
      setAssignees(prev => prev.filter(a => a.task_id !== id));
      dispatchTaskDeleted(id);
      return true;
    } catch (e: any) {
      console.error('[TaskEngine] deleteTask error:', e);
      throw e;
    }
  }, []);

  // ── Update status (inline, used by Kanban drag + dropdown) ────
  const updateStatus = useCallback(async (id: string, status: Task['status']) => {
    try {
      const sb = getBrowserSupabase();
      const { error } = await sb.from('ypwork_tasks').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);

      setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
      dispatchTaskUpdated(id, { status });
    } catch (e: any) {
      console.error('[TaskEngine] updateStatus error:', e);
      throw e;
    }
  }, []);

  // ── Subtask operations ────────────────────────────────────────
  const addSubtask = useCallback(async (
    taskId: string,
    title: string,
    assigneeId?: string | null,
    deadline?: string | null
  ) => {
    try {
      const sb = getBrowserSupabase();
      const maxOrder = subtasks.filter(s => s.task_id === taskId).reduce((m, s) => Math.max(m, s.sort_order), -1);
      const { data, error } = await sb.from('ypwork_subtasks').insert({
        task_id: taskId,
        title,
        assignee_id: assigneeId ?? null,
        deadline: deadline ?? null,
        status: 'todo',
        sort_order: maxOrder + 1,
      }).select().single();
      if (error) throw new Error(error.message);
      setSubtasks(prev => [...prev, data as Subtask]);
    } catch (e: any) {
      console.error('[TaskEngine] addSubtask error:', e);
      throw e;
    }
  }, [subtasks]);

  const toggleSubtask = useCallback(async (subtaskId: string, status: Subtask['status']) => {
    try {
      const sb = getBrowserSupabase();
      const { error } = await sb.from('ypwork_subtasks').update({ status }).eq('id', subtaskId);
      if (error) throw new Error(error.message);
      setSubtasks(prev => prev.map(s => (s.id === subtaskId ? { ...s, status } : s)));
    } catch (e: any) {
      console.error('[TaskEngine] toggleSubtask error:', e);
      throw e;
    }
  }, []);

  const deleteSubtask = useCallback(async (subtaskId: string) => {
    try {
      const sb = getBrowserSupabase();
      const { error } = await sb.from('ypwork_subtasks').delete().eq('id', subtaskId);
      if (error) throw new Error(error.message);
      setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    } catch (e: any) {
      console.error('[TaskEngine] deleteSubtask error:', e);
      throw e;
    }
  }, []);

  // ── Compose task with relations ───────────────────────────────
  const getTaskWithRelations = useCallback((taskId: string): TaskWithRelations | null => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const taskAssignees = assignees
      .filter(a => a.task_id === taskId)
      .map(a => members.find(m => m.auth_uid === a.user_id))
      .filter(Boolean) as UserProfile[];
    const taskSubtasks = subtasks
      .filter(s => s.task_id === taskId)
      .sort((a, b) => a.sort_order - b.sort_order);
    return { ...task, assignees: taskAssignees, subtasks: taskSubtasks };
  }, [tasks, assignees, members, subtasks]);

  // ── Public API (frozen) ───────────────────────────────────────
  const value: TaskCtx = {
    tasks, subtasks, assignees, members, loading, error,
    fetchAll, createTask, updateTask, deleteTask,
    updateStatus, addSubtask, toggleSubtask, deleteSubtask,
    getTaskWithRelations,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// ─── Frozen Public API (Fantrove pattern) ─────────────────────────
// Export only the hook — internals are not exposed.
export const TaskEngineAPI = Object.freeze({
  useTaskEngine,
  EVENTS: Object.freeze({
    TASK_CREATED:  'ypwork:task-created',
    TASK_UPDATED:  'ypwork:task-updated',
    TASK_DELETED:  'ypwork:task-deleted',
  }),
} as const);
