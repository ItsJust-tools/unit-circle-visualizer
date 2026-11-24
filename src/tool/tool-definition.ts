import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  formatNumber,
  normalizeAngle,
  summaryText,
  trigValues,
  type AngleUnit,
  type HistoryEntry,
  type ToolState,
} from './types';

const VALID_UNITS: AngleUnit[] = ['deg', 'rad'];

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    angleDeg: state.angleDeg,
    unit: state.unit,
    animate: state.animate,
    showTangent: state.showTangent,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: AngleUnit): AngleUnit {
  return typeof value === 'string' && (VALID_UNITS as string[]).includes(value)
    ? (value as AngleUnit)
    : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected unit circle visualizer state object',
    };
  }
  const v = data as Record<string, unknown>;
  const angleDeg =
    typeof v.angleDeg === 'number' && Number.isFinite(v.angleDeg)
      ? normalizeAngle(v.angleDeg)
      : DEFAULT_STATE.angleDeg;
  const state: ToolState = {
    angleDeg,
    unit: stringOr(v.unit, DEFAULT_STATE.unit),
    animate: typeof v.animate === 'boolean' ? v.animate : DEFAULT_STATE.animate,
    showTangent: typeof v.showTangent === 'boolean' ? v.showTangent : DEFAULT_STATE.showTangent,
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a snapshot entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** One formatted trig table row. */
export function trigRow(label: string, value: number | null): string {
  return `${label} = ${value === null ? 'undefined' : formatNumber(value)}`;
}

/** Multi-line summary of all trig values for the current angle. */
export function trigSummary(state: ToolState): string {
  const a = normalizeAngle(state.angleDeg);
  const t = trigValues(a);
  return [
    summaryText(state),
    trigRow('sin', t.sin),
    trigRow('cos', t.cos),
    trigRow('tan', t.tan),
    trigRow('csc', t.csc),
    trigRow('sec', t.sec),
    trigRow('cot', t.cot),
  ].join('\n');
}

export const unitCircleTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
