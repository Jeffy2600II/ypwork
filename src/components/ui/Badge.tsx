// Path:    src/components/ui/Badge.tsx
// Purpose: Reusable badge + avatar helpers.

'use client';

import React from 'react';
import { getStatusMeta, getPriorityMeta, getTaskTypeMeta } from '@/lib/constants';
import type { TaskStatus, TaskPriority, TaskType, UserProfile } from '@/lib/types';

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = getStatusMeta(status);
  return <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = getPriorityMeta(priority);
  return <span className={`badge ${meta.badgeClass}`}>{meta.shortLabel}</span>;
}

export function TypeBadge({ type }: { type: TaskType }) {
  const meta = getTaskTypeMeta(type);
  return <span className="badge badge-gray">{meta.icon} {meta.label}</span>;
}

export function AvatarStack({ users, max = 3, size = 'md' }: {
  users: UserProfile[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const shown = users.slice(0, max);
  const more = users.length - shown.length;
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : 'avatar-md';

  return (
    <div className="avatar-stack">
      {shown.map(u => {
        const initials = u.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
        return (
          <div key={u.auth_uid} className={`avatar ${sizeClass}`} title={u.full_name}>
            {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} /> : initials}
          </div>
        );
      })}
      {more > 0 && <span className="avatar-stack-more">+{more}</span>}
    </div>
  );
}
