import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Providers } from './providers';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AwakeForest',
  description: 'Geospatial Forest Management platform',
    icons: {
    // icon: '/AwakeForest_favicon.svg',
      icon: [
    // { url: '/AwakeForest_favicon.svg', type: 'image/svg+xml' },
    { url: '/AwakeForest_logo.png', type: 'image/png' },
  ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
