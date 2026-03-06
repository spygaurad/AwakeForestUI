// features/storage/api/storage-api.ts

import { apiClient } from '@/lib/api-client';

export const storageApi = {
  listObjects: async (bucket: string, prefix = '', ext = 'tif,tiff') => {
    return apiClient.get<Array<{
      key: string;
      size_bytes?: number;
      last_modified?: string;
      presigned_url?: string;
    }>>('/storage/objects', {
      params: { bucket, prefix, ext, include_url: true },
    });
  },

  presignGet: async (bucket: string, key: string, expires_in = 900) => {
    return apiClient.get<{ url: string }>('/storage/presign/get', {
      params: { bucket, key, expires_in },
    });
  },
};
