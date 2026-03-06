import { apiClient } from './client';
import type { MLModel, ModelType } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

export const modelsApi = {
  list: (orgId: string, type?: ModelType) =>
    apiClient
      .get('models', { searchParams: { org_id: orgId, ...(type ? { type } : {}) } })
      .json<PaginatedResponse<MLModel>>(),

  get: (id: string) =>
    apiClient.get(`models/${id}`).json<MLModel>(),

  create: (data: {
    name: string;
    type: ModelType;
    version: string;
    artifact_uri: string;
    config?: Record<string, unknown>;
  }) =>
    apiClient.post('models', { json: data }).json<MLModel>(),

  update: (id: string, data: Partial<Pick<MLModel, 'name' | 'config'>>) =>
    apiClient.patch(`models/${id}`, { json: data }).json<MLModel>(),

  delete: (id: string) =>
    apiClient.delete(`models/${id}`).json<void>(),
};
