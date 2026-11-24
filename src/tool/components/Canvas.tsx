'use client';

import React from 'react';
import {
  SPECIAL_ANGLES,
  exactRadians,
  formatNumber,
  normalizeAngle,
  quadrantLabel,
  trigValues,
} from '../types';
import type { AngleUnit, ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveSnapshot?: (text: string) => void;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 130;

const inputValueClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const cellClass =
  'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function TrigRow({
  label,
  value,
  testid,
}: {
  label: string;
  value: number | null;
  testid: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2" data-testid={testid}>
      <span className="font-mono text-sm">{label}</span>
      <span className="font-mono text-sm">
        {value === null ? 'undefined' : formatNumber(value)}
      </span>
    </div>
  );
}

function formatAngleInput(angleDeg: number, unit: AngleUnit): string {
  return unit === 'deg'
    ? String(Number(angleDeg.toFixed(6)))
    : String(Number(((angleDeg * Math.PI) / 180).toFixed(6)));
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveSnapshot }) => {
  const angle = normalizeAngle(state.angleDeg);
  const rad = (angle * Math.PI) / 180;
  const t = trigValues(angle);

  const px = CENTER + RADIUS * Math.cos(rad);
  const py = CENTER - RADIUS * Math.sin(rad);

  // Tangent line: from (R, 0) upward along x = R, length = tan(angle).
  const tanLength = t.tan === null ? Infinity : t.tan * RADIUS;
  const clampedTan = Number.isFinite(tanLength)
    ? Math.max(-RADIUS * 2.2, Math.min(RADIUS * 2.2, tanLength))
    : RADIUS * 2.2;
  const tanY2 = CENTER - clampedTan;

  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });

  const [editing, setEditing] = React.useState<string | null>(null);
  const angleInput = editing ?? formatAngleInput(state.angleDeg, state.unit);

  const commitAngleInput = () => {
    setEditing(null);
    const parsed = Number(angleInput);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const deg = state.unit === 'deg' ? parsed : (parsed * 180) / Math.PI;
    update({ angleDeg: normalizeAngle(deg) });
  };

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - CENTER;
    const y = CENTER - ((e.clientY - rect.top) / rect.height) * SIZE;
    const deg = (Math.atan2(y, x) * 180) / Math.PI;
    update({ angleDeg: normalizeAngle(deg) });
  };

  const [isRotating, setIsRotating] = React.useState(false);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);
  React.useEffect(() => {
    if (!state.animate || !isRotating) return;
    const id = window.setInterval(() => {
      const prev = stateRef.current;
      onChange?.({ ...prev, angleDeg: normalizeAngle(prev.angleDeg + 5) });
    }, 80);
    return () => window.clearInterval(id);
  }, [state.animate, isRotating, onChange]);

  return (
    <div className="space-y-6" data-testid="unit-circle-canvas">
      <div className="grid gap-6 lg:grid-cols-[auto,1fr] items-start">
        {/* SVG unit circle */}
        <div className="mx-auto">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            data-testid="unit-circle-svg"
            onPointerDown={handlePointer}
            role="img"
            aria-label={`Unit circle at ${formatNumber(angle)} degrees`}
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-400 dark:text-gray-600"
            />
            <line
              x1={CENTER - RADIUS}
              y1={CENTER}
              x2={CENTER + RADIUS}
              y2={CENTER}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-300 dark:text-gray-700"
            />
            <line
              x1={CENTER}
              y1={CENTER - RADIUS}
              x2={CENTER}
              y2={CENTER + RADIUS}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-300 dark:text-gray-700"
            />
            <path
              d={`M ${CENTER + 36} ${CENTER} A 36 36 0 ${rad > Math.PI ? 1 : 0} 0 ${CENTER + 36 * Math.cos(rad)} ${CENTER + 36 * Math.sin(rad)}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-blue-400"
            />
            {state.showTangent && (
              <line
                x1={CENTER + RADIUS}
                y1={CENTER}
                x2={CENTER + RADIUS}
                y2={tanY2}
                stroke="currentColor"
                strokeWidth="2"
                className="text-amber-500"
                data-testid="tangent-line"
              />
            )}
            <line
              x1={CENTER}
              y1={CENTER}
              x2={px}
              y2={py}
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-600 dark:text-blue-400"
            />
            <line
              x1={px}
              y1={py}
              x2={px}
              y2={CENTER}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 3"
              className="text-red-500"
            />
            <circle
              cx={px}
              cy={py}
              r={7}
              className="fill-blue-600 dark:fill-blue-400"
              data-testid="angle-pointer"
            />
            <text x={CENTER + RADIUS + 10} y={CENTER + 4} className="fill-gray-500 text-xs">
              1
            </text>
            <text x={CENTER + 4} y={CENTER - RADIUS - 6} className="fill-gray-500 text-xs">
              1
            </text>
          </svg>
        </div>

        {/* Angle input and presets */}
        <div className="space-y-4 w-full">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Angle in {state.unit === 'deg' ? 'degrees' : 'radians'}
              <input
                type="text"
                inputMode="decimal"
                value={angleInput}
                onChange={(e) => setEditing(e.target.value)}
                onBlur={commitAngleInput}
                onKeyDown={(e) => e.key === 'Enter' && commitAngleInput()}
                data-testid="angle-input"
                className={inputValueClass}
              />
            </label>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Unit
              <select
                value={state.unit}
                onChange={(e) => update({ unit: e.target.value === 'rad' ? 'rad' : 'deg' })}
                data-testid="unit-select"
                className={inputValueClass}
              >
                <option value="deg">degrees</option>
                <option value="rad">radians</option>
              </select>
            </label>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Special angles
            </div>
            <div className="flex flex-wrap gap-2" data-testid="special-angle-presets">
              {SPECIAL_ANGLES.map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => update({ angleDeg: deg })}
                  data-testid={`preset-${deg}`}
                  className={
                    normalizeAngle(deg) === angle
                      ? 'px-2 py-1 text-xs rounded border border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                >
                  {deg}° · {exactRadians(deg)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsRotating((r) => !r)}
              data-testid="rotate-toggle"
              className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isRotating ? 'Stop rotation' : 'Animate rotation'}
            </button>
            <button
              type="button"
              onClick={() => update({ showTangent: !state.showTangent })}
              data-testid="tangent-toggle"
              className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {state.showTangent ? 'Hide tangent line' : 'Show tangent line'}
            </button>
            <button
              type="button"
              onClick={() => onChange?.({ ...state, unit: state.unit === 'deg' ? 'rad' : 'deg' })}
              data-testid="unit-toggle"
              className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Switch to {state.unit === 'deg' ? 'radians' : 'degrees'}
            </button>
            <button
              type="button"
              onClick={() =>
                onSaveSnapshot?.(
                  `${formatNumber(angle)}° (${exactRadians(angle)} rad) — cos ${formatNumber(t.cos)}, sin ${formatNumber(t.sin)}`
                )
              }
              data-testid="snapshot-button"
              className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Snapshot coordinates
            </button>
          </div>
        </div>
      </div>

      {/* Values panel */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Angle</div>
          <div className="space-y-2">
            <div className={cellClass} data-testid="angle-degrees">
              <span className="text-xs text-gray-500 dark:text-gray-400">Degrees</span>
              <span className="font-mono">{formatNumber(angle)}°</span>
            </div>
            <div className={cellClass} data-testid="angle-radians">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Radians (decimal / exact)
              </span>
              <span className="font-mono">
                {Number(rad.toFixed(6))} = {exactRadians(angle)}
              </span>
            </div>
            <div className={cellClass} data-testid="angle-quadrant">
              <span className="text-xs text-gray-500 dark:text-gray-400">Quadrant</span>
              <span>{quadrantLabel(angle)}</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Trig values
            </span>
            <CopyButton
              testid="copy-trig"
              value={[
                `sin = ${formatNumber(t.sin)}`,
                `cos = ${formatNumber(t.cos)}`,
                `tan = ${t.tan === null ? 'undefined' : formatNumber(t.tan)}`,
                `csc = ${t.csc === null ? 'undefined' : formatNumber(t.csc)}`,
                `sec = ${t.sec === null ? 'undefined' : formatNumber(t.sec)}`,
                `cot = ${t.cot === null ? 'undefined' : formatNumber(t.cot)}`,
              ].join('\n')}
            />
          </div>
          <div className={cellClass}>
            <TrigRow label="sin θ" testid="trig-sin" value={t.sin} />
            <TrigRow label="cos θ" testid="trig-cos" value={t.cos} />
            <TrigRow label="tan θ" testid="trig-tan" value={t.tan} />
            <TrigRow label="csc θ" testid="trig-csc" value={t.csc} />
            <TrigRow label="sec θ" testid="trig-sec" value={t.sec} />
            <TrigRow label="cot θ" testid="trig-cot" value={t.cot} />
          </div>
          <div className={cellClass} data-testid="coordinates">
            <span className="text-xs text-gray-500 dark:text-gray-400">Point (cos θ, sin θ)</span>
            <span className="font-mono">
              ({formatNumber(t.cos)}, {formatNumber(t.sin)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
