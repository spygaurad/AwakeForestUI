
import { UserId } from '@/types';

export interface User {
  id: UserId;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
