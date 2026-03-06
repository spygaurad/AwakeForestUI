// features/datasets/hooks/use-dataset.ts

import { useQuery } from '@tanstack/react-query';
import { datasetsApi } from '@/lib/api';

export function useDataset(id: string) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: () => datasetsApi.get(id),
    enabled: !!id,
  });
}
