// features/annotations/api/annotations-api.ts

import { apiClient } from '@/lib/api-client';
import type { 
  Annotation as AnnotationType,
  AnnotationCreate,
  AnnotationUpdate 
} from '@/features/annotations/types';

export const annotationsApi = {
  list: async (params?: {
    project_id?: string;
    dataset_id?: string;
    dataset_item_id?: string;
    class_label?: string;
    source?: string;
  }) => {
    return apiClient.get<AnnotationType[]>('/annotations', { params });
  },

  get: async (id: string) => {
    return apiClient.get<AnnotationType>(`/annotations/${id}`);
  },

  create: async (data: AnnotationCreate) => {
    return apiClient.post<AnnotationType>('/annotations', data);
  },

  batchCreate: async (data: AnnotationCreate[]) => {
    return apiClient.post<AnnotationType[]>('/annotations/batch', data);
  },

  update: async (id: string, data: AnnotationUpdate) => {
    return apiClient.patch<AnnotationType>(`/annotations/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/annotations/${id}`);
  },
};
