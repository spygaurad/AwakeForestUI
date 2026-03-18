'use client';

import { Ruler, X, Check } from 'lucide-react';
import { formatDistance } from '@/features/maps/hooks/useMeasureTool';
import { MC, MAP_Z } from '../mapColors';

export interface MeasurementOverlayProps {
  pointCount: number;
  totalDistanceM: number;
  onClear: () => void;
  onDone: () => void;
}

export function MeasurementOverlay({
  pointCount,
  totalDistanceM,
  onClear,
  onDone,
}: MeasurementOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 38,
        left: 12,
        zIndex: MAP_Z.overlay,
        background: MC.panelBg,
        border: `1.5px solid ${MC.accent}`,
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: MC.shadowMd,
        minWidth: 220,
      }}
    >
      {/* Icon */}
      <div style={{ color: MC.accent, flexShrink: 0 }}>
        <Ruler size={16} />
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: MC.text, fontWeight: 500 }}>
          {pointCount === 0
            ? 'Click on the map to start measuring'
            : pointCount === 1
            ? '1 point — click to add more'
            : `${pointCount} points`}
        </div>
        {totalDistanceM > 0 && (
          <div
            style={{
              fontSize: 13,
              color: MC.accent,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              marginTop: 2,
            }}
          >
            {formatDistance(totalDistanceM)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {pointCount > 0 && (
          <button
            onClick={onClear}
            title="Clear measurement"
            style={{
              height: 26,
              paddingLeft: 8,
              paddingRight: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 4,
              border: `1px solid ${MC.border}`,
              background: 'transparent',
              color: MC.textMuted,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            <X size={12} />
            Clear
          </button>
        )}
        <button
          onClick={onDone}
          title="Done measuring"
          style={{
            height: 26,
            paddingLeft: 8,
            paddingRight: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 4,
            border: `1.5px solid ${MC.accent}`,
            background: MC.accentDim,
            color: MC.accent,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Check size={12} />
          Done
        </button>
      </div>
    </div>
  );
}
