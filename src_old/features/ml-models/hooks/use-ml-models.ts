// features/ml-models/hooks/use-ml-models.ts

import { useQuery } from '@tanstack/react-query';
import { mlModelsApi } from '@/lib/api';

export function useMLModels(params?: { isPublic?: boolean }) {
  return useQuery({
    queryKey: ['ml-models', params],
    queryFn: () => mlModelsApi.list({ is_public: params?.isPublic }),
  });
}
