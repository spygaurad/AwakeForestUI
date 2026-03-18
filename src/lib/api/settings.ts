import { apiClient } from './client';
import { EP } from './endpoints';
import type { ApiKey, ApiKeyCreated, BasemapLayer, SpatialBookmark } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

export const settingsApi = {
  // API Keys — org is scoped automatically via JWT
  listApiKeys: () =>
    apiClient.get(EP.apiKeys.list).json<ApiKey[]>(),

  createApiKey: (data: { name: string; expires_at?: string; permissions?: Record<string, unknown> }) =>
    apiClient.post(EP.apiKeys.create, { json: data }).json<ApiKeyCreated>(),

  revokeApiKey: (id: string) =>
    apiClient.delete(EP.apiKeys.delete(id)).json<void>(),

  // Basemaps
  listBasemaps: (params?: { project_id?: string; layer_type?: string; is_active?: boolean; page?: number; page_size?: number }) =>
    apiClient
      .get(EP.basemaps.list, {
        searchParams: (params ?? {}) as Record<string, string | number | boolean>,
      })
      .json<PaginatedResponse<BasemapLayer>>(),

  createBasemap: (data: Omit<BasemapLayer, 'id' | 'organization_id' | 'created_at'>) =>
    apiClient.post(EP.basemaps.create, { json: data }).json<BasemapLayer>(),

  updateBasemap: (id: string, data: Partial<BasemapLayer>) =>
    apiClient.patch(EP.basemaps.update(id), { json: data }).json<BasemapLayer>(),

  deleteBasemap: (id: string) =>
    apiClient.delete(EP.basemaps.delete(id)).json<void>(),

  // Bookmarks
  listBookmarks: (params?: { project_id?: string; page?: number; page_size?: number }) =>
    apiClient
      .get(EP.bookmarks.list, {
        searchParams: (params ?? {}) as Record<string, string | number>,
      })
      .json<PaginatedResponse<SpatialBookmark>>(),

  createBookmark: (data: Omit<SpatialBookmark, 'id' | 'organization_id' | 'created_at'>) =>
    apiClient.post(EP.bookmarks.create, { json: data }).json<SpatialBookmark>(),

  updateBookmark: (id: string, data: Partial<SpatialBookmark>) =>
    apiClient.patch(EP.bookmarks.update(id), { json: data }).json<SpatialBookmark>(),

  deleteBookmark: (id: string) =>
    apiClient.delete(EP.bookmarks.delete(id)).json<void>(),
};
