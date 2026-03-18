'use client';

import type { DrawTool } from '@/stores/mapStore';
import type { LayerStyle } from '@/features/maps/types';
import { MC } from '../../../mapColors';

const DASH_OPTIONS = [
  { label: 'Solid',     value: '' },
  { label: 'Dashed',    value: '8 4' },
  { label: 'Dotted',    value: '2 4' },
  { label: 'Long dash', value: '16 6' },
];

export interface AnnotationStylePickerProps {
  style: Pick<LayerStyle, 'color' | 'fillColor' | 'fillOpacity' | 'weight' | 'dashArray'>;
  shapeType: DrawTool | null;
  onChange: (partial: Partial<LayerStyle>) => void;
}

/**
 * Color pickers, opacity/weight sliders, dash pattern selector, and an inline
 * SVG preview. Stateless — all values come from props, all changes go through onChange.
 */
export function AnnotationStylePicker({ style, shapeType, onChange }: AnnotationStylePickerProps) {
  const isPolyline = shapeType === 'polyline';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Color row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 4 }}>Stroke color</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={style.color}
              aria-label="Stroke color"
              onChange={(e) => onChange({ color: e.target.value })}
              style={{ width: 32, height: 28, cursor: 'pointer', borderRadius: 4, border: 'none', padding: 1 }}
            />
            <span style={{ fontSize: 11, color: MC.textSecondary, fontFamily: 'monospace' }}>
              {style.color.toUpperCase()}
            </span>
          </div>
        </div>

        {!isPolyline && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 4 }}>Fill color</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.fillColor}
                aria-label="Fill color"
                onChange={(e) => onChange({ fillColor: e.target.value })}
                style={{ width: 32, height: 28, cursor: 'pointer', borderRadius: 4, border: 'none', padding: 1 }}
              />
              <span style={{ fontSize: 11, color: MC.textSecondary, fontFamily: 'monospace' }}>
                {style.fillColor.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Fill opacity — polygon shapes only ────────────────── */}
      {!isPolyline && (
        <SliderRow
          label="Fill opacity"
          value={Math.round(style.fillOpacity * 100)}
          min={0} max={100} unit="%"
          onChange={(v) => onChange({ fillOpacity: v / 100 })}
        />
      )}

      {/* ── Stroke width ──────────────────────────────────────── */}
      <SliderRow
        label="Line width"
        value={style.weight}
        min={1} max={10} step={0.5} unit="px"
        onChange={(v) => onChange({ weight: v })}
      />

      {/* ── Dash pattern ──────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 4 }}>Line style</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {DASH_OPTIONS.map((opt) => {
            const active = (style.dashArray ?? '') === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => onChange({ dashArray: opt.value || undefined })}
                title={opt.label}
                aria-pressed={active}
                style={{
                  flex: 1, height: 28, fontSize: 10, fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${active ? MC.accent : MC.inputBorder}`,
                  background: active ? MC.accentDim : MC.inputBg,
                  color: active ? MC.accent : MC.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SVG preview ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
        {isPolyline ? (
          <svg width="120" height="24" viewBox="0 0 120 24" aria-hidden="true">
            <polyline
              points="8,18 30,8 60,16 90,6 112,14"
              fill="none"
              stroke={style.color}
              strokeWidth={Math.min(style.weight, 4)}
              strokeDasharray={style.dashArray || undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          </svg>
        ) : (
          <svg width="120" height="32" viewBox="0 0 120 32" aria-hidden="true">
            <polygon
              points="20,28 60,6 100,28"
              fill={style.fillColor}
              fillOpacity={style.fillOpacity}
              stroke={style.color}
              strokeWidth={Math.min(style.weight, 3)}
              strokeDasharray={style.dashArray || undefined}
            />
          </svg>
        )}
      </div>
    </div>
  );
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function SliderRow({
  label, value, min, max, step = 1, unit, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: MC.sectionLabel }}>{label}</span>
        <span style={{ fontSize: 11, color: MC.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        aria-label={label}
        aria-valuetext={`${value}${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: MC.accent, cursor: 'pointer' }}
      />
    </div>
  );
}
