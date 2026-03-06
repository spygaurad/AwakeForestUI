// features/datasets/hooks/use-dataset-items.ts

import { useQuery } from '@tanstack/react-query';
import { datasetsApi } from '@/lib/api';

export function useDatasetItems(datasetId: string) {
  return useQuery({
    queryKey: ['dataset-items', datasetId],
    queryFn: () => datasetsApi.listItems(datasetId),
    enabled: !!datasetId,
  });
}
