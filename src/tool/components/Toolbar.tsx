'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onClear?: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="toolbar">
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={state.animate}
          onChange={(e) => update({ animate: e.target.checked })}
          data-testid="toolbar-animate"
        />
        Animate
      </label>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={state.showTangent}
          onChange={(e) => update({ showTangent: e.target.checked })}
          data-testid="toolbar-tangent"
        />
        Tangent line
      </label>
      <button
        type="button"
        onClick={onCopy}
        data-testid="toolbar-copy"
        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Copy values
      </button>
      <button
        type="button"
        onClick={onClear}
        data-testid="toolbar-clear"
        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Clear snapshots
      </button>
    </div>
  );
};
