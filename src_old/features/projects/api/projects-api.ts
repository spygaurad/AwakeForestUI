// features/projects/api/projects-api.ts
import { apiClient } from '@/lib/api-client';
import type { 
  Project as ProjectType,
  ProjectCreate,
  ProjectUpdate 
} from '@/features/projects/types';
import type { Dataset, DatasetItem } from '@/features/datasets/types';

export const projectsApi = {
  list: async (organizationId?: string) => {
    const params = organizationId ? { organization_id: organizationId } : {};
    return apiClient.get<ProjectType[]>('/projects', { params });
  },

  get: async (id: string) => {
    return apiClient.get<ProjectType>(`/projects/${id}`);
  },

  create: async (data: ProjectCreate) => {
    return apiClient.post<ProjectType>('/projects', data);
  },

  update: async (id: string, data: ProjectUpdate) => {
    return apiClient.patch<ProjectType>(`/projects/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/projects/${id}`);
  },

  // Project-Dataset links
  /**
   * Fetches a list of datasets linked to a specific project.
   */
  listDatasets: async (projectId: string): Promise<Dataset[]> => { // 2. Add the explicit return type
    // 3. Add the generic <Dataset[]> to tell the client what to expect
    return apiClient.get<Dataset[]>(`/projects/${projectId}/datasets`);
  },

  listDatasetItems: async (projectId: string, datasetId: string) : Promise<DatasetItem[]> => {
    // Note: You may want to add a type here as well, e.g., apiClient.get<DatasetItem[]>(...)
    return apiClient.get<DatasetItem[]>(`/projects/${projectId}/datasets/${datasetId}/items`);
  },

  linkDataset: async (projectId: string, datasetId: string) => {
    return apiClient.post(`/projects/${projectId}/datasets`, { dataset_id: datasetId });
  },

  unlinkDataset: async (projectId: string, datasetId: string) => {
    return apiClient.delete(`/projects/${projectId}/datasets/${datasetId}`);
  },
};