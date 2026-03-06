import { apiClient } from './client';
import type { Job, JobStatus, JobType } from '@/types/common';
import type { PaginatedResponse } from '@/types/common';

interface JobListParams {
  org_id: string;
  status?: JobStatus;
  job_type?: JobType;
  page?: number;
  page_size?: number;
}

export const jobsApi = {
  list: (params: JobListParams) =>
    apiClient
      .get('jobs', { searchParams: params as unknown as Record<string, string | number> })
      .json<PaginatedResponse<Job>>(),

  get: (id: string) =>
    apiClient.get(`jobs/${id}`).json<Job>(),

  cancel: (id: string) =>
    apiClient.patch(`jobs/${id}/cancel`).json<Job>(),
};
