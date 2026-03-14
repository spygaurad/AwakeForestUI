import { apiClient } from './client';
import { EP } from './endpoints';
import type { ProjectLayerRef, LayerStyle } from '@/types/api';

export const mapLayersApi = {
  listRefs: (projectId: string) =>
    apiClient.get(EP.mapLayers.list(projectId)).json<ProjectLayerRef[]>(),

  addRef: (
    projectId: string,
    payload: {
      source_project_id: string;
      source_type: ProjectLayerRef['source_type'];
      source_item_id?: string;
      name: string;
    },
  ) =>
    apiClient
      .post(EP.mapLayers.create(projectId), { json: payload })
      .json<ProjectLayerRef>(),

  removeRef: (refId: string) =>
    apiClient.delete(EP.mapLayers.delete(refId)).json<void>(),

  updateRefStyle: (refId: string, style: LayerStyle) =>
    apiClient
      .patch(EP.mapLayers.updateStyle(refId), { json: { style } })
      .json<ProjectLayerRef>(),
};
