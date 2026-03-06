import { apiClient } from './client';
import type { LabelSchema } from '@/types/api';

export const labelSchemasApi = {
  list: (orgId: string) =>
    apiClient.get('label-schemas', { searchParams: { org_id: orgId } }).json<LabelSchema[]>(),

  get: (id: string) =>
    apiClient.get(`label-schemas/${id}`).json<LabelSchema>(),

  create: (data: {
    name: string;
    project_id: string;
    labels: LabelSchema['labels'];
  }) =>
    apiClient.post('label-schemas', { json: data }).json<LabelSchema>(),

  update: (id: string, data: Partial<Pick<LabelSchema, 'name' | 'labels'>>) =>
    apiClient.patch(`label-schemas/${id}`, { json: data }).json<LabelSchema>(),

  delete: (id: string) =>
    apiClient.delete(`label-schemas/${id}`).json<void>(),
};
