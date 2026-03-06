import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query-client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AwakeForest',
  description: 'Intelligent geospatial forest management platform',
  icons: {
    icon: [{ url: '/AwakeForest_logo.png', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#8c6d2c',
          colorBackground: '#ffffff',
          colorText: '#1c1917',
          borderRadius: '0.5rem',
        },
        elements: {
          card: 'shadow-lg border border-primary-100',
          formButtonPrimary:
            'bg-primary-600 hover:bg-primary-700 text-white transition-colors',
          footerActionLink: 'text-primary-600 hover:text-primary-700',
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}