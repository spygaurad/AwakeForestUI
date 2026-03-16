'use client';

import { useMapStore } from '@/stores/mapStore';

// Web Mercator: meters per pixel at given zoom and latitude
function metersPerPixel(zoom: number, latDeg: number): number {
  return (156543.03392 * Math.cos((latDeg * Math.PI) / 180)) / Math.pow(2, zoom);
}

// Nice round scale values in metres
const NICE_M = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000,
];

const MIN_BAR_PX = 40;
const MAX_BAR_PX = 100;

// Pick the scale value whose bar width falls in [MIN_BAR_PX, MAX_BAR_PX].
// If nothing fits, pick the value closest to MAX_BAR_PX to ensure visibility.
function pickScale(mPerPx: number): { scaleM: number; barPx: number } {
  let best = NICE_M[0];
  for (const v of NICE_M) {
    const px = v / mPerPx;
    if (px <= MAX_BAR_PX) best = v;
  }
  // Ensure minimum visible bar width by bumping to next nice value if too small
  let scaleM = best;
  let barPx = Math.round(scaleM / mPerPx);
  if (barPx < MIN_BAR_PX) {
    // Find the smallest nice value that produces >= MIN_BAR_PX
    for (const v of NICE_M) {
      barPx = Math.round(v / mPerPx);
      if (barPx >= MIN_BAR_PX) {
        scaleM = v;
        break;
      }
    }
    barPx = Math.round(scaleM / mPerPx);
  }
  return { scaleM, barPx: Math.min(barPx, MAX_BAR_PX + 20) };
}

function fmtMetric(m: number): string {
  if (m >= 1000) return `${(m / 1000) % 1 === 0 ? m / 1000 : (m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

function fmtImperial(m: number): string {
  const ft = m * 3.28084;
  if (ft < 5280) return `${Math.round(ft)} ft`;
  return `${(m / 1609.344).toFixed(ft < 52800 ? 1 : 0)} mi`;
}

const TEXT_SHADOW = '0 1px 3px rgba(0,0,0,0.85), 0 0 5px rgba(0,0,0,0.5)';
const TICK_SHADOW = '0 1px 2px rgba(0,0,0,0.9)';

export function ScaleBar() {
  const zoom = useMapStore((s) => s.zoom);
  const lat = useMapStore((s) => s.center[0]);

  const mPerPx = metersPerPixel(zoom, lat);
  const { scaleM, barPx } = pickScale(mPerPx);

  return (
    <div
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Metric row */}
      <ScaleRow label={fmtMetric(scaleM)} widthPx={barPx} />
      {/* Imperial row — slightly dimmed */}
      <ScaleRow label={fmtImperial(scaleM)} widthPx={barPx} dim />
    </div>
  );
}

function ScaleRow({
  label,
  widthPx,
  dim = false,
}: {
  label: string;
  widthPx: number;
  dim?: boolean;
}) {
  const opacity = dim ? 0.6 : 1;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, opacity }}>
      {/* Bar container */}
      <div style={{ position: 'relative', width: widthPx + 4, height: 10, flexShrink: 0 }}>
        {/* Left tick */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 2, height: '100%',
          background: 'rgba(255,255,255,0.97)',
          boxShadow: TICK_SHADOW,
        }} />
        {/* Right tick */}
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: 2, height: '100%',
          background: 'rgba(255,255,255,0.97)',
          boxShadow: TICK_SHADOW,
        }} />
        {/* Two-tone alternating bar */}
        <div style={{
          position: 'absolute',
          left: 2, top: 2,
          width: widthPx, height: 6,
          display: 'flex',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.75)',
        }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.97)' }} />
          <div style={{ flex: 1, background: 'rgba(14,18,12,0.92)' }} />
        </div>
        {/* "0" tick label */}
        <span style={{
          position: 'absolute',
          left: 1,
          bottom: -11,
          fontSize: 9,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.97)',
          textShadow: TEXT_SHADOW,
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}>
          0
        </span>
      </div>

      {/* Distance label */}
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.97)',
        textShadow: TEXT_SHADOW,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        letterSpacing: '0.01em',
      }}>
        {label}
      </span>
    </div>
  );
}
