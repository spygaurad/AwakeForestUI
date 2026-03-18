'use client';

import { LayerItem } from './LayerItem';
import { MC } from '../../mapColors';

export interface AnnotationLayerItemProps {
  label: string;
  count: number;
}

export function AnnotationLayerItem({ label, count }: AnnotationLayerItemProps) {
  const layerId = `annotation-${label}`;

  return (
    <div>
      <LayerItem id={layerId} name={label} type="annotation" />
      <div style={{ paddingLeft: 44, paddingBottom: 2 }}>
        <span
          style={{
            fontSize: 10,
            color: MC.textMuted,
            background: MC.hoverBg,
            border: `1px solid ${MC.border}`,
            borderRadius: 10,
            padding: '0 5px',
            lineHeight: '16px',
          }}
        >
          {count} annotation{count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
