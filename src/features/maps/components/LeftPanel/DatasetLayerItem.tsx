'use client';

import { useState } from 'react';
import { Trash2, FileImage } from 'lucide-react';
import { LayerItem } from './LayerItem';
import type { Dataset } from '@/types/api';
import { MC } from '../../mapColors';
import { useMapLayersStore } from '@/stores/mapLayersStore';

const STATUS_COLORS: Record<string, string> = {
  ready:     MC.success,
  ingesting: MC.warning,
  pending:   MC.textMuted,
  failed:    MC.danger,
};

const STATUS_LABELS: Record<string, string> = {
  ready:     'Ready',
  ingesting: 'Ingesting',
  pending:   'Pending',
  failed:    'Failed',
};

export interface DatasetLayerItemProps {
  dataset: Dataset;
  onRemove?: () => void;
}

export function DatasetLayerItem({ dataset, onRemove }: DatasetLayerItemProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const statusColor = STATUS_COLORS[dataset.status] ?? MC.textMuted;
  const statusLabel = STATUS_LABELS[dataset.status] ?? dataset.status;
  const isIngesting = dataset.status === 'ingesting' || dataset.status === 'pending';
  const openDatasetPanel = useMapLayersStore((s) => s.openDatasetPanel);
  const openItemsPanel = useMapLayersStore((s) => s.openItemsPanel);
  const hasMultipleFiles = (dataset.metadata?.file_count ?? 0) > 1;

  return (
    <div>
      <LayerItem id={dataset.id} name={dataset.name} type="dataset" />

      {/* Status + info + actions row */}
      <div
        style={{
          paddingLeft: 44,
          paddingBottom: 4,
          paddingRight: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          onClick={() => openDatasetPanel(dataset.id)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: statusColor,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: statusColor,
                flexShrink: 0,
                animation: isIngesting ? 'pulse 1.4s ease-in-out infinite' : 'none',
              }}
            />
            {statusLabel}
          </span>
          {(dataset.metadata?.file_count ?? 0) > 0 && (
            <span style={{ fontSize: 10, color: MC.textMuted }}>
              {dataset.metadata!.file_count!.toLocaleString()} files
            </span>
          )}
          <span style={{ fontSize: 10, color: MC.textMuted }}>info</span>
        </div>

        {/* Browse items button — for multi-file ready datasets */}
        {hasMultipleFiles && dataset.status === 'ready' && (
          <button
            onClick={() => openItemsPanel(dataset.id)}
            title="Browse individual items"
            style={{
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: MC.accent,
              cursor: 'pointer',
              borderRadius: 3,
              flexShrink: 0,
              opacity: 0.7,
            }}
          >
            <FileImage size={11} />
          </button>
        )}

        {/* Remove button */}
        {onRemove && (
          confirmRemove ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => { onRemove(); setConfirmRemove(false); }}
                title="Confirm remove"
                style={{
                  height: 18,
                  padding: '0 6px',
                  borderRadius: 3,
                  border: 'none',
                  background: MC.danger,
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Remove
              </button>
              <button
                onClick={() => setConfirmRemove(false)}
                title="Cancel"
                style={{
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 3,
                  border: `1px solid ${MC.border}`,
                  background: 'transparent',
                  color: MC.textMuted,
                  fontSize: 9,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRemove(true)}
              title="Remove from map"
              style={{
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: MC.textMuted,
                cursor: 'pointer',
                borderRadius: 3,
                flexShrink: 0,
                opacity: 0.6,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.color = MC.danger; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'; (e.currentTarget as HTMLButtonElement).style.color = MC.textMuted; }}
            >
              <Trash2 size={11} />
            </button>
          )
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
