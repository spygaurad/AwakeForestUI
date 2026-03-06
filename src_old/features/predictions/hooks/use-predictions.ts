// import { useQuery } from '@tanstack/react-query';
// import { predictionsApi } from '@/lib/api';

// export function usePredictions(datasetItemId: string) {
//   return useQuery({
//     queryKey: ['predictions', datasetItemId],
//     queryFn: () => predictionsApi.list({ dataset_item_id: datasetItemId }),
//     enabled: !!datasetItemId,
//   });
// }

// // features/predictions/hooks/use-predictions.ts
import { useQuery } from '@tanstack/react-query';
import { predictionsApi } from '@/lib/api';

export function usePredictions(params?: {
  dataset_id?: string;
  dataset_item_id?: string;
}) {
  return useQuery({
    queryKey: ['predictions', params],
    queryFn: () => predictionsApi.list(params),
    enabled: !!(params?.dataset_id || params?.dataset_item_id),
  });
}
