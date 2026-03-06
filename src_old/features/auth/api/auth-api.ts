// features/auth/api/auth-api.ts

import { apiClient } from '@/lib/api-client';
import type { User, AuthResponse } from '../types';

// Add explicit generics to tell apiClient the response type!
export const authApi = {
  signup: async (email: string, password: string, full_name?: string): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/signup', { email, password, full_name });
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/login', { email, password });
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      return await apiClient.get<User>('/me');
    } catch (e: any) {
      if (e?.response?.status === 404) {
        return await apiClient.get<User>('/users/me');
      }
      throw e;
    }
  },
};
