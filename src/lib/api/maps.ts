import { apiClient } from './client';
import { EP } from './endpoints';
import type { ProjectMap, MapViewState, MapApiLayer } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

/** Payload for the 8-second auto-save PATCH /maps/{id} */
export interface MapAutoSavePayload {
  view_state?: MapViewState;
  /** Batch layer display changes (opacity, style_override — NOT visibility or z_index) */
  layers?: { id: string; opacity?: number; style_override?: Record<string, unknown> | null }[];
}

export const mapsApi = {
  list: (projectId?: string) =>
    apiClient
      .get(EP.maps.list, {
        searchParams: projectId ? { project_id: projectId } : {},
      })
      .json<PaginatedResponse<ProjectMap>>(),

  get: (id: string) =>
    apiClient.get(EP.maps.detail(id)).json<ProjectMap>(),

  create: (projectId: string, data: { name: string; description?: string }) =>
    apiClient
      .post(EP.maps.create, {
        json: {
          project_id: projectId,
          view_state: { center: [0, 20], zoom: 3 },
          ...data,
        },
      })
      .json<ProjectMap>(),

  update: (
    id: string,
    data: Partial<Pick<ProjectMap, 'name' | 'description'>>,
  ) =>
    apiClient.patch(EP.maps.update(id), { json: data }).json<ProjectMap>(),

  delete: (id: string) => apiClient.delete(EP.maps.delete(id)).json<void>(),

  /**
   * Auto-save: PATCH /maps/{id} with view_state + batch layer changes.
   * Called by the 8-second debounce timer after camera moves or slider adjustments.
   */
  autoSave: (id: string, data: MapAutoSavePayload) =>
    apiClient.patch(EP.maps.update(id), { json: data }).json<ProjectMap>(),

  /**
   * Reorder layers: PUT /maps/{id}/layers/reorder
   * Sends layer_ids ordered bottom-to-top (z_index 0 first).
   * Returns layers with updated z_index values.
   */
  reorderLayers: (mapId: string, layerIds: string[]) =>
    apiClient
      .put(EP.maps.layersReorder(mapId), { json: { layer_ids: layerIds } })
      .json<MapApiLayer[]>(),
};
