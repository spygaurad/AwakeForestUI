'use client';

import { useState, useEffect, useCallback } from 'react';

export interface InferenceModel {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  version: string;
  model_type: 'detection' | 'segmentation' | 'classification';
  is_public: boolean;
  endpoint_url: string;
  endpoint_path: string;
  supported_classes?: string[];
  config?: Record<string, unknown>;
  category: 'standard' | 'sam3' | 'custom';
  createdAt: string;
  updatedAt: string;
}

interface UseInferenceModelsOptions {
  isPublic?: boolean;
  category?: 'standard' | 'sam3' | 'custom';
}

interface UseInferenceModelsReturn {
  models: InferenceModel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getModelById: (id: string) => InferenceModel | undefined;
  getModelByPath: (endpointPath: string) => InferenceModel | undefined;
  getModelsByCategory: (category: string) => InferenceModel[];
  standardModels: InferenceModel[];
  sam3Models: InferenceModel[];
  customModels: InferenceModel[];
}

export function useInferenceModels(options?: UseInferenceModelsOptions): UseInferenceModelsReturn {
  const [models, setModels] = useState<InferenceModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.isPublic !== undefined) {
        params.append('is_public', String(options.isPublic));
      }
      if (options?.category) {
        params.append('category', options.category);
      }

      const response = await fetch(`/api/ml-models?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setModels(data.models || []);
    } catch (err: any) {
      console.error('Error fetching inference models:', err);
      setError(err.message || 'Failed to load models');
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [options?.isPublic, options?.category]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const getModelById = useCallback((id: string): InferenceModel | undefined => {
    return models.find(model => model.id === id);
  }, [models]);

  const getModelByPath = useCallback((endpointPath: string): InferenceModel | undefined => {
    return models.find(model => model.endpoint_path === endpointPath);
  }, [models]);

  const getModelsByCategory = useCallback((category: string): InferenceModel[] => {
    return models.filter(model => model.category === category);
  }, [models]);

  const standardModels = models.filter(m => m.category === 'standard');
  const sam3Models = models.filter(m => m.category === 'sam3');
  const customModels = models.filter(m => m.category === 'custom');

  return {
    models,
    isLoading,
    error,
    refetch: fetchModels,
    getModelById,
    getModelByPath,
    getModelsByCategory,
    standardModels,
    sam3Models,
    customModels
  };
}
