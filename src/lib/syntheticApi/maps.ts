/**
 * syntheticApi/maps — drop-in replacement for serverApi/maps (future).
 * Same function names and return types. Switch by changing the import path.
 *
 * To connect real backend:
 *   import { mapsApi } from '@/lib/serverApi/maps';
 */
import type { ProjectMap } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';
import { SYNTHETIC_MAPS } from '@/data/maps';

function fakePage<T>(items: T[]): PaginatedResponse<T> {
  return { items, total: items.length, page: 1, page_size: items.length };
}

export const mapsApi = {
  list: (params?: { project_id?: string }): Promise<PaginatedResponse<ProjectMap>> => {
    const items = params?.project_id
      ? SYNTHETIC_MAPS.filter((m) => m.project_id === params.project_id)
      : SYNTHETIC_MAPS;
    return Promise.resolve(fakePage(items));
  },

  get: (id: string): Promise<ProjectMap> => {
    const map = SYNTHETIC_MAPS.find((m) => m.id === id);
    if (!map) return Promise.reject(new Error(`Map ${id} not found`));
    return Promise.resolve(map);
  },

  create: (data: { project_id: string; name: string; description?: string }): Promise<ProjectMap> => {
    const map: ProjectMap = {
      id: `map-${Date.now()}`,
      project_id: data.project_id,
      organization_id: 'org-001',
      name: data.name,
      description: data.description ?? null,
      created_by: 'user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    SYNTHETIC_MAPS.unshift(map);
    return Promise.resolve(map);
  },

  update: (id: string, data: Partial<Pick<ProjectMap, 'name' | 'description'>>): Promise<ProjectMap> => {
    const idx = SYNTHETIC_MAPS.findIndex((m) => m.id === id);
    if (idx === -1) return Promise.reject(new Error(`Map ${id} not found`));
    SYNTHETIC_MAPS[idx] = {
      ...SYNTHETIC_MAPS[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(SYNTHETIC_MAPS[idx]);
  },

  delete: (id: string): Promise<void> => {
    const idx = SYNTHETIC_MAPS.findIndex((m) => m.id === id);
    if (idx !== -1) SYNTHETIC_MAPS.splice(idx, 1);
    return Promise.resolve();
  },
};
