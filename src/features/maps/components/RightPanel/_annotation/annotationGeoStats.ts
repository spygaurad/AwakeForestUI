/**
 * Pure geometry computation functions for annotation shape stats.
 * No React, no Zustand — fully unit-testable.
 */

import type { DrawTool } from '@/stores/mapStore';
import type { GeoJSONGeometry } from '@/types/geo';

export interface GeomStat {
  label: string;
  value: string;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/** Haversine distance between two [lat, lng] points in metres. */
export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Spherical polygon area via Gauss-Bonnet. Ring coords are GeoJSON [lng, lat]. */
export function sphericalAreaM2(ring: [number, number][]): number {
  const R = 6371000;
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n - 1; i++) {
    const lon1 = (ring[i][0] * Math.PI) / 180;
    const lat1 = (ring[i][1] * Math.PI) / 180;
    const lon2 = (ring[i + 1][0] * Math.PI) / 180;
    const lat2 = (ring[i + 1][1] * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((area * R * R) / 2);
}

/** Forward azimuth (bearing) from `from` to `to` in degrees [0, 360). */
export function bearingDeg(from: [number, number], to: [number, number]): number {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtLen(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m).toLocaleString()} m`;
}

export function fmtArea(m2: number): string {
  return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2).toLocaleString()} m²`;
}

export function fmtCoord(deg: number, axis: 'lat' | 'lng'): string {
  const abs = Math.abs(deg);
  const dir = axis === 'lat' ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  return `${abs.toFixed(6)}° ${dir}`;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function compassDir(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8];
}

// ── Main export ───────────────────────────────────────────────────────────────

/** Compute display stats for a drawn geometry. Returns [] when nothing useful to show. */
export function computeGeometryStats(
  shapeType: DrawTool | null,
  geometry: GeoJSONGeometry | null,
  circleRadius: number | null,
): GeomStat[] {
  if (!geometry) return [];

  if (shapeType === 'point' && geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return [
      { label: 'Latitude',  value: fmtCoord(lat, 'lat') },
      { label: 'Longitude', value: fmtCoord(lng, 'lng') },
    ];
  }

  if (shapeType === 'circle' && circleRadius !== null && geometry.type === 'Polygon') {
    const r = circleRadius;
    const [lng, lat] = geometry.coordinates[0][0];
    return [
      { label: 'Radius',   value: fmtLen(r) },
      { label: 'Diameter', value: fmtLen(r * 2) },
      { label: 'Area',     value: fmtArea(Math.PI * r * r) },
      { label: 'Center',   value: `${fmtCoord(lat, 'lat')}, ${fmtCoord(lng, 'lng')}` },
    ];
  }

  if (shapeType === 'polyline' && geometry.type === 'LineString') {
    const coords = geometry.coordinates;
    let len = 0;
    for (let i = 1; i < coords.length; i++) {
      len += haversineM([coords[i - 1][1], coords[i - 1][0]], [coords[i][1], coords[i][0]]);
    }
    const stats: GeomStat[] = [
      { label: 'Length',   value: fmtLen(len) },
      { label: 'Vertices', value: `${coords.length}` },
    ];
    if (coords.length === 2) {
      const deg = bearingDeg([coords[0][1], coords[0][0]], [coords[1][1], coords[1][0]]);
      stats.push({ label: 'Bearing', value: `${deg.toFixed(1)}° ${compassDir(deg)}` });
    }
    return stats;
  }

  if ((shapeType === 'polygon' || shapeType === 'rectangle') && geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0];
    const area = sphericalAreaM2(ring);
    let perimeter = 0;
    for (let i = 1; i < ring.length; i++) {
      perimeter += haversineM([ring[i - 1][1], ring[i - 1][0]], [ring[i][1], ring[i][0]]);
    }
    const stats: GeomStat[] = [
      { label: 'Area',      value: fmtArea(area) },
      { label: 'Perimeter', value: fmtLen(perimeter) },
      { label: 'Vertices',  value: `${ring.length - 1}` },
    ];
    if (shapeType === 'rectangle' && ring.length >= 4) {
      const h = haversineM([ring[0][1], ring[0][0]], [ring[1][1], ring[1][0]]);
      const w = haversineM([ring[1][1], ring[1][0]], [ring[2][1], ring[2][0]]);
      stats.push({ label: 'N–S span', value: fmtLen(Math.min(h, w)) });
      stats.push({ label: 'E–W span', value: fmtLen(Math.max(h, w)) });
    }
    return stats;
  }

  return [];
}
