import { DatasetId, DatasetItemId, OrganizationId, UserId, Geometry } from '@/types';

export enum DatasetStatus {
  Pending = 'pending',
  Processing = 'processing',
  Ready = 'ready',
  Failed = 'failed',
}

export interface Dataset {
  id: DatasetId;
  name: string;
  description?: string;
  storage_path: string;
  bounds?: Geometry;
  crs?: string;
  status: DatasetStatus;
  file_size?: number;
  organization_id: OrganizationId;
  uploaded_by: UserId;
  created_at: string;
  updated_at: string;
}

export interface DatasetItem {
  id: DatasetItemId;
  dataset_id: DatasetId;
  key: string;
  uri: string;
  mime_type: string;
  size_bytes?: number;
  crs?: string;
  bounds?: Geometry;
  meta?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  presigned_url?: string;
}

export interface DatasetCreate {
  name: string;
  description?: string;
  organization_id: string;
  storage_path: string;
}

export interface DatasetUpdate {
  name?: string;
  description?: string;
}
