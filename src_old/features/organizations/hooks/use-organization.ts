// features/organizations/hooks/use-organization.ts

import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api';

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: () => organizationsApi.get(id),
    enabled: !!id,
  });
}
