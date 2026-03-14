import { apiClient } from './client';
import { EP } from './endpoints';
import type { MLModel, ModelType } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

export const modelsApi = {
  // Org is scoped automatically via JWT — no org_id query param needed
  list: (params?: { type?: ModelType; project_id?: string; page?: number; page_size?: number }) =>
    apiClient
      .get(EP.models.list, {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<MLModel>>(),

  get: (id: string) =>
    apiClient.get(EP.models.detail(id)).json<MLModel>(),

  create: (data: {
    name: string;
    type: ModelType;
    version: string;
    artifact_uri: string;
    config?: Record<string, unknown>;
  }) =>
    apiClient.post(EP.models.create, { json: data }).json<MLModel>(),

  update: (id: string, data: Partial<Pick<MLModel, 'name' | 'version' | 'artifact_uri' | 'config'>>) =>
    apiClient.patch(EP.models.update(id), { json: data }).json<MLModel>(),

  delete: (id: string) =>
    apiClient.delete(EP.models.delete(id)).json<void>(),
};
