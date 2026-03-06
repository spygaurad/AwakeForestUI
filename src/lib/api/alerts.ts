import { apiClient } from './client';
import type { Alert, AlertSubscription, AlertStatus, AlertSeverity } from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';
import type { PaginatedResponse } from '@/types/common';
import type { ObjectType } from '@/types/api';

interface AlertListParams {
  org_id: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  alert_type?: string;
  bbox?: string;
  page?: number;
  page_size?: number;
}

export const alertsApi = {
  list: (params: AlertListParams) =>
    apiClient
      .get('alerts', { searchParams: params as unknown as Record<string, string | number> })
      .json<PaginatedResponse<Alert>>(),

  get: (id: string) =>
    apiClient.get(`alerts/${id}`).json<Alert>(),

  updateStatus: (id: string, status: AlertStatus) =>
    apiClient.patch(`alerts/${id}/status`, { json: { status } }).json<Alert>(),

  // Subscriptions
  listSubscriptions: (orgId: string) =>
    apiClient.get('alerts/subscriptions', { searchParams: { org_id: orgId } }).json<AlertSubscription[]>(),

  createSubscription: (data: {
    aoi_geometry: GeoJSONGeometry;
    object_types: ObjectType[];
    min_severity: AlertSeverity;
    cooldown_minutes: number;
    channels: { email?: string[]; webhook?: string[] };
  }) =>
    apiClient.post('alerts/subscriptions', { json: data }).json<AlertSubscription>(),

  updateSubscription: (id: string, data: Partial<AlertSubscription>) =>
    apiClient.patch(`alerts/subscriptions/${id}`, { json: data }).json<AlertSubscription>(),

  deleteSubscription: (id: string) =>
    apiClient.delete(`alerts/subscriptions/${id}`).json<void>(),
};
