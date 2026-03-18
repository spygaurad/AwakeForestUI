'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { BasemapId } from '@/stores/mapStore';
import { MC, MAP_Z } from '../mapColors';

const BASEMAP_OPTIONS: { id: BasemapId; label: string; color: string; desc: string }[] = [
  { id: 'osm',       label: 'Voyager',   color: '#b8d4a0', desc: 'CartoDB Voyager' },
  { id: 'satellite', label: 'Satellite', color: '#2a4a2a', desc: 'Esri World Imagery' },
  { id: 'light',     label: 'Light',     color: '#f0f0e8', desc: 'CartoDB Light' },
  { id: 'dark',      label: 'Dark',      color: '#2a2a3a', desc: 'CartoDB Dark Matter' },
];

export interface BasemapPickerProps {
  activeId: BasemapId;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: BasemapId) => void;
}

export function BasemapPicker({ activeId, open, onToggle, onSelect }: BasemapPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open, onToggle]);

  const active = BASEMAP_OPTIONS.find((o) => o.id === activeId);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 28, paddingLeft: 8, paddingRight: 6,
          borderRadius: 4,
          border: `1px solid ${open ? MC.accent : MC.border}`,
          background: open ? MC.accentDim : 'transparent',
          color: MC.text,
          cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
        }}
      >
        {active && (
          <div
            style={{
              width: 14, height: 14, borderRadius: 3,
              background: active.color,
              border: `1px solid ${MC.borderLight}`,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ color: MC.textMuted, fontSize: 11 }}>Basemap</span>
        <span style={{ color: MC.textSecondary }}>{active?.label ?? 'Voyager'}</span>
        <ChevronDown size={12} style={{ color: MC.textMuted }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: MC.panelBg,
            border: `1px solid ${MC.border}`,
            borderRadius: 6,
            overflow: 'hidden',
            minWidth: 160,
            zIndex: MAP_Z.dropdown,
            boxShadow: MC.shadowMd,
          }}
        >
          {BASEMAP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              aria-label={`${opt.label} — ${opt.desc}`}
              aria-pressed={opt.id === activeId}
              onClick={() => { onSelect(opt.id); onToggle(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px',
                background: opt.id === activeId ? MC.accentDim : 'transparent',
                color: opt.id === activeId ? MC.accent : MC.text,
                cursor: 'pointer',
                borderBottom: `1px solid ${MC.border}`,
              }}
            >
              <div
                style={{
                  width: 28, height: 20, borderRadius: 3,
                  background: opt.color,
                  border: `1px solid ${MC.borderLight}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: MC.textMuted }}>{opt.desc}</div>
              </div>
              {opt.id === activeId && (
                <Check size={13} style={{ color: MC.accent, flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
