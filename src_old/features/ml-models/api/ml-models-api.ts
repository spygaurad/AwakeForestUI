// features/ml-models/api/ml-models-api.ts

import { apiClient } from '@/lib/api-client';
import type { 
  MLModel as MLModelType,
  MLModelCreate 
} from '@/features/ml-models/types';

export const mlModelsApi = {
  list: async (params?: { is_public?: boolean }) => {
    return apiClient.get<MLModelType[]>('/ml-models', { params });
  },

  listPublic: async () => {
    try {
      return await apiClient.get<MLModelType[]>('/public/ml-models');
    } catch {
      return mlModelsApi.list({ is_public: true });
    }
  },

  get: async (id: string) => {
    return apiClient.get<MLModelType>(`/ml-models/${id}`);
  },

  create: async (data: MLModelCreate) => {
    return apiClient.post<MLModelType>('/ml-models', data);
  },

  update: async (id: string, data: Partial<MLModelCreate> & { is_public?: boolean }) => {
    return apiClient.patch<MLModelType>(`/ml-models/${id}`, data);
  },

  updatePublic: async (id: string, is_public: boolean) => {
    return apiClient.patch<MLModelType>(`/ml-models/${id}`, { is_public });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/ml-models/${id}`);
  },
};
