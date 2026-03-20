import { apiClient } from './client';
import { EP } from './endpoints';
import type { AnnotationSchema, AnnotationClass, StyleDefinition } from '@/types/api';

export interface AnnotationSchemaCreatePayload {
  name: string;
  description?: string | null;
  geometry_types: string[];
  properties_schema?: Record<string, unknown> | null;
}

export interface UpdateAnnotationClassStylePayload {
  style?: Partial<StyleDefinition>;
  name?: string;
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

  /** Get all classes for a schema. */
  getClasses: (schemaId: string) =>
    apiClient
      .get(EP.annotationSchemas.classes(schemaId))
      .json<{ items: AnnotationClass[] }>(),

  /** Get a single annotation class with its style. */
  getClass: (schemaId: string, classId: string) =>
    apiClient
      .get(EP.annotationSchemas.classDetail(schemaId, classId))
      .json<AnnotationClass>(),

  /** Update an annotation class, including its style. */
  updateClassStyle: (schemaId: string, classId: string, data: UpdateAnnotationClassStylePayload) =>
    apiClient
      .patch(EP.annotationSchemas.classStyle(schemaId, classId), { json: data })
      .json<AnnotationClass>(),
};
