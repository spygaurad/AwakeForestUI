// features/organizations/hooks/use-create-organization.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api';
import type { OrganizationCreate } from '../types';

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrganizationCreate) => organizationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
