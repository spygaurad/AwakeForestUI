'use client';

import { formatDistance } from '@/features/maps/hooks/useMeasureTool';
import { MC } from '../mapColors';

export interface MapStatusBarProps {
  cursorLatLng: [number, number] | null;
  zoom: number;
  measurementActive: boolean;
  totalDistanceM: number;
  autoSaveStatus?: 'idle' | 'pending' | 'saving';
}

export function MapStatusBar({
  cursorLatLng,
  zoom,
  measurementActive,
  totalDistanceM,
  autoSaveStatus = 'idle',
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
      {/* Left: CRS + auto-save status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
        <span
          style={{
            fontSize: 11,
            color: MC.statusText,
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
            opacity: 0.6,
          }}
        >
          EPSG:3857
        </span>

        {/* Auto-save indicator */}
        {autoSaveStatus !== 'idle' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: autoSaveStatus === 'saving' ? MC.navAccent : MC.statusText,
              fontFamily: 'monospace',
              opacity: 0.7,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: autoSaveStatus === 'saving' ? MC.navAccent : MC.statusText,
                flexShrink: 0,
                animation: autoSaveStatus === 'saving'
                  ? 'af-save-pulse 0.8s ease-in-out infinite alternate'
                  : 'none',
              }}
            />
            {autoSaveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
          </span>
        )}
      </div>

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

      <style>{`
        @keyframes af-save-pulse {
          from { opacity: 0.3; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
