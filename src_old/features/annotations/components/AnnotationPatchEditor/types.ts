// types/annotations.ts

export type AnnotationTool = 'select' | 'point' | 'box' | 'polygon' | 'brush' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: string;
  label?: string;
  color: string;
  confidence?: number;
  source: 'manual' | 'model';
  visible: boolean;
  locked: boolean;
  createdAt: number;
}

export interface PointAnnotation extends BaseAnnotation {
  type: 'point';
  point: Point;
}

export interface BoxAnnotation extends BaseAnnotation {
  type: 'box';
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PolygonAnnotation extends BaseAnnotation {
  type: 'polygon';
  points: Point[];
  closed: boolean;
}

export interface MaskAnnotation extends BaseAnnotation {
  type: 'mask';
  // Store as RLE or raw pixel data
  maskData: number[] | ImageData;
  bounds: { x: number; y: number; width: number; height: number };
}

export type Annotation = PointAnnotation | BoxAnnotation | PolygonAnnotation | MaskAnnotation;

export interface AnnotationState {
  annotations: Annotation[];
  selectedIds: string[];
  activeTool: AnnotationTool;
  activeColor: string;
  activeLabel: string;
  isDrawing: boolean;
  tempPoints: Point[];
}

// Color palette for annotations
export const ANNOTATION_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEAA7', // Soft Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Sunflower
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
] as const;

// Generate a unique ID
export function generateId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}