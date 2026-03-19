'use client';

import { useState } from 'react';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import type { LayerType } from '@/features/maps/types';
import { MC } from '../../mapColors';

export interface LayerItemProps {
  id: string;
  name: string;
  type: LayerType;
}

export function LayerItem({ id, name, type }: LayerItemProps) {
  const [hovered, setHovered] = useState(false);

  const layer = useMapLayersStore((s) => s.layers[id]);
  const setLayerVisible = useMapLayersStore((s) => s.setLayerVisible);
  const setLayerOpacity = useMapLayersStore((s) => s.setLayerOpacity);
  const openStylePanel = useMapLayersStore((s) => s.openStylePanel);
  const focusLayer = useMapLayersStore((s) => s.focusLayer);

  if (!layer) return null;

  const color = layer.style?.color ?? MC.accent;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: '2px 8px 2px 24px' }}
    >
      {/* Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 30,
          gap: 7,
          borderRadius: 5,
          padding: '0 5px',
          background: hovered ? MC.hoverBg : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        {/* Color swatch */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: type === 'tracking' || type === 'alert' ? '50%' : 3,
            background: color,
            flexShrink: 0,
            opacity: layer.visible ? 0.9 : 0.3,
            border: `1px solid ${MC.borderLight}`,
          }}
        />

        {/* Name — click to focus (select + zoom + open panel) */}
        <span
          onClick={() => focusLayer(id)}
          style={{
            flex: 1,
            fontSize: 12,
            color: layer.visible ? MC.text : MC.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          title={name}
        >
          {name}
        </span>

        {/* Visibility */}
        <button
          onClick={() => setLayerVisible(id, !layer.visible)}
          title={layer.visible ? 'Hide' : 'Show'}
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: layer.visible ? MC.textMuted : MC.borderLight,
            cursor: 'pointer',
            flexShrink: 0,
            opacity: hovered ? 1 : 0.7,
            transition: 'opacity 0.1s',
          }}
        >
          {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        {/* Style */}
        <button
          onClick={() => openStylePanel(id)}
          title="Edit style"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: MC.textMuted,
            cursor: 'pointer',
            flexShrink: 0,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.12s',
          }}
        >
          <Settings size={12} />
        </button>
      </div>

      {/* Opacity slider — visible on hover */}
      {hovered && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 5px 5px 17px',
          }}
        >
          <label
            htmlFor={`opacity-${id}`}
            style={{ fontSize: 10, color: MC.textMuted, flexShrink: 0 }}
          >
            Opacity
          </label>
          <input
            id={`opacity-${id}`}
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => setLayerOpacity(id, Number(e.target.value) / 100)}
            aria-valuetext={`${Math.round(layer.opacity * 100)}%`}
            style={{ flex: 1, height: 3, accentColor: MC.accent, cursor: 'pointer' }}
          />
          <span
            style={{
              fontSize: 10,
              color: MC.textMuted,
              width: 28,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
