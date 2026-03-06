// features/annotations/types/index.ts

import type { Geometry } from '@/types';
import { AnnotationId, DatasetId, DatasetItemId, ProjectId, UserId } from '@/types';

// ============================================
// ENUMS
// ============================================

export type OverlayType = 'predictions' | 'heatmap' | 'segmentation' | 'custom';
export type HeatmapType = 'density' | 'confidence';

export interface OverlayConfig {
  id: OverlayType;
  label: string;
  enabled: boolean;
  color?: string;
  opacity?: number;
}

export enum AnnotationSource {
  Human = 'human',
  Model = 'model',
}

// ============================================
// API TYPES (Backend schema)
// ============================================

export interface AnnotationProperties {
  display_label?: string;
  color?: string;
  bounds?: [number, number, number, number];
  area?: number;
  [key: string]: unknown;
}

export interface Annotation {
  id: AnnotationId;
  geometry: Geometry;
  annotation_type: 'point' | 'line' | 'polygon';
  class_label: string;
  source: AnnotationSource;
  properties?: AnnotationProperties;
  dataset_id: DatasetId;
  dataset_item_id: DatasetItemId;
  project_id: ProjectId;
  created_by?: UserId;
  created_at: string;
  updated_at: string;
}

export interface AnnotationCreate {
  geometry: Geometry;
  annotation_type: 'point' | 'line' | 'polygon';
  class_label: string;
  source: AnnotationSource;
  properties?: AnnotationProperties;
  dataset_id: string;
  dataset_item_id: string;
  project_id: string;
}

export interface AnnotationUpdate {
  geometry?: Geometry;
  class_label?: string;
  properties?: AnnotationProperties;
}

// ============================================
// UI-LEVEL TYPES
// ============================================

export type Position = [longitude: number, latitude: number];
export type AnnotationType = 'point' | 'bbox' | 'polygon';

// ============================================
// GEOMETRY TYPES (UI Layer)
// ============================================

export interface PointGeometry {
  type: 'Point';
  coordinates: Position;
}

export interface BBoxGeometry {
  type: 'Polygon';
  coordinates: [Position[]];  // 5-point closed rectangle
  bbox?: [number, number, number, number];  // Optional: cache bounds
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export type AnnotationGeometry = PointGeometry | BBoxGeometry | PolygonGeometry;

// ============================================
// TYPE GUARDS
// ============================================

export function isPointGeometry(geometry: AnnotationGeometry): geometry is PointGeometry {
  return geometry.type === 'Point';
}

export function isBBoxGeometry(geometry: AnnotationGeometry): geometry is BBoxGeometry {
  if (geometry.type !== 'Polygon') return false;
  const coords = geometry.coordinates[0];
  // Bbox has exactly 5 points (closed rectangle)
  if (coords.length !== 5) return false;
  // Check if it's a rectangle (all corners have only 2 unique x and 2 unique y values)
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const uniqueLngs = [...new Set(lngs)];
  const uniqueLats = [...new Set(lats)];
  return uniqueLngs.length === 2 && uniqueLats.length === 2;
}

export function isPolygonGeometry(geometry: AnnotationGeometry): geometry is PolygonGeometry {
  return geometry.type === 'Polygon' && !isBBoxGeometry(geometry);
}

// ============================================
// ANNOTATION CLASSES / LABELS
// ============================================

export interface AnnotationClass {
  id: string;
  name: string;
  color: string;
}

// Label type for the new label system
export interface Label {
  id: string;
  name: string;
  color: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// export interface UIAnnotation {
//   id: string;  // Can be API ID or temp ID (e.g., "temp-123" for unsaved)
//   geometry: AnnotationGeometry;
//   annotationType: AnnotationType;
//   classLabel?: string;
//   displayLabel: string;
//   properties?: AnnotationProperties;
//   isSaved: boolean;  // Track if it's persisted or just drawn
//   isSelected?: boolean;  // For UI highlighting
//   isVisible?: boolean;   // For layer toggling
  
// }

export type UncompressedRLE = {
  /** [height, width] */
  size: [number, number];
  /**
   * Uncompressed COCO-style RLE counts (run lengths).
   * Starts with background run, then alternates background/foreground [web:22].
   */
  counts: number[];
};

// ============================================
// POSE/KEYPOINT TYPES (Crown Detection)
// ============================================

export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
  index: number;
  name: string;
}

/** COCO skeleton connections for pose visualization */
export const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2],           // nose to eyes
  [1, 3], [2, 4],           // eyes to ears
  [5, 6],                   // shoulders
  [5, 7], [7, 9],           // left arm
  [6, 8], [8, 10],          // right arm
  [5, 11], [6, 12],         // torso
  [11, 12],                 // hips
  [11, 13], [13, 15],       // left leg
  [12, 14], [14, 16],       // right leg
];

/** Keypoint names in COCO format */
export const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
] as const;

export interface UIAnnotation {
  id: string;
  geometry: AnnotationGeometry; // GeoJSON compatibility
  annotationType: AnnotationType;
  classLabel?: string;  // Deprecated: use labelId instead
  labelId?: string;     // NEW: ID reference to Label object
  displayLabel: string;
  properties?: AnnotationProperties;
  isSaved: boolean;
  isSelected?: boolean;
  isVisible?: boolean;

  // --- Detection (optional) ---
  /** Pixel bbox [minX, minY, maxX, maxY] */
  pixelBbox?: [number, number, number, number];

  /** Model confidence */
  confidence?: number;

  // --- Segmentation (optional) ---
  /** Uncompressed RLE mask for JS decoding (optimized vs 2D array) [web:22] */
  segmentationRLE?: UncompressedRLE;

