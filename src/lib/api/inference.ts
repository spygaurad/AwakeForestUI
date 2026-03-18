import { apiClient } from './client';
import { EP } from './endpoints';
import type { JobResponse } from '@/types/common';

export const inferenceApi = {
  run: (data: {
    model_id: string;
    dataset_id: string;
    confidence_threshold: number;
    item_ids?: string[]; // if omitted, runs on all items in the dataset
  }) =>
    apiClient.post(EP.inference.run, { json: data }).json<JobResponse>(),
};
