'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Settings, AlertTriangle, RefreshCw, Loader } from 'lucide-react';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import type { LayerType } from '@/features/maps/types';
import { getMapManager } from '@/features/maps/MapManager';
import { MC } from '../../mapColors';

export interface LayerItemProps {
  id: string;
  name: string;
  type: LayerType;
  /** Optional inline legend entries below the layer row */
  legend?: { label: string; color: string }[];
}

export function LayerItem({ id, name, type, legend }: LayerItemProps) {
  const [hovered, setHovered] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const layer = useMapLayersStore((s) => s.layers[id]);
  const setLayerVisible = useMapLayersStore((s) => s.setLayerVisible);
  const setLayerOpacity = useMapLayersStore((s) => s.setLayerOpacity);
  const openStylePanel = useMapLayersStore((s) => s.openStylePanel);
  const focusLayer = useMapLayersStore((s) => s.focusLayer);
  const isSelected = useMapLayersStore((s) => s.selectedLayerId === id);

  const handleRetry = useCallback(() => {
    getMapManager().retryLayer(id);
    // Clear error in store
    useMapLayersStore.setState((s) => ({
      layers: s.layers[id]
        ? { ...s.layers, [id]: { ...s.layers[id], error: false } }
        : s.layers,
    }));
  }, [id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      focusLayer(id);
    }
  }, [focusLayer, id]);

  if (!layer) return null;

  const color = layer.style?.color ?? MC.accent;
  const hasError = layer.error || getMapManager().hasError(id);
  const isLoading = layer.loading;

  // Build inline legend from classStyles if not provided explicitly
  const effectiveLegend = legend ?? (
    layer.classStyles
      ? Object.entries(layer.classStyles).map(([, cs]) => ({
          label: '',
          color: cs.fillColor,
        }))
      : undefined
  );
  const showLegend = effectiveLegend && effectiveLegend.length > 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: '2px 8px 2px 24px' }}
    >
      {/* Row */}
      <div
        role="treeitem"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-selected={isSelected}
        aria-label={`${name} layer${hasError ? ', error' : ''}${isLoading ? ', loading' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 30,
          gap: 7,
          borderRadius: 5,
          padding: '0 5px',
          background: hovered ? MC.hoverBg : 'transparent',
          transition: 'background 0.1s',
          outline: 'none',
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

        {/* Loading indicator */}
        {isLoading && (
          <span title="Loading data…" style={{ flexShrink: 0, display: 'flex' }}>
            <Loader size={11} style={{ color: MC.textMuted, animation: 'spin 1s linear infinite' }} />
          </span>
        )}

        {/* Error indicator + retry */}
        {hasError && (
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span title="Tile load error" style={{ display: 'flex' }}>
              <AlertTriangle size={12} style={{ color: MC.danger, opacity: 0.8 }} />
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              title="Retry loading"
              aria-label={`Retry loading ${name} layer`}
              style={{
                width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none',
                color: MC.textMuted, cursor: 'pointer', borderRadius: 3,
              }}
            >
              <RefreshCw size={10} />
            </button>
          </span>
        )}

        {/* Visibility */}
        <button
          onClick={() => setLayerVisible(id, !layer.visible)}
          title={layer.visible ? 'Hide' : 'Show'}
          aria-label={`${layer.visible ? 'Hide' : 'Show'} ${name} layer`}
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
          aria-label={`Edit style for ${name} layer`}
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

      {/* Inline legend — collapsible, shown for annotation set layers with class styles */}
      {showLegend && (
        <div style={{ paddingLeft: 17, paddingBottom: 2 }}>
          <button
            onClick={() => setLegendOpen((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: MC.textMuted,
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{
              display: 'inline-block',
              width: 8,
              textAlign: 'center',
              transition: 'transform 0.15s',
              transform: legendOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>
              ›
            </span>
            {effectiveLegend!.length} class{effectiveLegend!.length !== 1 ? 'es' : ''}
          </button>
          {legendOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0 4px 12px' }}>
              {effectiveLegend!.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: item.color,
                    flexShrink: 0,
                    opacity: 0.85,
                  }} />
                  {item.label && (
                    <span style={{
                      fontSize: 10,
                      color: MC.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
