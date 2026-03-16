/**
 * Central registry of all backend API endpoint paths.
 *
 * Base URL is configured in src/lib/api/client.ts via NEXT_PUBLIC_API_URL.
 * These paths are relative to that base and map 1-to-1 with the backend routes
 * documented in docs/backend-api-endpoints.md.
 *
 * Usage:
 *   import { EP } from '@/lib/api/endpoints';
 *   apiClient.get(EP.projects.list)
 *   apiClient.get(EP.projects.detail(id))
 */
export const EP = {
  health: 'health',

  auth: {
    sync: 'auth/sync',
  },

  organizations: {
    list: 'organizations',
    detail: (orgId: string) => `organizations/${orgId}`,
  },

  projects: {
    list: 'projects',
    create: 'projects',
    detail: (id: string) => `projects/${id}`,
    update: (id: string) => `projects/${id}`,
    delete: (id: string) => `projects/${id}`,
    members: (id: string) => `projects/${id}/members`,
  },

  maps: {
    list: (projectId: string) => `projects/${projectId}/maps`,
    create: (projectId: string) => `projects/${projectId}/maps`,
    detail: (id: string) => `maps/${id}`,
    update: (id: string) => `maps/${id}`,
    delete: (id: string) => `maps/${id}`,
  },

  jobs: {
    /** Only GET /jobs/{id} is documented. Use jobStore for client-side job tracking. */
    detail: (id: string) => `jobs/${id}`,
  },

  apiKeys: {
    list: 'api-keys',
    create: 'api-keys',
    delete: (id: string) => `api-keys/${id}`,
  },

  datasets: {
    list: 'datasets',
    footprints: 'datasets/footprints',
    detail: (id: string) => `datasets/${id}`,
    update: (id: string) => `datasets/${id}`,
    items: (id: string) => `datasets/${id}/items`,
    downloadUrl: (id: string) => `datasets/${id}/download-url`,
    tileConfig: (id: string) => `datasets/${id}/tile-config`,
    ingest: (id: string) => `datasets/${id}/ingest`,
    // Multipart upload flow (steps 1–4 before calling ingest)
    uploadInitiate: 'datasets/upload/initiate',
    uploadPartUrl: (datasetId: string, uploadId: string) =>
      `datasets/upload/${datasetId}/part-url/${uploadId}`,
    uploadComplete: (datasetId: string, uploadId: string) =>
      `datasets/upload/${datasetId}/complete/${uploadId}`,
    uploadAbort: (datasetId: string, uploadId: string) =>
      `datasets/upload/${datasetId}/abort/${uploadId}`,
  },

  collections: {
    list: 'collections',
    detail: (id: string) => `collections/${id}`,
    items: (id: string) => `collections/${id}/items`,
  },

  search: 'search',

  annotations: {
    list: 'annotations',
    create: 'annotations',
    detail: (id: string) => `annotations/${id}`,
    update: (id: string) => `annotations/${id}`,
    updateStatus: (id: string) => `annotations/${id}/status`,
    delete: (id: string) => `annotations/${id}`,
    versions: (id: string) => `annotations/${id}/versions`,
    bulkImport: 'annotations/bulk-import',
    bulkUpdate: 'annotations/bulk-update',
    bulkDelete: 'annotations/bulk-delete',
    bulkExport: 'annotations/bulk-export',
  },

  labelSchemas: {
    list: 'label-schemas',
    create: 'label-schemas',
    detail: (id: string) => `label-schemas/${id}`,
    delete: (id: string) => `label-schemas/${id}`,
  },

  trackedObjects: {
    list: 'tracked-objects',
    create: 'tracked-objects',
    detail: (id: string) => `tracked-objects/${id}`,
    update: (id: string) => `tracked-objects/${id}`,
    delete: (id: string) => `tracked-objects/${id}`,
    merge: 'tracked-objects/merge',
    observations: (id: string) => `tracked-objects/${id}/observations`,
  },

  models: {
    list: 'models',
    create: 'models',
    detail: (id: string) => `models/${id}`,
    update: (id: string) => `models/${id}`,
    delete: (id: string) => `models/${id}`,
  },

  inference: {
    run: 'inference',
  },

  analysis: {
    timeseries: 'analysis/timeseries',
    changeDetection: 'analysis/change-detection',
  },

  map: {
    /** Call once per session/project change — do not poll. Pass ?project_id= for project mosaic. */
    context: 'map/context',
  },

  alerts: {
    list: 'alerts',
    create: 'alerts',
    detail: (id: string) => `alerts/${id}`,
    updateStatus: (id: string) => `alerts/${id}/status`,
    delete: (id: string) => `alerts/${id}`,
  },

  alertSubscriptions: {
    list: 'alert-subscriptions',
    create: 'alert-subscriptions',
    detail: (id: string) => `alert-subscriptions/${id}`,
    update: (id: string) => `alert-subscriptions/${id}`,
    delete: (id: string) => `alert-subscriptions/${id}`,
  },

  tiles: {
    mosaicRegister: 'tiles/mosaic/register',
    mosaicInfo: (searchId: string) => `tiles/mosaic/${searchId}/info`,
    mosaicTileJson: (searchId: string) => `tiles/mosaic/${searchId}/tilejson.json`,
    mosaicTile: (searchId: string, z: number, x: number, y: number, fmt: string) =>
      `tiles/mosaic/${searchId}/tiles/${z}/${x}/${y}.${fmt}`,
    itemTile: (
      collectionId: string,
      itemId: string,
      z: number,
      x: number,
      y: number,
      fmt: string,
    ) => `tiles/item/${collectionId}/${itemId}/${z}/${x}/${y}.${fmt}`,
  },

  basemaps: {
    list: 'basemaps',
    create: 'basemaps',
    detail: (id: string) => `basemaps/${id}`,
    update: (id: string) => `basemaps/${id}`,
    delete: (id: string) => `basemaps/${id}`,
  },

  bookmarks: {
    list: 'bookmarks',
    create: 'bookmarks',
    detail: (id: string) => `bookmarks/${id}`,
    update: (id: string) => `bookmarks/${id}`,
    delete: (id: string) => `bookmarks/${id}`,
  },

  mapLayers: {
    list: (projectId: string) => `projects/${projectId}/map-layers`,
    create: (projectId: string) => `projects/${projectId}/map-layers`,
    detail: (refId: string) => `map-layers/${refId}`,
    updateStyle: (refId: string) => `map-layers/${refId}/style`,
    delete: (refId: string) => `map-layers/${refId}`,
  },
} as const;
