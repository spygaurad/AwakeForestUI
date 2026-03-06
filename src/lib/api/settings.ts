import { apiClient } from './client';
import type { ApiKey, ApiKeyCreated, BasemapLayer, SpatialBookmark, AuditLogEntry } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

interface AuditLogParams {
  org_id: string;
  action?: string;
  entity_type?: string;
  user_id?: string;
  page?: number;
  page_size?: number;
}

export const settingsApi = {
  // API Keys
  listApiKeys: (orgId: string) =>
    apiClient.get('api-keys', { searchParams: { org_id: orgId } }).json<ApiKey[]>(),

  createApiKey: (data: { name: string; expires_at?: string; permissions?: Record<string, unknown> }) =>
    apiClient.post('api-keys', { json: data }).json<ApiKeyCreated>(),

  revokeApiKey: (id: string) =>
    apiClient.delete(`api-keys/${id}`).json<void>(),

  // Basemaps
  listBasemaps: (orgId: string) =>
    apiClient.get('basemaps', { searchParams: { org_id: orgId } }).json<BasemapLayer[]>(),

  createBasemap: (data: Omit<BasemapLayer, 'id' | 'organization_id' | 'created_at'>) =>
    apiClient.post('basemaps', { json: data }).json<BasemapLayer>(),

  updateBasemap: (id: string, data: Partial<BasemapLayer>) =>
    apiClient.patch(`basemaps/${id}`, { json: data }).json<BasemapLayer>(),

  deleteBasemap: (id: string) =>
    apiClient.delete(`basemaps/${id}`).json<void>(),

  // Bookmarks
  listBookmarks: (orgId: string) =>
    apiClient.get('bookmarks', { searchParams: { org_id: orgId } }).json<SpatialBookmark[]>(),

  createBookmark: (data: Omit<SpatialBookmark, 'id' | 'organization_id' | 'created_at'>) =>
    apiClient.post('bookmarks', { json: data }).json<SpatialBookmark>(),

  deleteBookmark: (id: string) =>
    apiClient.delete(`bookmarks/${id}`).json<void>(),

  // Audit Log
  listAuditLog: (params: AuditLogParams) =>
    apiClient
      .get('audit-log', { searchParams: params as unknown as Record<string, string | number> })
      .json<PaginatedResponse<AuditLogEntry>>(),
};
