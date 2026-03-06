// features/organizations/api/organizations-api.ts

import { apiClient } from '@/lib/api-client';
import type { 
  Organization as OrganizationType,
  OrganizationCreate,
  OrganizationUpdate 
} from '@/features/organizations/types';

export const organizationsApi = {
  list: async () => {
    return apiClient.get<OrganizationType[]>('/organizations');
  },

  get: async (id: string) => {
    return apiClient.get<OrganizationType>(`/organizations/${id}`);
  },

  create: async (data: OrganizationCreate) => {
    return apiClient.post<OrganizationType>('/organizations', data);
  },

  update: async (id: string, data: OrganizationUpdate) => {
    return apiClient.patch<OrganizationType>(`/organizations/${id}`, data);
  },

  getMembers: async (orgId: string) => {
    return apiClient.get(`/organizations/${orgId}/members`);
  },

  addMember: async (orgId: string, data: { user_id: string; role: string }) => {
    return apiClient.post(`/organizations/${orgId}/members`, data);
  },
};
