// features/ml-models/hooks/use-ml-model.ts

import { useQuery } from '@tanstack/react-query';
import { mlModelsApi } from '@/lib/api';

export function useMLModel(id: string) {
  return useQuery({
    queryKey: ['ml-models', id],
    queryFn: () => mlModelsApi.get(id),
    enabled: !!id,
  });
}
