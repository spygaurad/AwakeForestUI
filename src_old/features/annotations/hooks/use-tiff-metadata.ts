'use client';

import { useQuery } from '@tanstack/react-query';

const TITILER_ENDPOINT = process.env.NEXT_PUBLIC_TITILER_URL ?? 'http://localhost:8011';

export function useTiffMetadata(tiffUrl: string) {
  return useQuery({
    queryKey: ['tiff-metadata', tiffUrl],
    queryFn: async () => {
      const res = await fetch(
        `${TITILER_ENDPOINT}/cog/info?url=${encodeURIComponent(tiffUrl)}`
      );

      if (!res.ok) {
        throw new Error('Failed to load TIFF metadata');
      }

      return res.json();
    },
    enabled: !!tiffUrl,
    staleTime: 10 * 60 * 1000, // TIFF metadata rarely changes
  });
}
