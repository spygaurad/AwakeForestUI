// features/datasets/hooks/use-datasets.ts

import { useQuery } from '@tanstack/react-query';
import { datasetsApi } from '@/lib/api';

export function useDatasets(organizationId?: string) {
  return useQuery({
    queryKey: ['datasets', organizationId],
    queryFn: () => datasetsApi.list(organizationId),
  });
}
