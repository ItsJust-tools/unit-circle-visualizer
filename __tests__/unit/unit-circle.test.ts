import { describe, it, expect } from 'vitest';
import {
  normalizeAngle,
  degToRad,
  radToDeg,
  formatNumber,
  exactRadians,
  trigValues,
  quadrantOf,
  quadrantLabel,
  referenceAngle,
  summaryText,
  snapshotText,
  SPECIAL_ANGLES,
  DEFAULT_STATE,
  MAX_HISTORY,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  trigRow,
  trigSummary,
  unitCircleTool,
} from '@/tool/tool-definition';
import type { ExporterLoader } from '@itsjust/core';
import { isState } from '@/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('normalizeAngle', () => {
  it('keeps in-range angles untouched', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(45)).toBe(45);
    expect(normalizeAngle(359.5)).toBeCloseTo(359.5);
  });

  it('wraps beyond 360', () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(390)).toBe(30);
    expect(normalizeAngle(720)).toBe(0);
    expect(normalizeAngle(760)).toBeCloseTo(40);
  });

  it('wraps negative degrees correctly', () => {
    expect(normalizeAngle(-30)).toBeCloseTo(330);
    expect(normalizeAngle(-360)).toBe(0);
    expect(normalizeAngle(-390)).toBeCloseTo(330);
    expect(normalizeAngle(-90)).toBeCloseTo(270);
  });

  it('handles non-finite input', () => {
    expect(normalizeAngle(Number.NaN)).toBe(0);
    expect(normalizeAngle(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('deg/rad conversion', () => {
  it('converts special angles exactly', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 12);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 12);
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 12);
    expect(radToDeg(degToRad(30))).toBeCloseTo(30, 12);
  });
});

describe('formatNumber', () => {
  it('formats integers and trims float noise', () => {
    expect(formatNumber(30)).toBe('30');
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(-0.00000000001)).toBe('0');
    expect(formatNumber(Number.NaN)).toBe('∞');
  });
});

describe('exactRadians', () => {
  it('renders exact multiples of pi', () => {
    expect(exactRadians(0)).toBe('0');
    expect(exactRadians(30)).toBe('π/6');
    expect(exactRadians(45)).toBe('π/4');
    expect(exactRadians(60)).toBe('π/3');
    expect(exactRadians(90)).toBe('π/2');
    expect(exactRadians(180)).toBe('π');
    expect(exactRadians(270)).toBe('3π/2');
    expect(exactRadians(360)).toBe('0');
    expect(exactRadians(120)).toBe('2π/3');
  });

  it('falls back to degrees for non-special angles', () => {
    expect(exactRadians(47)).toBe('47°');
  });
});

describe('trigValues for special angles', () => {
  it('matches expected results for 30, 45, 90', () => {
    const t30 = trigValues(30);
    expect(t30.sin).toBeCloseTo(0.5, 12);
    expect(t30.cos).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(t30.tan ?? NaN).toBeCloseTo(1 / Math.sqrt(3), 12);

    const t45 = trigValues(45);
    expect(t45.sin).toBeCloseTo(Math.sqrt(2) / 2, 12);
    expect(t45.cos).toBeCloseTo(Math.sqrt(2) / 2, 12);
    expect(t45.tan ?? NaN).toBeCloseTo(1, 12);

    const t90 = trigValues(90);
    expect(t90.sin).toBeCloseTo(1, 12);
    expect(t90.cos).toBeCloseTo(0, 12);
    expect(t90.tan).toBeNull();
    expect(t90.sec).toBeNull();
    expect(t90.cot).toBeCloseTo(0, 12);
    expect(t90.csc).toBeCloseTo(1, 12);
  });

  it('marks 0 and 180 reciprocal edge cases', () => {
    const t0 = trigValues(0);
    expect(t0.sin).toBeCloseTo(0, 12);
    expect(t0.csc).toBeNull();
    expect(t0.cot).toBeNull();
    expect(t0.tan).toBeCloseTo(0, 12);
    expect(t0.cos).toBeCloseTo(1, 12);

    const t180 = trigValues(180);
    expect(t180.csc).toBeNull();
    expect(t180.cos).toBeCloseTo(-1, 12);
  });
});

