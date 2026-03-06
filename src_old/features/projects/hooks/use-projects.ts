// features/projects/hooks/use-projects.ts

import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';

export function useProjects(organizationId?: string) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => projectsApi.list(organizationId),
    enabled: !!organizationId || organizationId === undefined,
  });
}
