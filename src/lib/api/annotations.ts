import { apiClient } from './client';
import type { Annotation, AnnotationVersion, AnnotationStatus } from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';
import type { PaginatedResponse, JobResponse } from '@/types/common';

interface AnnotationListParams {
  org_id: string;
  dataset_item_id?: string;
  label?: string;
  status?: AnnotationStatus;
  source?: string;
  bbox?: string;
  page?: number;
  page_size?: number;
}

export const annotationsApi = {
  list: (params: AnnotationListParams) =>
    apiClient
      .get('annotations', { searchParams: params as unknown as Record<string, string | number> })
      .json<PaginatedResponse<Annotation>>(),

  get: (id: string) =>
    apiClient.get(`annotations/${id}`).json<Annotation>(),

  create: (data: {
    dataset_item_id: string;
    geometry: GeoJSONGeometry;
    label: string;
    confidence?: number;
    status?: AnnotationStatus;
  }) =>
    apiClient.post('annotations', { json: data }).json<Annotation>(),

  update: (id: string, data: Partial<Pick<Annotation, 'geometry' | 'label' | 'confidence'>>) =>
    apiClient.patch(`annotations/${id}`, { json: data }).json<Annotation>(),

  updateStatus: (id: string, status: AnnotationStatus) =>
    apiClient.patch(`annotations/${id}/status`, { json: { status } }).json<Annotation>(),

  delete: (id: string) =>
    apiClient.delete(`annotations/${id}`).json<void>(),

  // Versions
  listVersions: (id: string) =>
    apiClient.get(`annotations/${id}/versions`).json<AnnotationVersion[]>(),

  // Bulk operations
  bulkImport: (data: {
    dataset_id: string;
    format: 'geojson' | 'csv' | 'shapefile';
    source_uri: string;
    field_mapping?: Record<string, string>;
  }) =>
    apiClient.post('annotations/bulk-import', { json: data }).json<JobResponse>(),

  bulkUpdate: (data: {
    annotation_ids: string[];
    updates: Partial<Pick<Annotation, 'label' | 'status' | 'confidence'>>;
  }) =>
    apiClient.post('annotations/bulk-update', { json: data }).json<JobResponse>(),

  bulkDelete: (annotationIds: string[]) =>
    apiClient.post('annotations/bulk-delete', { json: { annotation_ids: annotationIds } }).json<JobResponse>(),

  bulkExport: (data: {
    format: 'geojson' | 'csv' | 'coco' | 'shapefile';
    filters: Partial<AnnotationListParams>;
  }) =>
    apiClient.post('annotations/bulk-export', { json: data }).json<JobResponse>(),
};
