export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
}

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobType =
  | 'ingest'
  | 'inference'
  | 'bulk_annotate'
  | 'bulk_delete'
  | 'bulk_update'
  | 'analysis'
  | 'export'
  | 'relationship_discovery';

export interface Job {
  id: string;
  organization_id: string;
  job_type: JobType;
  status: JobStatus;
  progress: number; // 0.0–1.0
  total_items: number | null;
  processed_items: number;
  failed_items: number;
  input_params: Record<string, unknown>;
  output_summary: Record<string, unknown> | null;
  celery_task_id: string | null;
  parent_job_id: string | null;
  priority: number;
  error: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ErrorDetail {
  detail: string;
}
