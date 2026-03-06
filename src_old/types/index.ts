import type { Geometry as GeoJSONGeometry } from 'geojson';

type Brand<K, T> = K & { __brand: T };

/** Branded ID types for stronger typing (UUID strings) */
export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type DatasetId = Brand<string, 'DatasetId'>;
export type DatasetItemId = Brand<string, 'DatasetItemId'>;
export type AnnotationId = Brand<string, 'AnnotationId'>;
export type PredictionId = Brand<string, 'PredictionId'>;
export type ModelId = Brand<string, 'ModelId'>;
export type JobId = Brand<string, 'JobId'>;

// Shared geometry types
// export type GeoJSONType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

// export interface Geometry {
//   type: GeoJSONType;
//   coordinates: number[] | number[][] | number[][][] | number[][][][];
// }

// Re-export or alias to unify your Geometry type with GeoJSON
export type Geometry = GeoJSONGeometry;

// Optionally export GeoJSONType if you need it
export type GeoJSONType = GeoJSONGeometry['type'];

// Auth types (used globally)
export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface TiffFile {
  name: string;
  url: string;
  bounds?: [number, number, number, number];
  width?: number;
  height?: number;
}

export interface Patch {
  id: string;
  row: number;
  col: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  centerLat: number;
  centerLon: number;
}

export interface PatchMetadata {
  numRows: number;
  numCols: number;
  totalPatches: number;
  patchWidthDeg: number;
  patchHeightDeg: number;
  tiffBounds: [number, number, number, number] | null;
}
