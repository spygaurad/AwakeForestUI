// features/auth/types/index.ts
export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  user?: User;
}
