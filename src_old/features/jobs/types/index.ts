
import { JobId, ModelId, DatasetId, ProjectId, UserId, DatasetItemId } from '@/types';

export enum JobStatus {
  Queued = 'queued',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum JobType {
  Inference = 'inference',
  Upload = 'upload',
  Export = 'export',
}

export interface Job {
  id: JobId;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  params?: Record<string, unknown>;
  ml_model_id?: ModelId;
  dataset_id: DatasetId;
  project_id: ProjectId;
  created_by: UserId;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobItem {
  id: string;
  job_id: JobId;
  dataset_item_id: DatasetItemId;
  status: JobStatus;
  progress: number;
  result?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
