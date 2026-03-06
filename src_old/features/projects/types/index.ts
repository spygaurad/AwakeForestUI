
import { ProjectId, OrganizationId, UserId, DatasetId } from '@/types';


export interface Project {
  id: ProjectId;
  name: string;
  description?: string;
  organization_id: OrganizationId;
  created_by: UserId;
  created_at: string;
  updated_at: string;
  default_bucket?: string | null;
  annotation_count?: number;
}

export interface ProjectDataset {
  id: string;
  project_id: ProjectId;
  dataset_id: DatasetId;
  linked_at: string;
}

export interface ProjectCreate {
  name: string;
  organization_id: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}
