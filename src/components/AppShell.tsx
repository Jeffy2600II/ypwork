// Path:    src/components/AppShell.tsx
// Purpose: Wraps the dashboard with Sidebar + Topbar + BottomNav + FilterBar.
//          Mounts the active view, modal, and detail panel.

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTaskEngine } from '@/modules/task-engine';
import { useFilter } from '@/modules/filter-system';
import { useView } from '@/modules/view-renderer';
import { useRealtimeSync } from '@/modules/realtime-sync';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { BottomNav } from '@/components/BottomNav';
import { MobileTopbar } from '@/components/MobileTopbar';
import { FilterBar } from '@/components/FilterBar';
import { SummaryCards } from '@/components/SummaryCards';
import { MonthView } from '@/components/views/MonthView';
import { WeekView } from '@/components/views/WeekView';
import { DayView } from '@/components/views/DayView';
import { KanbanView } from '@/components/views/KanbanView';
import { TaskModal } from '@/components/TaskModal';
import { DetailPanel } from '@/components/DetailPanel';
import { CategoryModal } from '@/components/CategoryModal';
import type { Task } from '@/lib/types';

export function AppShell() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { fetchAll, tasks } = useTaskEngine();
  const { filters, setFilter } = useFilter();
  const { view, setView } = useView();

  const [activeNav, setActiveNav] = useState('home');
  const [showSummary, setShowSummary] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Realtime sync — re-fetch on any ypwork_* table change
  useRealtimeSync(() => { void fetchAll(); }, !!user);

  // Sync sidebar "my tasks" toggle with filter system
  const onlyMine = filters.onlyMine;

  function handleNavClick(id: string) {
    setActiveNav(id);
    if (id === 'home') {
      setShowSummary(true);
      setView('month');
    } else if (id === 'all-tasks') {
      setShowSummary(false);
      setView('kanban');
    } else if (id === 'activities') {
      setShowSummary(false);
      setView('kanban');
      setFilter('type', 'activity');
    }
  }

  function handleCategoryClick(id: string | 'all') {
    setFilter('categoryId', id);
  }

  function handleCreateClick() {
    setEditingTask(null);
    setPrefillDate(undefined);
    setTaskModalOpen(true);
  }

  function handleCreateOnDay(dateStr: string) {
    setEditingTask(null);
    setPrefillDate(dateStr);
    setTaskModalOpen(true);
  }

  function handleTaskClick(taskId: string) {
    setDetailTaskId(taskId);
  }

  function handleEditTask(task: Task) {
    setEditingTask(task);
    setDetailTaskId(null);
    setTaskModalOpen(true);
  }

  function handleBottomNavClick(id: string) {
    if (id === 'calendar') {
      setView('month');
      setShowSummary(true);
      setActiveNav('home');
    } else if (id === 'tasks') {
      setView('kanban');
      setShowSummary(false);
      setActiveNav('all-tasks');
    } else if (id === 'create') {
      handleCreateClick();
    } else if (id === 'profile') {
      if (confirm('ออกจากระบบ?')) {
        void signOut().then(() => router.push('/'));
      }
    }
  }

  function handleSummaryCardClick(kind: 'today' | 'in_progress' | 'soon' | 'done_month') {
    setShowSummary(false);
    setView('kanban');
    if (kind === 'today') {
      setFilter('status', 'all');
    } else if (kind === 'in_progress') {
      setFilter('status', 'in_progress');
    } else if (kind === 'soon') {
      setFilter('priority', 'high');
    } else if (kind === 'done_month') {
      setFilter('status', 'done');
    }
  }

  // Determine active bottom nav
  const activeBottom = view === 'month' && showSummary ? 'calendar' :
                      view === 'kanban' || view === 'week' || view === 'day' ? 'tasks' : 'calendar';

  const topbarTitle = view === 'month' ? 'ปฏิทินเดือน' :
                     view === 'week' ? 'ปฏิทินสัปดาห์' :
                     view === 'day' ? 'ปฏิทินรายวัน' :
                     view === 'kanban' ? 'Kanban Board' : 'ypwork';

  return (
    <div className="app-layout">
      <Sidebar
        activeNav={activeNav}
        onNavClick={handleNavClick}
        activeCategoryId={filters.categoryId}
        onCategoryClick={handleCategoryClick}
        onlyMine={onlyMine}
        onOnlyMineChange={v => setFilter('onlyMine', v)}
        onCreateClick={handleCreateClick}
        onAddCategory={() => setCategoryModalOpen(true)}
      />

      <div className="app-main">
        <Topbar
          title={topbarTitle}
          subtitle={`${tasks.length} งานทั้งหมด`}
          onSearch={q => setFilter('search', q)}
          searchValue={filters.search}
        />
        <MobileTopbar title={topbarTitle} />

        <main className="app-content">
          {showSummary && (
            <div style={{ marginBottom: 24 }}>
              <div className="sec-label" style={{ marginBottom: 10 }}>ภาพรวม</div>
              <SummaryCards onCardClick={handleSummaryCardClick} />
            </div>
          )}

          <FilterBar />

          {/* Active view */}
          {view === 'month' && (
            <MonthView
              onTaskClick={handleTaskClick}
              onDayClick={(dateStr) => { setView('day'); }}
              onCreateOnDay={handleCreateOnDay}
            />
          )}
          {view === 'week' && (
            <WeekView
              onTaskClick={handleTaskClick}
              onCreateOnDay={handleCreateOnDay}
            />
          )}
          {view === 'day' && (
            <DayView
              onTaskClick={handleTaskClick}
              onCreateOnDay={handleCreateOnDay}
            />
          )}
          {view === 'kanban' && (
            <KanbanView onTaskClick={handleTaskClick} />
          )}
        </main>

        <BottomNav activeId={activeBottom} onItemClick={handleBottomNavClick} />
      </div>

      {/* Modals & panels */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        editingTask={editingTask}
        prefillDate={prefillDate}
      />
      <DetailPanel
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onEdit={handleEditTask}
      />
      <CategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
    </div>
  );
}
