// features/jobs/api/jobs-api.ts

import { apiClient } from '@/lib/api-client';
import type { Job as JobType } from '@/features/jobs/types';

export const jobsApi = {
  list: async (params?: { dataset_id?: string; project_id?: string; status?: string }) => {
    return apiClient.get<JobType[]>('/jobs', { params });
  },

  get: async (id: string) => {
    return apiClient.get<JobType>(`/jobs/${id}`);
  },

  create: async (data: {
    job_type: string;
    dataset_id: string;
    project_id: string;
    ml_model_id?: string;
  }) => {
    return apiClient.post<JobType>('/jobs', data);
  },
};
