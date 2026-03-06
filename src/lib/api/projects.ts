import { apiClient } from './client';
import type { Project, ProjectMember } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';

export const projectsApi = {
  list: (orgId: string) =>
    apiClient.get('projects', { searchParams: { org_id: orgId } }).json<PaginatedResponse<Project>>(),

  get: (id: string) =>
    apiClient.get(`projects/${id}`).json<Project>(),

  create: (data: { name: string; description?: string }) =>
    apiClient.post('projects', { json: data }).json<Project>(),

  update: (id: string, data: Partial<Pick<Project, 'name' | 'description'>>) =>
    apiClient.patch(`projects/${id}`, { json: data }).json<Project>(),

  delete: (id: string) =>
    apiClient.delete(`projects/${id}`).json<void>(),

  // Members
  listMembers: (id: string) =>
    apiClient.get(`projects/${id}/members`).json<ProjectMember[]>(),

  addMember: (id: string, data: { user_email: string; role: ProjectMember['role'] }) =>
    apiClient.post(`projects/${id}/members`, { json: data }).json<ProjectMember>(),

  updateMemberRole: (id: string, userId: string, role: ProjectMember['role']) =>
    apiClient.patch(`projects/${id}/members/${userId}`, { json: { role } }).json<ProjectMember>(),

  removeMember: (id: string, userId: string) =>
    apiClient.delete(`projects/${id}/members/${userId}`).json<void>(),
};
