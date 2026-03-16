'use client';

import { useMapLayersStore } from '@/stores/mapLayersStore';
import type { LayerType } from '@/features/maps/types';
import { MC } from '../../mapColors';

export interface LayerStylePanelProps {
  layerId: string;
  layerType: LayerType;
}

export function LayerStylePanel({ layerId, layerType }: LayerStylePanelProps) {
  const layer = useMapLayersStore((s) => s.layers[layerId]);
  const setLayerStyle = useMapLayersStore((s) => s.setLayerStyle);

  if (!layer) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: MC.textMuted, fontStyle: 'italic' }}>
        Layer not found.
      </div>
    );
  }

  const style = layer.style;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${MC.border}`, flexShrink: 0, background: MC.inputBg }}>
        <div style={{ fontSize: 11, color: MC.sectionLabel, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Style: {layerId}
        </div>
      </div>

      {/* Style controls */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Preview swatch */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Preview
          </div>
          <div
            style={{
              height: 32,
              borderRadius: 4,
              background: style.fillColor,
              opacity: style.fillOpacity,
              border: `${style.weight}px solid ${style.color}`,
            }}
          />
        </div>

        {/* Stroke color */}
        <StyleRow label="Stroke Color">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={style.color}
              aria-label="Stroke color"
              onChange={(e) => setLayerStyle(layerId, { color: e.target.value })}
              style={{ width: 32, height: 24, borderRadius: 3, border: `1px solid ${MC.border}`, background: 'transparent', cursor: 'pointer', padding: 0 }}
            />
            <span style={{ fontSize: 11, color: MC.textMuted, fontFamily: 'monospace' }}>
              {style.color}
            </span>
          </div>
        </StyleRow>

        {/* Fill color */}
        <StyleRow label="Fill Color">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={style.fillColor}
              aria-label="Fill color"
              onChange={(e) => setLayerStyle(layerId, { fillColor: e.target.value })}
              style={{ width: 32, height: 24, borderRadius: 3, border: `1px solid ${MC.border}`, background: 'transparent', cursor: 'pointer', padding: 0 }}
            />
            <span style={{ fontSize: 11, color: MC.textMuted, fontFamily: 'monospace' }}>
              {style.fillColor}
            </span>
          </div>
        </StyleRow>

        <StyleRow label={`Fill Opacity: ${Math.round(style.fillOpacity * 100)}%`}>
          <input
            type="range" min={0} max={100}
            value={Math.round(style.fillOpacity * 100)}
            aria-label="Fill opacity"
            aria-valuetext={`${Math.round(style.fillOpacity * 100)}%`}
            onChange={(e) => setLayerStyle(layerId, { fillOpacity: Number(e.target.value) / 100 })}
            style={{ width: '100%', accentColor: MC.accent, cursor: 'pointer' }}
          />
        </StyleRow>

        <StyleRow label={`Stroke Weight: ${style.weight}px`}>
          <input
            type="range" min={1} max={5} step={0.5}
            value={style.weight}
            aria-label="Stroke weight"
            aria-valuetext={`${style.weight}px`}
            onChange={(e) => setLayerStyle(layerId, { weight: Number(e.target.value) })}
            style={{ width: '100%', accentColor: MC.accent, cursor: 'pointer' }}
          />
        </StyleRow>

        {(layerType === 'annotation' || layerType === 'tracking' || layerType === 'alert') && (
          <StyleRow label={`Point Radius: ${style.radius}px`}>
            <input
              type="range" min={4} max={20} step={1}
              value={style.radius}
              aria-label="Point radius"
              aria-valuetext={`${style.radius}px`}
              onChange={(e) => setLayerStyle(layerId, { radius: Number(e.target.value) })}
              style={{ width: '100%', accentColor: MC.accent, cursor: 'pointer' }}
            />
          </StyleRow>
        )}
      </div>
    </div>
  );
}

function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}
