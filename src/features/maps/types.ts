export type LayerType = 'dataset' | 'annotation' | 'tracking' | 'alert';

export interface LayerStyle {
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  radius: number;
  dashArray?: string;
}

export const DEFAULT_ANNOTATION_STYLE: LayerStyle = {
  color: '#c4985c',
  fillColor: '#c4985c',
  fillOpacity: 0.3,
  weight: 2,
  radius: 6,
};

export const DEFAULT_TRACKING_STYLE: LayerStyle = {
  color: '#6bcc6b',
  fillColor: '#6bcc6b',
  fillOpacity: 0.7,
  weight: 2,
  radius: 8,
};

export const DEFAULT_ALERT_STYLE: LayerStyle = {
  color: '#e05c5c',
  fillColor: '#e05c5c',
  fillOpacity: 0.6,
  weight: 2,
  radius: 10,
};

export const DEFAULT_DATASET_STYLE: LayerStyle = {
  color: '#5c8ce0',
  fillColor: '#5c8ce0',
  fillOpacity: 0.1,
  weight: 1.5,
  radius: 6,
};

export interface LayerConfig {
  id: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  style: LayerStyle;
}

export interface SelectedFeature {
  layerType: LayerType;
  /** Registry key — e.g. 'annotation-polygon', 'tracking', 'alert' */
  featureType: string;
  featureId: string;
  properties: Record<string, unknown>;
  latlng: [number, number];
  /** Reference to the actual Leaflet layer for live-style updates via registry applyUpdate */
  layerRef?: unknown;
}

// 'new-annotation' = user just drew a shape via Geoman, right panel shows attribute form
// 'measurement'    = measurement tool is active, right panel shows live segment data
export type RightPanelMode = 'none' | 'feature' | 'style' | 'new-annotation' | 'measurement';

export interface PendingAnnotation {
  label: string;
  description: string;
  style: LayerStyle;
  attributes: { key: string; value: string }[];
}
