import type { GeoJSONGeometry } from './geo';

// --- Organizations & Users ---
export interface Organization {
  id: string;
  clerk_org_id: string;
  name: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
}

// --- Projects ---
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  user: Pick<User, 'id' | 'email' | 'name'>;
}

// --- Datasets ---
export type DatasetStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Dataset {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  stac_collection_id: string | null;
  source_uri: string;
  status: DatasetStatus;
  item_count: number;
  spatial_extent: GeoJSONGeometry | null;
  temporal_extent_start: string | null;
  temporal_extent_end: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DatasetItem {
  id: string;
  dataset_id: string;
  stac_item_id: string;
  stac_collection_id: string;
  geometry: GeoJSONGeometry;
  datetime: string;
  properties_cache: Record<string, unknown>;
}

export type DatasetRelationshipType =
  | 'derived_from'
  | 'supersedes'
  | 'supplements'
  | 'same_area_different_sensor'
  | 'temporal_continuation';

// --- Annotations ---
export type AnnotationStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type AnnotationSource = 'manual' | 'model' | 'import';
export type AnnotationChangeType = 'create' | 'update' | 'delete' | 'bulk_update';

export interface Annotation {
  id: string;
  organization_id: string;
  dataset_item_id: string;
  geometry: GeoJSONGeometry;
  pixel_coords: Record<string, unknown> | null;
  label: string;
  confidence: number | null;
  source: AnnotationSource;
  track_id: string | null;
  status: AnnotationStatus;
  version: number;
  is_current: boolean;
  parent_version_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnnotationVersion {
  id: string;
  annotation_id: string;
  version: number;
  geometry: GeoJSONGeometry;
  label: string;
  confidence: number | null;
  change_type: AnnotationChangeType;
  changed_by: string | null;
  created_at: string;
}

export interface LabelSchema {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  labels: { name: string; color: string; description?: string }[];
  created_at: string;
}

// --- Tracking ---
export type ObjectType =
  | 'deforestation_front'
  | 'fire_perimeter'
  | 'building'
  | 'water_body'
  | 'custom';
export type TrackedObjectStatus = 'active' | 'resolved' | 'archived' | 'merged';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface TrackedObject {
  id: string;
  organization_id: string;
  project_id: string;
  object_type: ObjectType;
  status: TrackedObjectStatus;
  priority: Priority;
  severity: 'critical' | 'warning' | 'info';
  confidence_score: number | null;
  merged_into_id: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  observation_count: number;
  latest_geometry: GeoJSONGeometry | null;
  alert_threshold: Record<string, unknown>;
  created_at: string;
}

export interface TrackedObjectObservation {
  id: string;
  tracked_object_id: string;
  annotation_id: string | null;
  stac_item_id: string | null;
  observation_datetime: string;
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
  sensor: string | null;
}

// --- ML Models ---
export type ModelType = 'detection' | 'segmentation' | 'classification';

export interface MLModel {
  id: string;
  organization_id: string;
  name: string;
  type: ModelType;
  version: string;
  artifact_uri: string;
  config: Record<string, unknown>;
  created_at: string;
}

// --- Alerts ---
export type AlertType =
  | 'area_change'
  | 'ndvi_drop'
  | 'new_detection'
  | 'boundary_breach'
  | 'threshold_exceeded';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  organization_id: string;
  tracked_object_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  geometry: GeoJSONGeometry;
  trigger_data: Record<string, unknown>;
  status: AlertStatus;
  stac_item_id: string | null;
  created_at: string;
}

export interface AlertSubscription {
  id: string;
  organization_id: string;
  user_id: string;
  aoi_geometry: GeoJSONGeometry;
  object_types: ObjectType[];
  min_severity: AlertSeverity;
  channels: { email?: string[]; webhook?: string[] };
  cooldown_minutes: number;
  last_notified_at: string | null;
  created_at: string;
}

// --- Basemaps & Bookmarks ---
export type LayerType = 'vector' | 'raster_tile' | 'xyz_tile' | 'wms' | 'geojson';

export interface BasemapLayer {
  id: string;
  organization_id: string;
  name: string;
  layer_type: LayerType;
  url: string;
  attribution: string | null;
  config: Record<string, unknown>;
  created_at: string;
}

export interface SpatialBookmark {
  id: string;
  organization_id: string;
  name: string;
  center: GeoJSONGeometry; // Point
  zoom: number;
  bearing: number;
  pitch: number;
  visible_layers: string[];
  filters: Record<string, unknown>;
  created_at: string;
}

// --- API Keys ---
export interface ApiKey {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  key_prefix: string; // first 8 chars only — never full key
  permissions: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  plaintext_key: string; // returned ONCE on creation only
}

// --- Audit Log ---
export interface AuditLogEntry {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}
