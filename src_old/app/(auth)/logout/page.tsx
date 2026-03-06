'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8011';
const LOGOUT_PATH =
  process.env.NEXT_PUBLIC_AUTH_LOGOUT_PATH || '/api/v1/auth/logout';

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function logout() {
      try {
        // Call backend to clear HttpOnly cookie
        await fetch(`${API_BASE}${LOGOUT_PATH}`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Continue with client-side cleanup even if API fails
      }

      // Clear localStorage token
      localStorage.removeItem('auth_token');

      // Clear any cookies accessible from client-side
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Redirect to homepage
      router.replace('/');
    }

    logout();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <LogOut className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing Out</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    </div>
  );
}
