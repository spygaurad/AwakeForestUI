import { apiClient } from './client';
import { EP } from './endpoints';
import type { Job } from '@/types/common';

export const jobsApi = {
  /**
   * Poll a single job's status. This is the only job endpoint the backend exposes.
   * For a list of in-flight jobs, use jobStore (Zustand) which tracks job IDs
   * client-side after each 202 response.
   */
  get: (id: string) =>
    apiClient.get(EP.jobs.detail(id)).json<Job>(),
};
