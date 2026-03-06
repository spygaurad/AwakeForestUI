// src/features/annotations/utils/geometry-converter.ts
import type { Geometry } from '@/types';
import type {
  AnnotationGeometry,
  PointGeometry,
  BBoxGeometry,
  PolygonGeometry,
  Position,
} from '@/features/annotations/types';

/** Convert GeoJSON Position (number[]) to strict Position tuple [lng, lat] */
function toPosition(pos: number[]): Position {
  if (!Array.isArray(pos) || pos.length < 2) {
    throw new Error('Invalid GeoJSON position');
  }
  return [pos[0], pos[1]];
}

/** Convert GeoJSON Geometry to strict AnnotationGeometry recursively */
export function toAnnotationGeometry(geom: Geometry): AnnotationGeometry {
  switch (geom.type) {
    case 'Point':
      return {
        type: 'Point',
        coordinates: toPosition(geom.coordinates),
      };

    case 'Polygon':
      // Polygon coordinates: array of linear rings
      return {
        type: 'Polygon',
        // Map each ring coords array to Position tuples
        coordinates: geom.coordinates.map((ring) =>
          ring.map(toPosition)
        ),
      };

    // Add more cases for MultiPoint, MultiPolygon, etc. as needed

    default:
      throw new Error(`Unsupported geometry type: ${geom.type}`);
  }
}
