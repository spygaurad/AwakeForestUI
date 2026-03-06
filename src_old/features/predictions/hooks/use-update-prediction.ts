import { useMutation, useQueryClient } from '@tanstack/react-query';
import { predictionsApi } from '../api/predictions-api';

export function useUpdatePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      predictionsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}