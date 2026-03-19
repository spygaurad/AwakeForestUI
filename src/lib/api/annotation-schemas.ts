import { apiClient } from './client';
import { EP } from './endpoints';
import type { AnnotationSchema } from '@/types/api';

export interface AnnotationSchemaCreatePayload {
  name: string;
  description?: string | null;
  geometry_types: string[];
  properties_schema?: Record<string, unknown> | null;
}

export const annotationSchemasApi = {
  /** List all annotation schemas for the current org. */
  list: () =>
    apiClient
      .get(EP.annotationSchemas.list)
      .json<{ items: AnnotationSchema[] }>(),

  /** Get a single schema with classes + styles. */
  get: (id: string) =>
    apiClient
      .get(EP.annotationSchemas.detail(id))
      .json<AnnotationSchema>(),

  /** Create a new annotation schema. */
  create: (data: AnnotationSchemaCreatePayload) =>
    apiClient
      .post(EP.annotationSchemas.create, { json: data })
      .json<AnnotationSchema>(),
};
