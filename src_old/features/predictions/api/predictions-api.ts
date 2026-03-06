// features/predictions/api/predictions-api.ts

import { apiClient } from '@/lib/api-client';
import type { 
  Prediction as PredictionType,
  PredictionUpdate 
} from '@/features/predictions/types';

export const predictionsApi = {
  list: async (params?: {
    dataset_id?: string;
    dataset_item_id?: string;
    job_id?: string;
    status?: string;
  }) => {
    return apiClient.get<PredictionType[]>('/predictions', { params });
  },

  get: async (id: string) => {
    return apiClient.get<PredictionType>(`/predictions/${id}`);
  },

  updateStatus: async (id: string, status: string) => {
    return apiClient.patch<PredictionType>(`/predictions/${id}/status`, {
      new_status: status,
    });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/predictions/${id}`);
  },

  // Inference
  runInference: async (params: {
    dataset_id: string;
    project_id: string;
    ml_model_id: string;
    conf_threshold?: number;
    iou_threshold?: number;
    tile_size?: number;
    stride?: number;
  }) => {
    return apiClient.post('/predictions/run-inference', params);
  },

  runInferenceOnItem: async (params: {
    dataset_item_id: string;
    project_id: string;
    ml_model_id: string;
    conf_threshold?: number;
    iou_threshold?: number;
    tile_size?: number;
    stride?: number;
  }) => {
    const { dataset_item_id, ...body } = params;
    return apiClient.post(`/predictions/run-inference/item/${dataset_item_id}`, body);
  },

  getJobStatus: async (jobId: string) => {
    return apiClient.get(`/predictions/jobs/${jobId}`);
  },
};
