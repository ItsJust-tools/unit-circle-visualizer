import { DEFAULT_STATE, type AngleUnit, type ToolState } from './types';

export const MODES: { value: AngleUnit; label: string; hint: string }[] = [
  { value: 'deg', label: 'Degrees', hint: 'angle input in degrees' },
  { value: 'rad', label: 'Radians', hint: 'angle input in radians' },
];

export function isState(value: unknown): value is ToolState {
  return typeof value === 'object' && value !== null && (value as ToolState).angleDeg !== undefined;
}

export { DEFAULT_STATE };
