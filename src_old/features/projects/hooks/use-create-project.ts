// features/projects/hooks/use-create-project.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import type { ProjectCreate } from '../types';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectCreate) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
