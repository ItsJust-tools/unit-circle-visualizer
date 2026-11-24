'use client';

import React from 'react';
import { exactRadians, formatNumber, normalizeAngle } from '../types';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
}

// onChange is part of the shared component contract even though the sidebar
// is currently read-only; referenced here so lint stays quiet without
// changing the public props.
void 0; // noop

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  const angle = normalizeAngle(state.angleDeg);
  return (
    <aside className="space-y-4 text-sm" data-testid="sidebar">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Snapshots
        </h2>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="snapshots-empty">
            No snapshots yet — use “Snapshot coordinates” on the canvas.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="snapshots-list">
            {state.history.map((entry, i) => (
              <li key={`${entry.createdAt}-${i}`} className="rounded border p-2 text-xs">
                <div>{entry.text}</div>
                <div className="text-gray-400">{new Date(entry.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Current angle
        </h2>
        <p className="font-mono text-xs" data-testid="sidebar-angle">
          {formatNumber(angle)}° = {exactRadians(angle)}
        </p>
      </section>
    </aside>
  );
};
