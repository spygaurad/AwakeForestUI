import { useMutation, useQueryClient } from '@tanstack/react-query';
import { predictionsApi } from '../api/predictions-api';
// use-run-inference-item.ts
export function useRunInferenceItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: predictionsApi.runInferenceOnItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}
