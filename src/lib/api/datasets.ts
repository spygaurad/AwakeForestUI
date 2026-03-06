import { apiClient } from './client';
import type { Dataset, DatasetItem } from '@/types/api';
import type { PaginatedResponse, JobResponse } from '@/types/common';

interface DatasetListParams {
  org_id: string;
  project_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

interface DatasetItemListParams {
  page?: number;
  page_size?: number;
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
}

export const datasetsApi = {
  list: (params: DatasetListParams) =>
    apiClient.get('datasets', { searchParams: params as unknown as Record<string, string | number> }).json<PaginatedResponse<Dataset>>(),

  get: (id: string) =>
    apiClient.get(`datasets/${id}`).json<Dataset>(),

  create: (data: {
    name: string;
    project_id: string;
    source_uri: string;
    tags?: string[];
  }) =>
    apiClient.post('datasets', { json: data }).json<JobResponse>(),

  update: (id: string, data: Partial<Pick<Dataset, 'name' | 'tags'>>) =>
    apiClient.patch(`datasets/${id}`, { json: data }).json<Dataset>(),

  delete: (id: string) =>
    apiClient.delete(`datasets/${id}`).json<void>(),

  reingest: (id: string) =>
    apiClient.post(`datasets/${id}/ingest`).json<JobResponse>(),

  // Items
  listItems: (id: string, params?: DatasetItemListParams) =>
    apiClient
      .get(`datasets/${id}/items`, { searchParams: (params ?? {}) as Record<string, string | number> })
      .json<PaginatedResponse<DatasetItem>>(),

  getItem: (datasetId: string, itemId: string) =>
    apiClient.get(`datasets/${datasetId}/items/${itemId}`).json<DatasetItem>(),

  // S3 upload — get presigned URL
  getUploadUrl: (data: { filename: string; content_type: string }) =>
    apiClient
      .post('datasets/upload-url', { json: data })
      .json<{ upload_url: string; s3_key: string }>(),
};
