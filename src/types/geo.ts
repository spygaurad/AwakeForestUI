export type GeoJSONGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
  | { type: 'LineString'; coordinates: [number, number][] };

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}
