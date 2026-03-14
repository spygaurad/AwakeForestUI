import { apiClient } from './client';
import { EP } from './endpoints';
import type { LabelSchema } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

export const labelSchemasApi = {
  // Filter by project_id (org is scoped automatically via JWT)
  list: (params?: { project_id?: string; page?: number; page_size?: number }) =>
    apiClient
      .get(EP.labelSchemas.list, {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<LabelSchema>>(),

  get: (id: string) =>
    apiClient.get(EP.labelSchemas.detail(id)).json<LabelSchema>(),

  create: (data: {
    name: string;
    project_id: string;
    labels: LabelSchema['labels'];
  }) =>
    apiClient.post(EP.labelSchemas.create, { json: data }).json<LabelSchema>(),

  delete: (id: string) =>
    apiClient.delete(EP.labelSchemas.delete(id)).json<void>(),
};
