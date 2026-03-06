'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface BackendStatusProps {
  children: React.ReactNode;
}

export default function BackendStatus({ children }: BackendStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkBackend = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      setIsOnline(response.ok);
    } catch (error) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    await checkBackend();
    setChecking(false);
  };

  if (isOnline) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md px-6">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full animate-ping opacity-20"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center">
              <WifiOff className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          We'll Be Right Back
        </h1>
        <p className="text-gray-600 mb-6">
          Our backend service is currently unavailable. We're working to restore it as quickly as possible.
        </p>

        {/* Status Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="flex items-center text-red-600 font-medium">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              Offline
            </span>
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={checking}
          className="inline-flex items-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Retry Connection'}
        </button>

        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-6">
          If the problem persists, please contact support or try again later.
        </p>
      </div>
    </div>
  );
}
