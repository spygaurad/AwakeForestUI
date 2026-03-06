'use client';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function SessionSync() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    fetch('/api/auth/sync', { method: 'POST' }).catch(console.error);
  }, [isLoaded, isSignedIn]);

  return null;
}
