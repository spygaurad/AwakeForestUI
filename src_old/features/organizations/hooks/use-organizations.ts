// features/organizations/hooks/use-organizations.ts

import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list(),
  });
}
