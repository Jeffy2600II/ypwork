// Path:    src/app/page.tsx
// Purpose: Main entry — shows login if not authenticated, dashboard if authenticated.
//          Mounts all 6 Core Module providers around the dashboard.

'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { TaskEngineProvider } from '@/modules/task-engine';
import { FilterProvider } from '@/modules/filter-system';
import { CategoryProvider } from '@/modules/category-manager';
import { ViewProvider } from '@/modules/view-renderer';
import { CalendarProvider } from '@/modules/calendar-engine';
import { LoginPage } from '@/components/LoginPage';
import { AppShell } from '@/components/AppShell';

export default function HomePage() {
  const { loading, user, recoveryFailed, recoveryReason } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div className="loading-center">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>กำลังโหลด ypwork...</div>
        </div>
      </div>
    );
  }

  // Not authenticated → login page
  if (!user) {
    return <LoginPage />;
  }

  // Recovery failed → show error + retry button
  if (recoveryFailed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 20,
      }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>โหลดข้อมูลไม่สำเร็จ</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
            {recoveryReason ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => window.location.reload()}
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // Authenticated → mount all 6 module providers + dashboard
  return (
    <TaskEngineProvider>
      <FilterProvider>
        <CategoryProvider>
          <ViewProvider>
            <CalendarProvider>
              <AppShell />
            </CalendarProvider>
          </ViewProvider>
        </CategoryProvider>
      </FilterProvider>
    </TaskEngineProvider>
  );
}
