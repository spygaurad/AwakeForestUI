import { useMutation, useQueryClient } from '@tanstack/react-query';
import { predictionsApi } from '../api/predictions-api';

export function useRunInference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: predictionsApi.runInference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}