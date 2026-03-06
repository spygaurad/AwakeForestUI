import { apiClient } from './client';
import type { TrackedObject, TrackedObjectObservation, TrackedObjectStatus, Priority, ObjectType } from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';
import type { PaginatedResponse } from '@/types/common';

interface TrackingListParams {
  org_id: string;
  object_type?: ObjectType;
  status?: TrackedObjectStatus;
  priority?: Priority;
  bbox?: string;
  page?: number;
  page_size?: number;
}

export const trackingApi = {
  list: (params: TrackingListParams) =>
    apiClient
      .get('tracking', { searchParams: params as unknown as Record<string, string | number> })
      .json<PaginatedResponse<TrackedObject>>(),

  get: (id: string) =>
    apiClient.get(`tracking/${id}`).json<TrackedObject>(),

  create: (data: Partial<TrackedObject>) =>
    apiClient.post('tracking', { json: data }).json<TrackedObject>(),

  update: (id: string, data: Partial<Pick<TrackedObject, 'status' | 'priority' | 'severity' | 'alert_threshold'>>) =>
    apiClient.patch(`tracking/${id}`, { json: data }).json<TrackedObject>(),

  merge: (id: string, targetId: string) =>
    apiClient.post(`tracking/${id}/merge`, { json: { target_id: targetId } }).json<TrackedObject>(),

  // Observations
  listObservations: (id: string) =>
    apiClient.get(`tracking/${id}/observations`).json<TrackedObjectObservation[]>(),

  addObservation: (id: string, data: {
    observation_datetime: string;
    geometry: GeoJSONGeometry;
    sensor?: string;
    properties?: Record<string, unknown>;
  }) =>
    apiClient.post(`tracking/${id}/observations`, { json: data }).json<TrackedObjectObservation>(),
};
