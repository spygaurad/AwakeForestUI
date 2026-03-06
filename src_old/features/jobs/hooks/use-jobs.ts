// features/jobs/hooks/use-jobs.ts
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';

export function useJobs(params?: { dataset_id?: string }) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobsApi.list(params),
  });
}
