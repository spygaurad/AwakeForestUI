'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * Shared stale-time constants for use in individual useQuery calls.
 *
 * STALE_SHORT  — actively-polled data (jobs, live alerts):  30 s
 * STALE_DEFAULT — most app data (projects, datasets, models): 5 min (global default)
 * STALE_LONG   — near-static reference data (label schemas, basemaps, org info): 30 min
 * STALE_SESSION — stable for the whole session (map context searchid): Infinity
 */
export const STALE_SHORT = 30_000;
export const STALE_DEFAULT = 5 * 60_000;
export const STALE_LONG = 30 * 60_000;
export const STALE_SESSION = Infinity;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_DEFAULT, // 5 minutes — most geodata changes infrequently
            gcTime: 15 * 60_000,      // 15 minutes — keep cache warm across navigation
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}