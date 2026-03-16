'use client';

import type { DrawTool } from '@/stores/mapStore';
import type { GeoJSONGeometry } from '@/types/geo';
import { MC } from '../../../mapColors';
import { computeGeometryStats } from './annotationGeoStats';

const SHAPE_LABELS: Partial<Record<DrawTool, string>> = {
  point:     'Point',
  circle:    'Circle',
  polyline:  'Line',
  polygon:   'Polygon',
  rectangle: 'Rectangle',
};

export interface AnnotationGeometryPreviewProps {
  shapeType: DrawTool | null;
  geometry: GeoJSONGeometry | null;
  circleRadius: number | null;
}

/**
 * Displays computed geometry statistics (area, perimeter, coordinates, etc.)
 * for the currently drawn annotation shape. Returns null when there are no
 * stats to show (e.g. before a shape is drawn).
 */
export function AnnotationGeometryPreview({
  shapeType,
  geometry,
  circleRadius,
}: AnnotationGeometryPreviewProps) {
  const stats = computeGeometryStats(shapeType, geometry, circleRadius);
  if (stats.length === 0) return null;

  const title = shapeType ? (SHAPE_LABELS[shapeType] ?? 'Geometry') : 'Geometry';

  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: `1px solid ${MC.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: MC.sectionLabel,
      }}>
        {title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {stats.map(({ label, value }) => (
          <div key={label}>
            <div style={{
              fontSize: 10,
              color: MC.sectionLabel,
              marginBottom: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {label}
            </div>
            <div style={{
              fontSize: 12,
              color: MC.text,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              wordBreak: 'break-all',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
