import { apiClient } from './client';
import type { JobResponse } from '@/types/common';

export const inferenceApi = {
  run: (data: {
    model_id: string;
    dataset_id: string;
    confidence_threshold: number;
    item_ids?: string[]; // if empty, runs on all items
  }) =>
    apiClient.post('inference', { json: data }).json<JobResponse>(),
};
