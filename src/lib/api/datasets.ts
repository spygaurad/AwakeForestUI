import { apiClient } from './client';
import { EP } from './endpoints';
import type { Dataset, DatasetItem } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

// ── Request / Response types ───────────────────────────────────────────────────

export interface DatasetCreatePayload {
  name: string;
  dataset_type: 'raster' | 'vector';
}

export interface DatasetListParams {
  project_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface DatasetItemListParams {
  page?: number;
  page_size?: number;
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
}

/** Step 2: POST /datasets/{id}/uploads/initiate */
export interface UploadInitiatePayload {
  filename: string;
  file_size_bytes: number;
  content_type: string;
}

export interface UploadPartUrl {
  part_number: number;
  url: string;
}

/** Response from initiate — job_id tracks the ingestion job created alongside the upload */
export interface UploadInitiateResponse {
  upload_id: string;
  job_id: string;
  s3_key: string;
  part_size_bytes: number;   // 10 MiB (backend-controlled)
  total_parts: number;       // pre-computed by backend; use directly, don't re-derive
  part_urls: UploadPartUrl[]; // presigned S3 PUT URLs for initial batch of parts
}

/** Response from POST .../part-urls — presigned URLs for additional parts */
export interface PartUrlsResponse {
  part_urls: UploadPartUrl[];
}

/** Part ETag returned by S3 after successful PUT */
export interface CompletedPart {
  part_number: number;
  etag: string;
}

/** Step 5: POST /uploads/{id}/complete → HTTP 202, starts Celery ingest_dataset */
export interface UploadCompleteResponse {
  job_id: string;
}

/** GET /datasets/{id}/tilejson — tile URLs point to the authenticated tile proxy */
export interface TileJsonResponse {
  tiles: string[];
  bounds: [number, number, number, number]; // [west, south, east, north]
  minzoom: number;
  maxzoom: number;
  searchid: string;
  name?: string;
}

/** GET /datasets/{id}/items/{item_id}/tile-config */
export interface ItemTileConfigResponse {
  tile_url_template: string;
}

/** POST /maps/{map_id}/layers */
export interface MapLayerCreatePayload {
  name: string;
  layer_type: 'raster' | 'vector' | 'xyz_tile';
  source_type: 'dataset' | 'stac_item' | 'tile_service';
  dataset_id?: string;
  stac_item_id?: string;
  tile_service_url?: string;
  opacity?: number;
  visible?: boolean;
}

export interface MapLayerRead {
  id: string;
  map_id: string;
  name: string;
  layer_type: string;
  source_type: string;
  dataset_id: string | null;
  stac_item_id: string | null;
  opacity: number;
  visible: boolean;
  created_at: string;
}

// ── API methods ───────────────────────────────────────────────────────────────

export const datasetsApi = {
  // Org is scoped automatically via JWT — no org_id query param needed in most calls
  list: (params?: DatasetListParams) =>
    apiClient
      .get(EP.datasets.list, {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<Dataset>>(),

  create: (data: DatasetCreatePayload) =>
    apiClient.post(EP.datasets.create, { json: data }).json<Dataset>(),

  get: (id: string) =>
    apiClient.get(EP.datasets.detail(id)).json<Dataset>(),

  update: (id: string, data: Partial<Pick<Dataset, 'name' | 'description'>>) =>
    apiClient.patch(EP.datasets.update(id), { json: data }).json<Dataset>(),

  delete: (id: string) =>
    apiClient.delete(EP.datasets.delete(id)).json<void>(),

  // ── Items ──────────────────────────────────────────────────────────────────
  listItems: (id: string, params?: DatasetItemListParams) =>
    apiClient
      .get(EP.datasets.items(id), {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<DatasetItem>>(),

  // ── Tile visualization ──────────────────────────────────────────────────────
  /** Fetch TileJSON for COG rendering. Requires dataset.status = ready.
   *  Defaults to assets=['data'] (single-band orthomosaic). Multi-asset (e.g.
   *  RGB composites) must use repeated query params — URLSearchParams handles this. */
  getTileJson: (id: string, assets: string[] = ['data']) => {
    const sp = new URLSearchParams();
    assets.forEach((a) => sp.append('assets', a));
    return apiClient
      .get(EP.datasets.tileJson(id), { searchParams: sp })
      .json<TileJsonResponse>();
  },

  /** Get tile URL template for a single STAC item (single .tif file). */
  getItemTileConfig: (datasetId: string, itemId: string) =>
    apiClient
      .get(EP.datasets.itemTileConfig(datasetId, itemId))
      .json<ItemTileConfigResponse>(),

  getDownloadUrl: (id: string) =>
    apiClient.get(EP.datasets.downloadUrl(id)).json<{ download_url: string }>(),

  // ── Multipart upload flow ──────────────────────────────────────────────────
  //
  //  Step 1  POST /datasets                           → dataset_id
  //  Step 2  POST /datasets/{id}/uploads/initiate     → upload_id, job_id, part_urls
  //  Step 3  PUT  <presigned_url>                     → upload parts directly to MinIO
  //  Step 3b POST /datasets/{id}/uploads/{uid}/part-urls → more presigned URLs if needed
  //  Step 5  POST /datasets/{id}/uploads/{uid}/complete → finalize + enqueue ingestion
  //  Poll    GET  /jobs/{job_id}                      → until completed / failed

  /** Step 2 — initiate a multipart upload for a dataset that already exists. */
  uploadInitiate: (datasetId: string, data: UploadInitiatePayload) =>
    apiClient
      .post(EP.datasets.uploadInitiate(datasetId), { json: data })
      .json<UploadInitiateResponse>(),

  /** Step 3b — fetch presigned S3 PUT URLs for parts beyond the initial batch. */
  fetchPartUrls: (datasetId: string, uploadId: string, partNumbers: number[]) =>
    apiClient
      .post(EP.datasets.uploadPartUrls(datasetId, uploadId), {
        json: { part_numbers: partNumbers },
      })
      .json<PartUrlsResponse>(),

  /** Step 5 — complete multipart assembly and enqueue ingest_dataset Celery task.
   *  Pass collected ETags so the backend can finalize the S3 multipart upload.
   *  If parts is null, the backend falls back to listing parts server-side. */
  uploadComplete: (datasetId: string, uploadId: string, parts: CompletedPart[] | null = null) =>
    apiClient
      .post(EP.datasets.uploadComplete(datasetId, uploadId), { json: { parts } })
      .json<UploadCompleteResponse>(),

  /** Abort — cancel in-progress upload before completion. */
  uploadAbort: (datasetId: string, uploadId: string) =>
    apiClient.delete(EP.datasets.uploadAbort(datasetId, uploadId)).json<void>(),

  // ── Map layer attachment ────────────────────────────────────────────────────
  /** Step 8 — attach dataset as a layer in a specific map. */
  addMapLayer: (mapId: string, data: MapLayerCreatePayload) =>
    apiClient
      .post(EP.maps.layers(mapId), { json: data })
      .json<MapLayerRead>(),

  listMapLayers: (mapId: string) =>
    apiClient.get(EP.maps.layers(mapId)).json<MapLayerRead[]>(),

  /** PATCH /maps/{mapId}/layers/{layerId} — update visibility, opacity, z-index, etc. */
  updateMapLayer: (
    mapId: string,
    layerId: string,
    data: Partial<Pick<MapLayerRead, 'visible' | 'opacity'>>,
  ) =>
    apiClient
      .patch(EP.maps.layerDetail(mapId, layerId), { json: data })
      .json<MapLayerRead>(),

  /** DELETE /maps/{mapId}/layers/{layerId} — remove layer from map. */
  deleteMapLayer: (mapId: string, layerId: string) =>
    apiClient.delete(EP.maps.layerDetail(mapId, layerId)).json<void>(),
};
