import { ModelId } from '@/types';

export enum ModelType {
  Detection = 'detection',
  Segmentation = 'segmentation',
  // Classification = 'classification',
}

export interface MLModel {
  id: ModelId;
  name: string;
  display_name: string;
  description?: string;
  version: string;
  model_type: ModelType;
  is_public: boolean;
  endpoint_url: string;
  supported_classes?: string[];
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MLModelCreate {
  name: string;
  display_name: string;
  description?: string;
  version: string;
  model_type: ModelType;
  endpoint_url: string;
  supported_classes?: string[];
  config?: Record<string, unknown>;
}
