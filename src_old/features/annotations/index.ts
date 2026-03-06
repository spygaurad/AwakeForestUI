// features/annotations/index.ts

// ============================================
// TYPES
// ============================================
export type {
  // API Types
  Annotation,
  AnnotationCreate,
  AnnotationUpdate,
  AnnotationProperties,

  // UI Types
  UIAnnotation,
  AnnotationClass,
  AnnotationType,
  AnnotationGeometry,
  PointGeometry,
  BBoxGeometry,
  PolygonGeometry,
  Position,
  Label,

  // Component Props
  TiffProps,
  AnnotationSidebarProps,
  AnnotationLayerProps,
} from './types';

// Export enum as value (not type)
export { AnnotationSource } from './types';

// Export utility functions
export {
  // Type guards
  isPointGeometry,
  isBBoxGeometry,
  isPolygonGeometry,
  
  // Geometry helpers
  createBBoxGeometry,
  createPointGeometry,
  createPolygonGeometry,
  extractBounds,
  // Conversion helpers
  createUIAnnotation,
  // Utilities
  getAnnotationStats,
  filterAnnotationsByType,
  getVisibleAnnotations,
  


} from './types';
export type { OverlayConfig, OverlayType } from './types';

// ============================================
// COMPONENTS
// ============================================
export { default as AnnotationEditor } from './components/AnnotationEditor';
export { default as AnnotationPatchEditor } from './components/AnnotationPatchEditor';
export { default as AnnotationInspectorSidebar } from './components/AnnotationInspectorSidebar';
export { default as AnnotationNavSidebar } from './components/AnnotationNavSidebar';

// ============================================
// HOOKS
// ============================================
export { useAnnotations } from './hooks/use-annotations';
export { useTiffMetadata } from './hooks/use-tiff-metadata';
export { useAnnotationEditor } from './hooks/use-annotation-editor';
export { useAnnotationClasses } from './hooks/use-annotation-classes';
export { useOverlayManager } from './hooks/use-overlay-manager';
export { useFileAnnotations } from './hooks/use-file-annotations';

// ============================================
// UTILS
// ============================================
export {toUIAnnotation, toAPIAnnotation} from './utils/annotation-converters';
export {getTileBbox, worldToPatchPixel} from './utils/coordinate-converter';