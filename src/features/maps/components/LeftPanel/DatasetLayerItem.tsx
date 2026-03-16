'use client';

import { LayerItem } from './LayerItem';
import type { Dataset } from '@/types/api';
import { MC } from '../../mapColors';

const STATUS_COLORS: Record<string, string> = {
  completed: MC.success,
  running:   MC.warning,
  pending:   MC.textMuted,
  failed:    MC.danger,
};

export interface DatasetLayerItemProps {
  dataset: Dataset;
}

export function DatasetLayerItem({ dataset }: DatasetLayerItemProps) {
  const statusColor = STATUS_COLORS[dataset.status] ?? MC.textMuted;

  return (
    <div>
      <LayerItem id={dataset.id} name={dataset.name} type="dataset" />
      {/* Status badge row */}
      <div
        style={{
          paddingLeft: 44,
          paddingBottom: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
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
            }}
          />
          {dataset.status}
        </span>
        {dataset.item_count > 0 && (
          <span style={{ fontSize: 10, color: MC.textMuted }}>
            {dataset.item_count.toLocaleString()} items
          </span>
        )}
      </div>
    </div>
  );
}
