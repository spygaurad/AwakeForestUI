'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8011';
const LOGIN_PATH =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH || '/api/v1/auth/login';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
      method: 'POST',
      credentials: 'include', // important: set/receive HttpOnly auth cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let message = 'Failed to login. Please check your credentials.';
      try {
        const data = await res.json();
        message =
          data?.detail ||
          (Array.isArray(data) && data[0]?.msg) ||
          data?.message ||
          message;
      } catch {
        /* ignore parse error */
      }
      throw new Error(message);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
            <img 
                    src="/AwakeForest_logo.png" 
                    alt="AwakeForest Logo" 
                    className="h-8 w-auto object-contain" 
              />
          <h1 className="text-3xl font-bold text-gray-900">AwakeForest</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link href="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              Sign up
            </Link>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help getting started? Check the documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
