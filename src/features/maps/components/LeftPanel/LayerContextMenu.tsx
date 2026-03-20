'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, ZoomIn, Palette, Trash2 } from 'lucide-react';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { MC } from '../../mapColors';

interface LayerContextMenuProps {
  layerId: string;
  onRemove?: () => void;
}

export function LayerContextMenu({ layerId, onRemove }: LayerContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const focusLayer = useMapLayersStore((s) => s.focusLayer);
  const openStylePanel = useMapLayersStore((s) => s.openStylePanel);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [
    {
      label: 'Zoom to extent',
      icon: <ZoomIn size={12} />,
      onClick: () => { focusLayer(layerId); setOpen(false); },
    },
    {
      label: 'Edit style',
      icon: <Palette size={12} />,
      onClick: () => { openStylePanel(layerId); setOpen(false); },
    },
  ];

  if (onRemove) {
    items.push({
      label: 'Remove from map',
      icon: <Trash2 size={12} />,
      onClick: () => { onRemove(); setOpen(false); },
      danger: true,
    });
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Layer actions"
        aria-label="Layer actions"
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
          borderRadius: 4,
          opacity: 0.6,
        }}
      >
        <MoreVertical size={12} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 50,
            minWidth: 160,
            background: MC.panelBg,
            border: `1px solid ${MC.panelBorder}`,
            borderRadius: 6,
            boxShadow: MC.shadowMd,
            padding: '4px 0',
            marginTop: 2,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); item.onClick(); }}
              style={{
                width: '100%',
                height: 30,
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                color: item.danger ? MC.danger : MC.text,
                fontSize: 11,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = MC.hoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