describe('quadrant and reference angle', () => {
  it('classifies quadrants and axes', () => {
    expect(quadrantOf(45)).toBe(1);
    expect(quadrantOf(135)).toBe(2);
    expect(quadrantOf(200)).toBe(3);
    expect(quadrantOf(300)).toBe(4);
    expect(quadrantOf(90)).toBe(0);
    expect(quadrantOf(270)).toBe(0);
    expect(quadrantLabel(135)).toBe('Quadrant II');
    expect(quadrantLabel(90)).toBe('Axis');
  });

  it('computes reference angles across quadrants', () => {
    expect(referenceAngle(30)).toBeCloseTo(30);
    expect(referenceAngle(150)).toBeCloseTo(30);
    expect(referenceAngle(210)).toBeCloseTo(30);
    expect(referenceAngle(330)).toBeCloseTo(30);
  });
});

describe('serialization round-trip', () => {
  it('serializes and deserializes state exactly', () => {
    const s = state({
      angleDeg: 135.25,
      unit: 'rad',
      animate: false,
      showTangent: false,
      history: [{ text: 'snapshot', createdAt: '2026-11-24T10:00:00.000Z' }],
    });
    expect(roundTrips(s)).toBe(true);
    const parsed = deserializeState(JSON.parse(serializeState(s)));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(JSON.stringify(parsed.data)).toBe(JSON.stringify(s));
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
  });

  it('repairs invalid fields with defaults', () => {
    const repaired = deserializeState({ angleDeg: 'x', unit: 5, animate: 'yes' });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.angleDeg).toBe(DEFAULT_STATE.angleDeg);
      expect(repaired.data.unit).toBe(DEFAULT_STATE.unit);
      expect(repaired.data.animate).toBe(DEFAULT_STATE.animate);
    }
  });

  it('normalizes out-of-range angles on deserialize', () => {
    const restored = deserializeState({ ...DEFAULT_STATE, angleDeg: 420 });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.angleDeg).toBeCloseTo(60);
    }
  });

  it('caps history at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 10, 24, 12, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`entry ${MAX_HISTORY + 4}`);
    expect(roundTrips(s)).toBe(true);
  });

  it('exposes tool identity and exporters', async () => {
    expect(unitCircleTool.id).toBe('unit-circle-visualizer');
    expect(unitCircleTool.name).toBe('Unit Circle Visualizer');
    const exporters = unitCircleTool.exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });
});

describe('summary and snapshot text', () => {
  it('summarizes the current angle', () => {
    const text = summaryText(state({ angleDeg: 45 }));
    expect(text).toContain('45°');
    expect(text).toContain('π/4');
    expect(text).toContain('Quadrant I');
    expect(snapshotText(state({ angleDeg: 90 }))).toContain('90°');
  });

  it('formats trig rows and multi-line copy summary', () => {
    expect(trigRow('tan', null)).toBe('tan = undefined');
    expect(trigRow('sin', 0.5)).toBe('sin = 0.5');
    const s = trigSummary(state({ angleDeg: 90 }));
    expect(s.split('\n')).toHaveLength(7);
    expect(s).toContain('tan = undefined');
  });
});

describe('SPECIAL_ANGLES presets', () => {
  it('includes canonical values', () => {
    for (const deg of [0, 30, 45, 60, 90, 180, 270, 360]) {
      expect(SPECIAL_ANGLES).toContain(deg);
    }
  });

  it('isState is a narrow type guard', () => {
    expect(isState(DEFAULT_STATE)).toBe(true);
    expect(isState({})).toBe(false);
    expect(isState(null)).toBe(false);
  });
});
