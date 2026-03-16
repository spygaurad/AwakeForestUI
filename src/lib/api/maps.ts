import { apiClient } from './client';
import { EP } from './endpoints';
import type { ProjectMap } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

export const mapsApi = {
  list: (projectId: string) =>
    apiClient.get(EP.maps.list(projectId)).json<PaginatedResponse<ProjectMap>>(),

  get: (id: string) =>
    apiClient.get(EP.maps.detail(id)).json<ProjectMap>(),

  create: (projectId: string, data: { name: string; description?: string }) =>
    apiClient
      .post(EP.maps.create(projectId), { json: data })
      .json<ProjectMap>(),

  update: (
    id: string,
    data: Partial<Pick<ProjectMap, 'name' | 'description'>>,
  ) =>
    apiClient.patch(EP.maps.update(id), { json: data }).json<ProjectMap>(),

  delete: (id: string) => apiClient.delete(EP.maps.delete(id)).json<void>(),
};
