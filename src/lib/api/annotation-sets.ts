import { apiClient } from './client';
import { EP } from './endpoints';
import type { AnnotationSet, AnnotationFeature } from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';

export interface AnnotationSetCreatePayload {
  name: string;
  description?: string | null;
  schema_id?: string | null;
  dataset_id?: string | null;
}

export interface AnnotationFeatureCreatePayload {
  class_id: string;
  geometry: GeoJSONGeometry;
  confidence?: number | null;
  properties?: Record<string, unknown> | null;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string;
    geometry: GeoJSONGeometry;
    properties: Record<string, unknown>;
  }>;
}

export const annotationSetsApi = {
  /** List annotation sets for a map. */
  listByMap: (mapId: string) =>
    apiClient
      .get(EP.annotationSets.listByMap(mapId))
      .json<{ items: AnnotationSet[] }>(),

  /** Get a single annotation set with optional schema embed. */
  get: (id: string) =>
    apiClient
      .get(EP.annotationSets.detail(id))
      .json<AnnotationSet>(),

  /** Create an annotation set on a map. */
  create: (mapId: string, data: AnnotationSetCreatePayload) =>
    apiClient
      .post(EP.annotationSets.listByMap(mapId), { json: data })
      .json<AnnotationSet>(),

  /** Delete an annotation set. */
  delete: (id: string) =>
    apiClient.delete(EP.annotationSets.detail(id)),

  /** Get all features in an annotation set as GeoJSON FeatureCollection. */
  getFeatures: (id: string) =>
    apiClient
      .get(EP.annotationSets.features(id))
      .json<GeoJSONFeatureCollection>(),

  /** Add a single annotation feature to a set. */
  addFeature: (setId: string, data: AnnotationFeatureCreatePayload) =>
    apiClient
      .post(EP.annotationSets.addAnnotation(setId), { json: data })
      .json<AnnotationFeature>(),

  /** Update an annotation feature. */
  updateFeature: (setId: string, annId: string, data: Partial<AnnotationFeatureCreatePayload>) =>
    apiClient
      .patch(EP.annotationSets.annotationDetail(setId, annId), { json: data })
      .json<AnnotationFeature>(),

  /** Delete an annotation feature. */
  deleteFeature: (setId: string, annId: string) =>
    apiClient.delete(EP.annotationSets.annotationDetail(setId, annId)),
};
