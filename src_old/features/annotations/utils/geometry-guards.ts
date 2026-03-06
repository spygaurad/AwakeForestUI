// src/features/annotations/utils/geometry-guards.ts

import type {
  AnnotationGeometry,
  PointGeometry,
  BBoxGeometry,
  PolygonGeometry,
} from '@/features/annotations/types';

/**
 * Check if geometry is a Point
 */
export function isPointGeometry(
  geometry: AnnotationGeometry | undefined
): geometry is PointGeometry {
  return geometry?.type === 'Point';
}

/**
 * Check if geometry is a bounding box polygon (5 points, rectangle)
 */
export function isBBoxGeometry(
  geometry: AnnotationGeometry | undefined
): geometry is BBoxGeometry {
  if (!geometry || geometry.type !== 'Polygon') return false;
  const coords = geometry.coordinates[0];
  if (!coords || coords.length !== 5) return false;

  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const uniqueLngs = new Set(lngs);
  const uniqueLats = new Set(lats);

  return uniqueLngs.size === 2 && uniqueLats.size === 2;
}

/**
 * Check if geometry is a Polygon but NOT a bounding box polygon
 */
export function isPolygonGeometry(
  geometry: AnnotationGeometry | undefined
): geometry is PolygonGeometry {
  return geometry?.type === 'Polygon' && !isBBoxGeometry(geometry);
}
