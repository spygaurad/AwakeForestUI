import { apiClient } from './client';
import { EP } from './endpoints';
import type { Dataset, DatasetItem } from '@/types/api';
import type { PaginatedResponse, JobResponse } from '@/types/common';

interface DatasetListParams {
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

interface UploadInitiateResponse {
  dataset_id: string;
  upload_id: string;
  presigned_url: string;
}

interface UploadPartUrlResponse {
  presigned_url: string;
}

interface UploadCompletePayload {
  parts: Array<{ part_number: number; etag: string }>;
}

export const datasetsApi = {
  // Org is scoped automatically via JWT — no org_id query param needed
  list: (params?: DatasetListParams) =>
    apiClient
      .get(EP.datasets.list, {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<Dataset>>(),

  get: (id: string) =>
    apiClient.get(EP.datasets.detail(id)).json<Dataset>(),

  update: (id: string, data: Partial<Pick<Dataset, 'name' | 'tags'>>) =>
    apiClient.patch(EP.datasets.update(id), { json: data }).json<Dataset>(),

  // Items
  listItems: (id: string, params?: DatasetItemListParams) =>
    apiClient
      .get(EP.datasets.items(id), {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<DatasetItem>>(),

  getDownloadUrl: (id: string) =>
    apiClient.get(EP.datasets.downloadUrl(id)).json<{ download_url: string }>(),

  getTileConfig: (id: string) =>
    apiClient
      .get(EP.datasets.tileConfig(id))
      .json<{ collection_id: string; bbox: number[]; temporal_extent: string[] }>(),

  // Ingest — triggers processing pipeline, returns 202 job_id
  ingest: (id: string) =>
    apiClient.post(EP.datasets.ingest(id)).json<JobResponse>(),

  // Multipart upload flow:
  //   1. uploadInitiate  → dataset_id + upload_id + first presigned URL
  //   2. uploadPartUrl   → presigned URL per part (loop per chunk)
  //   3. PUT presigned URLs directly to S3 (not through this client)
  //   4. uploadComplete  → finalize with ETags
  //   5. ingest(dataset_id) → trigger processing
  uploadInitiate: (data: {
    filename: string;
    content_type: string;
    project_id: string;
    name?: string;
    tags?: string[];
  }) =>
    apiClient
      .post(EP.datasets.uploadInitiate, { json: data })
      .json<UploadInitiateResponse>(),

  uploadPartUrl: (datasetId: string, uploadId: string, partNumber: number) =>
    apiClient
      .post(EP.datasets.uploadPartUrl(datasetId, uploadId), { json: { part_number: partNumber } })
      .json<UploadPartUrlResponse>(),

  uploadComplete: (datasetId: string, uploadId: string, payload: UploadCompletePayload) =>
    apiClient
      .post(EP.datasets.uploadComplete(datasetId, uploadId), { json: payload })
      .json<Dataset>(),

  uploadAbort: (datasetId: string, uploadId: string) =>
    apiClient.delete(EP.datasets.uploadAbort(datasetId, uploadId)).json<void>(),
};
