'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, LogIn } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8011';
const REGISTER_PATH =
  process.env.NEXT_PUBLIC_AUTH_REGISTER_PATH || '/api/v1/auth/signup';
const LOGIN_PATH =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH || '/api/v1/auth/login';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Prefetch dashboard for a snappier post-register transition
  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function register(email: string, password: string, fullName: string) {
    const res = await fetch(`${API_BASE}${REGISTER_PATH}`, {
      method: 'POST',
      credentials: 'include', // important for HttpOnly cookie flows
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName, // adjust here if your backend expects fullName
      }),
    });

    if (!res.ok) {
      // Try to parse FastAPI-style error
      let message = 'Failed to register.';
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

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
      method: 'POST',
      credentials: 'include', // sets auth cookie from FastAPI
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let message = 'Login failed after registration.';
      try {
        const data = await res.json();
        message =
          data?.detail ||
          (Array.isArray(data) && data[0]?.msg) ||
          data?.message ||
          message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // 1) Create account
      await register(formData.email, formData.password, formData.fullName);

      // 2) Auto-login so FastAPI sets the HttpOnly cookie
      await login(formData.email, formData.password);

      // 3) Go to dashboard (middleware will keep them there since cookie exists)
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to register. Please try again.');
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
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Get started with Annotation Tool</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? null : <UserPlus className="w-4 h-4 mr-2" />}
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              href="/login"
              className="text-primary-500 hover:text-primary-600 font-medium inline-flex items-center gap-1"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          </div>
        </div>

        {/* Debug hint (optional): remove in production */}
        {/* <p className="mt-2 text-xs text-gray-500 text-center">
          Using {API_BASE}{REGISTER_PATH} / {LOGIN_PATH}
        </p> */}
      </div>
    </div>
  );
}
