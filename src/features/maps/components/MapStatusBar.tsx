'use client';

import { formatDistance } from '@/features/maps/hooks/useMeasureTool';
import { MC } from '../mapColors';

export interface MapStatusBarProps {
  cursorLatLng: [number, number] | null;
  zoom: number;
  measurementActive: boolean;
  totalDistanceM: number;
}

export function MapStatusBar({
  cursorLatLng,
  zoom,
  measurementActive,
  totalDistanceM,
}: MapStatusBarProps) {
  return (
    <div
      style={{
        height: 26,
        background: MC.statusBg,
        borderTop: `1px solid ${MC.statusBorder}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        flexShrink: 0,
        gap: 0,
      }}
    >
      {/* Left: CRS */}
      <span
        style={{
          fontSize: 11,
          color: MC.statusText,
          fontFamily: 'monospace',
          flex: '0 0 auto',
          letterSpacing: '0.02em',
          opacity: 0.6,
        }}
      >
        EPSG:3857
      </span>

      {/* Center: cursor coordinates */}
      <span
        style={{
          fontSize: 11,
          color: cursorLatLng ? MC.navText : MC.statusText,
          fontFamily: 'monospace',
          flex: 1,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
        }}
      >
        {cursorLatLng
          ? `${cursorLatLng[0].toFixed(6)}, ${cursorLatLng[1].toFixed(6)}`
          : '—'}
      </span>

      {/* Right: zoom + optional measurement distance */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: '0 0 auto',
        }}
      >
        {measurementActive && totalDistanceM > 0 && (
          <span
            style={{
              fontSize: 11,
              color: MC.navAccent,
              fontFamily: 'monospace',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }}
          >
            {formatDistance(totalDistanceM)}
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: MC.statusText,
            fontFamily: 'monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Zoom {zoom.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
