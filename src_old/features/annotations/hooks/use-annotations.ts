// features/annotations/hooks/use-annotations.ts
import { useQuery } from '@tanstack/react-query';
import { annotationsApi } from '@/lib/api';

export function useAnnotations(params?: {
  project_id?: string;
  dataset_id?: string;
  dataset_item_id?: string;
}) {
  return useQuery({
    queryKey: ['annotations', params],
    queryFn: () => annotationsApi.list(params),
    enabled: !!(params?.project_id || params?.dataset_id || params?.dataset_item_id),
  });
}
