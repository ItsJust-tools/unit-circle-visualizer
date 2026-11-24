export type AngleUnit = 'deg' | 'rad';

export interface HistoryEntry {
  /** Short human readable description of the snapshot. */
  text: string;
  /** ISO timestamp when the snapshot was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Angle in degrees (may be any real value; normalized for display). */
  angleDeg: number;
  /** Preferred input unit for the angle field. */
  unit: AngleUnit;
  /** Show the animated rotation control. */
  animate: boolean;
  /** Show the tangent line on the circle. */
  showTangent: boolean;
  /** Saved snapshots, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  angleDeg: 45,
  unit: 'deg',
  animate: true,
  showTangent: true,
  history: [],
};

export const MAX_HISTORY = 20;

/** Normalize any angle in degrees into [0, 360). */
export function normalizeAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const wrapped = ((deg % 360) + 360) % 360;
  // Guard against -0 and float noise like 359.99999999999994.
  return wrapped === 0 || Object.is(wrapped, 360) ? 0 : Number(wrapped.toFixed(10));
}

/** Quadrant of a normalized angle: 1..4, or 0 for canonical axis angles. */
export function quadrantOf(deg: number): 0 | 1 | 2 | 3 | 4 {
  const a = normalizeAngle(deg);
  if (a === 0 || a === 90 || a === 180 || a === 270) return 0;
  if (a < 90) return 1;
  if (a < 180) return 2;
  if (a < 270) return 3;
  return 4;
}

/** Reference angle (acute angle to nearest x-axis) in degrees. */
export function referenceAngle(deg: number): number {
  const a = normalizeAngle(deg);
  if (a <= 90) return a;
  if (a <= 180) return 180 - a;
  if (a <= 270) return a - 180;
  return 360 - a;
}

/** Degrees to radians. */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Radians to degrees. */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Greatest common divisor for positive integers. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Exact form of the angle as multiples of pi: "π/3", "2π/3", "3π/2", "π", "0", ...
 * Uses a rational approximation of deg/180 with denominator up to 60.
 */
export function exactRadians(deg: number): string {
  const a = normalizeAngle(deg);
  if (a === 0) return '0';
  // deg/180 = num/den; find smallest integer den (1..60) so deg*den/180 is near-integer.
  for (let den = 1; den <= 60; den++) {
    const num = (a * den) / 180;
    const rounded = Math.round(num);
    if (rounded >= 1 && Math.abs(num - rounded) < 1e-9) {
      const g = gcd(rounded, den);
      const n = Math.round(rounded / g);
      const d = Math.round(den / g);
      if (d === 1) return `${n === 1 ? 'π' : `${n}π`}`;
      if (n === 1) return `π/${d}`;
      return `${n}π/${d}`;
    }
  }
  return `${formatNumber(a)}°`;
}

/** Format a number without float noise where possible. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  if (Math.abs(value) < 1e-10) return '0';
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  if (Math.abs(value) >= 1e15) {
    return value.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
  }
  return String(Number(value.toFixed(10)));
}

export interface TrigValues {
  sin: number;
  cos: number;
  tan: number | null;
  csc: number | null;
  sec: number | null;
  cot: number | null;
}

/** Trig values for an angle in degrees; reciprocal values null when undefined. */
export function trigValues(deg: number): TrigValues {
  const rad = degToRad(deg);
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const nearZero = (x: number) => Math.abs(x) < 1e-10;
  return {
    sin,
    cos,
    tan: nearZero(cos) ? null : sin / cos,
    csc: nearZero(sin) ? null : 1 / sin,
    sec: nearZero(cos) ? null : 1 / cos,
    cot: nearZero(sin) ? null : cos / sin,
  };
}

const QUADRANT_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'Axis',
  1: 'Quadrant I',
  2: 'Quadrant II',
  3: 'Quadrant III',
  4: 'Quadrant IV',
};

/** Quadrant display label for the current angle. */
export function quadrantLabel(deg: number): string {
  return QUADRANT_LABELS[quadrantOf(deg)];
}

/** One summary line describing angle + coordinates. */
export function summaryText(state: ToolState): string {
  const a = normalizeAngle(state.angleDeg);
  const t = trigValues(a);
  const x = formatNumber(t.cos);
  const y = formatNumber(t.sin);
  return `${formatNumber(a)}° (${exactRadians(a)} rad) — cos ${x}, sin ${y} — ${quadrantLabel(a)}`;
}

/** Build a snapshot entry text for the current state. */
export function snapshotText(state: ToolState): string {
  return summaryText(state);
}

/** Compact list of special angle presets in degrees. */
export const SPECIAL_ANGLES: number[] = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 315, 330, 360,
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.angleDeg === 'number' &&
    Number.isFinite(v.angleDeg) &&
    typeof v.unit === 'string' &&
    typeof v.animate === 'boolean' &&
    typeof v.showTangent === 'boolean' &&
    Array.isArray(v.history)
  );
}
