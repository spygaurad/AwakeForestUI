/**
 * syntheticApi/projects — drop-in replacement for clientApi/projects.
 * Same function names and return types. Switch by changing the import path.
 *
 * To connect real backend:
 *   import { projectsApi } from '@/lib/serverApi/projects';
 */
import type { Project } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';
import { SYNTHETIC_PROJECTS } from '@/data/projects';

function fakePage<T>(items: T[]): PaginatedResponse<T> {
  return { items, total: items.length, page: 1, page_size: items.length };
}

export const projectsApi = {
  list: (): Promise<PaginatedResponse<Project>> =>
    Promise.resolve(fakePage(SYNTHETIC_PROJECTS)),

  get: (id: string): Promise<Project> => {
    const project = SYNTHETIC_PROJECTS.find((p) => p.id === id);
    if (!project) return Promise.reject(new Error(`Project ${id} not found`));
    return Promise.resolve(project);
  },

  create: (data: { name: string; description?: string }): Promise<Project> => {
    const project: Project = {
      id: `proj-${Date.now()}`,
      organization_id: 'org-001',
      name: data.name,
      description: data.description ?? null,
      created_by: 'user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    SYNTHETIC_PROJECTS.unshift(project);
    return Promise.resolve(project);
  },

  update: (id: string, data: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project> => {
    const idx = SYNTHETIC_PROJECTS.findIndex((p) => p.id === id);
    if (idx === -1) return Promise.reject(new Error(`Project ${id} not found`));
    SYNTHETIC_PROJECTS[idx] = {
      ...SYNTHETIC_PROJECTS[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(SYNTHETIC_PROJECTS[idx]);
  },

  delete: (id: string): Promise<void> => {
    const idx = SYNTHETIC_PROJECTS.findIndex((p) => p.id === id);
    if (idx !== -1) SYNTHETIC_PROJECTS.splice(idx, 1);
    return Promise.resolve();
  },
};
