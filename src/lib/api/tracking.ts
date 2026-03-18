import { apiClient } from './client';
import { EP } from './endpoints';
import type {
  TrackedObject,
  TrackedObjectObservation,
  TrackedObjectStatus,
  Priority,
  ObjectType,
} from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';
import type { PaginatedResponse } from '@/types/common';

interface TrackingListParams {
  object_type?: ObjectType;
  status?: TrackedObjectStatus;
  priority?: Priority;
  project_id?: string;
  bbox?: string;
  page?: number;
  page_size?: number;
}

export const trackingApi = {
  // Org is scoped automatically via JWT — no org_id query param needed
  list: (params?: TrackingListParams) =>
    apiClient
      .get(EP.trackedObjects.list, {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<TrackedObject>>(),

  get: (id: string) =>
    apiClient.get(EP.trackedObjects.detail(id)).json<TrackedObject>(),

  create: (data: Partial<TrackedObject>) =>
    apiClient.post(EP.trackedObjects.create, { json: data }).json<TrackedObject>(),

  update: (
    id: string,
    data: Partial<Pick<TrackedObject, 'status' | 'priority' | 'severity' | 'alert_threshold'>>,
  ) =>
    apiClient.patch(EP.trackedObjects.update(id), { json: data }).json<TrackedObject>(),

  delete: (id: string) =>
    apiClient.delete(EP.trackedObjects.delete(id)).json<void>(),

  /**
   * Merge source tracked objects into a target.
   * Requires org:admin role.
   */
  merge: (data: { source_ids: string[]; target_id: string }) =>
    apiClient.post(EP.trackedObjects.merge, { json: data }).json<TrackedObject>(),

  // Observations
  listObservations: (id: string, params?: { page?: number; page_size?: number }) =>
    apiClient
      .get(EP.trackedObjects.observations(id), {
        searchParams: (params ?? {}) as Record<string, number>,
      })
      .json<PaginatedResponse<TrackedObjectObservation>>(),

  addObservation: (
    id: string,
    data: {
      observation_datetime: string;
      geometry: GeoJSONGeometry;
      sensor?: string;
      properties?: Record<string, unknown>;
    },
  ) =>
    apiClient
      .post(EP.trackedObjects.observations(id), { json: data })
      .json<TrackedObjectObservation>(),
};
