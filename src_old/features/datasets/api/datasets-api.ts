// features/datasets/api/datasets-api.ts

import { apiClient } from '@/lib/api-client';
import type { 
  Dataset as DatasetType,
  DatasetCreate,
  DatasetUpdate,
  DatasetItem as DatasetItemType
} from '@/features/datasets/types';

export const datasetsApi = {
  list: async (organizationId?: string) => {
    const params = organizationId ? { organization_id: organizationId } : {};
    return apiClient.get<DatasetType[]>('/datasets', { params });
  },

  get: async (id: string) => {
    return apiClient.get<DatasetType>(`/datasets/${id}`);
  },

  create: async (data: DatasetCreate) => {
    return apiClient.post<DatasetType>('/datasets', data);
  },

  update: async (id: string, data: DatasetUpdate) => {
    return apiClient.patch<DatasetType>(`/datasets/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/datasets/${id}`);
  },

  // Dataset Items
  listItems: async (datasetId: string) => {
    return apiClient.get<DatasetItemType[]>(`/datasets/${datasetId}/items`);
  },

  getItem: async (datasetId: string, itemId: string) => {
    return apiClient.get<DatasetItemType>(`/datasets/${datasetId}/items/${itemId}`);
  },

  // Upload
  initializeUpload: async (dataset_id: string, item_key: string) => {
    return apiClient.post<{ upload_url: string; dataset_item_id: string }>(
      '/datasets/upload/init',
      { dataset_id, item_key }
    );
  },

  finalizeUpload: async (dataset_item_id: string) => {
    return apiClient.post('/datasets/upload/finalize', { dataset_item_id });
  },
};
