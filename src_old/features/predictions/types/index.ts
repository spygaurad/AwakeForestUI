// features/predictions/types/index.ts

import { Geometry, PredictionId, ModelId, DatasetId, DatasetItemId, JobId } from '@/types';

export enum PredictionStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export interface PredictionProperties {
  display_label?: string;
  color?: string;
  bounds?: [number, number, number, number];
  width?: number;
  height?: number;
  tile_x?: number;
  tile_y?: number;
  local_center_x?: number;
  local_center_y?: number;
  global_x?: number;
  global_y?: number;
  item_name?: string;
  raw_box?: number[];
  mask_stats?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Prediction {
  id: PredictionId;
  geometry: Geometry;
  prediction_type: 'point' | 'line' | 'polygon';
  class_label: string;
  confidence_score: number;
  properties?: PredictionProperties;
  ml_model_id: ModelId;
  dataset_id: DatasetId;
  dataset_item_id: DatasetItemId;
  job_id: JobId;
  status: PredictionStatus;
  created_at: string;
}

export interface PredictionUpdate {
  status?: PredictionStatus;
  properties?: PredictionProperties;
}