  // --- Pose/Keypoints (optional, for crown detection) ---
  /** Array of keypoints for pose/skeleton visualization */
  keypoints?: Keypoint[];
}


export interface TiffProps {
  tiffUrl: string;
  bounds: [number, number, number, number];
  annotations: UIAnnotation[];  // Can be saved or unsaved
  annotationClasses: AnnotationClass[];
  activeGeometry: AnnotationType;
  selectedAnnotationId: string | null;
  onAnnotationCreated: (geometry: AnnotationGeometry, annotationType: AnnotationType) => void;
  onAnnotationSelected: (id: string | null) => void;
  onAnnotationUpdated?: (id: string, updates: Partial<UIAnnotation>) => void;  // For editing
  onGeometryChange: (type: AnnotationType) => void;
}

export interface AnnotationSidebarProps {
  annotations: UIAnnotation[];
  annotationClasses: AnnotationClass[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateClass: (id: string, classId: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddClass: (name: string, color: string) => void;
  onToggleVisibility?: (id: string) => void;  // For showing/hiding layers
}

export interface AnnotationLayerProps {
  annotations: UIAnnotation[];
  selectedId?: string | null;
  onAnnotationClick?: (id: string) => void;
  onAnnotationHover?: (id: string | null) => void;
  showLabels?: boolean;
}

// ============================================
// GEOMETRY HELPER FUNCTIONS
// ============================================

export function createBBoxGeometry(
  west: number,
  south: number,
  east: number,
  north: number
): BBoxGeometry {
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south]
    ]],
    bbox: [west, south, east, north]
  };
}

export function extractBounds(
  geometry: AnnotationGeometry
): { minx: number; miny: number; maxx: number; maxy: number } | null {
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return { minx: lng, miny: lat, maxx: lng, maxy: lat };
  }
  
  if ('bbox' in geometry && geometry.bbox) {
    const [minx, miny, maxx, maxy] = geometry.bbox;
    return { minx, miny, maxx, maxy };
  }
  
  const coords = geometry.coordinates[0];
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return {
    minx: Math.min(...lngs),
    miny: Math.min(...lats),
    maxx: Math.max(...lngs),
    maxy: Math.max(...lats)
  };
}

export function createPointGeometry(lng: number, lat: number): PointGeometry {
  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
}

export function createPolygonGeometry(coordinates: Position[][]): PolygonGeometry {
  return {
    type: 'Polygon',
    coordinates
  };
}

// ============================================
// CONVERSION HELPERS (API ↔ UI)
// ============================================

/**
 * Convert API annotation to UI format
 * Used when loading saved annotations from backend
 */

// export function toUIAnnotation(
//   apiAnnotation: Annotation,
//   index: number
// ): UIAnnotation {
//   let annotationType: AnnotationType;
//   if (apiAnnotation.geometry.type === 'Point') {
//     annotationType = 'point';
//   } else if (apiAnnotation.annotation_type === 'polygon') {
//     annotationType = 'polygon';
//   } else {
//     annotationType = 'bbox';
//   }

//   return {
//     id: apiAnnotation.id,
//     geometry: apiAnnotation.geometry as AnnotationGeometry,
//     annotationType,
//     classLabel: apiAnnotation.class_label,
//     displayLabel: (apiAnnotation.properties?.display_label as string) ?? `Ann${index + 1}`,
//     properties: apiAnnotation.properties,
//     isSaved: true,  // Came from API
//     isVisible: true,
//   };
// }

/**
 * Create a new unsaved UI annotation (for drawing)
 */
export function createUIAnnotation(
  geometry: AnnotationGeometry,
  annotationType: AnnotationType,
  displayLabel: string
): UIAnnotation {
  return {
    id: `temp-${Date.now()}-${Math.random()}`,
    geometry,
    annotationType,
    displayLabel,
    isSaved: false,  // Not yet saved
    isVisible: true,
  };
}

/**
 * Convert UI annotation to API format for saving
 */
// export function toAPIAnnotation(
//   uiAnnotation: UIAnnotation,
//   datasetId: string,
//   datasetItemId: string,
//   projectId: string
// ): AnnotationCreate {
//   return {
//     geometry: uiAnnotation.geometry as Geometry,
//     annotation_type: uiAnnotation.annotationType === 'bbox' ? 'polygon' : uiAnnotation.annotationType,
//     class_label: uiAnnotation.classLabel || 'Object',
//     source: AnnotationSource.Human,
//     properties: {
//       ...uiAnnotation.properties,
//       display_label: uiAnnotation.displayLabel,
//     },
//     dataset_id: datasetId,
//     dataset_item_id: datasetItemId,
//     project_id: projectId,
//   };
// }

// ============================================
// ANNOTATION UTILITIES
// ============================================

export function getAnnotationStats(annotations: UIAnnotation[]) {
  return {
    total: annotations.length,
    saved: annotations.filter(a => a.isSaved).length,
    unsaved: annotations.filter(a => !a.isSaved).length,
    labeled: annotations.filter(a => a.classLabel).length,
    unlabeled: annotations.filter(a => !a.classLabel).length,
    byType: {
      point: annotations.filter(a => a.annotationType === 'point').length,
      bbox: annotations.filter(a => a.annotationType === 'bbox').length,
      polygon: annotations.filter(a => a.annotationType === 'polygon').length,
    }
  };
}

/**
 * Filter annotations by type for layer visualization
 */
export function filterAnnotationsByType(
  annotations: UIAnnotation[],
  types: AnnotationType[]
): UIAnnotation[] {
  return annotations.filter(a => types.includes(a.annotationType));
}

/**
 * Get only visible annotations for rendering
 */
export function getVisibleAnnotations(annotations: UIAnnotation[]): UIAnnotation[] {
  return annotations.filter(a => a.isVisible !== false);
}
