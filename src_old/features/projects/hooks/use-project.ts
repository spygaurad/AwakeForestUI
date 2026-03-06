import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });
}
