'use client';

import { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { haversineM, formatDistance } from '@/features/maps/hooks/useMeasureTool';
import { MC } from '../../mapColors';

function formatImperial(m: number): string {
  const feet = m * 3.28084;
  if (feet < 5280) return `${Math.round(feet).toLocaleString()} ft`;
  return `${(m / 1609.344).toFixed(2)} mi`;
}

export function MeasurementPanel() {
  const points = useMapLayersStore((s) => s.measurementPoints);
  const clearMeasurementPoints = useMapLayersStore((s) => s.clearMeasurementPoints);
  const clearMeasurement = useMapLayersStore((s) => s.clearMeasurement);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  const fmt = unit === 'metric' ? formatDistance : formatImperial;

  // Compute per-segment distances
  const segments = points.slice(1).map((pt, i) => ({
    dist: haversineM(points[i], pt),
  }));
  const total = segments.reduce((s, seg) => s + seg.dist, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Unit toggle */}
      <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 2,
          background: MC.inputBg,
          border: `1px solid ${MC.inputBorder}`,
          borderRadius: 6,
          padding: 2,
        }}>
          {(['metric', 'imperial'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                flex: 1, height: 26, fontSize: 11, fontWeight: 600,
                borderRadius: 4, border: 'none',
                background: unit === u ? MC.accent : 'transparent',
                color: unit === u ? '#fff' : MC.textMuted,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {u === 'metric' ? 'm / km' : 'ft / mi'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {points.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.25 }}>📏</div>
            <div style={{ fontSize: 13, color: MC.textSecondary, lineHeight: 1.6, fontWeight: 500 }}>
              Click on the map to start measuring
            </div>
            <div style={{ fontSize: 11, color: MC.textMuted, marginTop: 6, lineHeight: 1.5 }}>
              Each click adds a point. Segment and cumulative distances update in real time.
            </div>
          </div>
        ) : (
          <>
            {/* Total distance */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${MC.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MC.sectionLabel, marginBottom: 4 }}>
                Total distance
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: MC.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {fmt(total)}
              </div>
              <div style={{ fontSize: 11, color: MC.textMuted, marginTop: 2 }}>
                {points.length} point{points.length !== 1 ? 's' : ''} · {segments.length} segment{segments.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Segment breakdown */}
            <div style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MC.sectionLabel, marginBottom: 8 }}>
                Segments
              </div>

              {/* Point 1 */}
              <PointMarker index={1} isLast={points.length === 1} />

              {segments.map((seg, i) => {
                const cumulative = segments.slice(0, i + 1).reduce((s, x) => s + x.dist, 0);
                return (
                  <div key={i}>
                    <SegmentRow seg={fmt(seg.dist)} cum={fmt(cumulative)} />
                    <PointMarker index={i + 2} isLast={i === segments.length - 1} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: `1px solid ${MC.border}`,
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        {points.length > 0 && (
          <button
            onClick={clearMeasurementPoints}
            style={{
              flex: 1, height: 32, borderRadius: 5,
              border: `1px solid ${MC.border}`,
              background: 'transparent', color: MC.textMuted,
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
        <button
          onClick={clearMeasurement}
          style={{
            flex: 2, height: 32, borderRadius: 5,
            border: `1.5px solid ${MC.accent}`,
            background: MC.accentDim, color: MC.accent,
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Check size={12} />
          Done
        </button>
      </div>
    </div>
  );
}

function PointMarker({ index, isLast }: { index: number; isLast: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: isLast ? MC.accent : MC.inputBg,
        border: `1.5px solid ${isLast ? MC.accent : MC.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isLast ? '#fff' : MC.textMuted }}>
          {index}
        </span>
      </div>
      <span style={{ fontSize: 11, color: isLast ? MC.text : MC.textMuted }}>
        Point {index}{isLast ? ' (latest)' : ''}
      </span>
    </div>
  );
}

function SegmentRow({ seg, cum }: { seg: string; cum: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 8 }}>
      <div style={{ width: 1, height: 14, background: MC.border, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: MC.accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flex: 1 }}>
        {seg}
      </span>
      <span style={{ fontSize: 10, color: MC.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        Σ {cum}
      </span>
    </div>
  );
}
