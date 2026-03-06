// features/organizations/types/index.ts

import { OrganizationId, UserId } from '@/types';

export enum OrganizationRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Viewer = 'viewer',
}

export interface Organization {
  id: OrganizationId;
  name: string;
  created_by: UserId;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: OrganizationId;
  user_id: UserId;
  role: OrganizationRole;
  joined_at: string;
}

export interface OrganizationCreate {
  name: string;
}

export interface OrganizationUpdate {
  name?: string;
}
