'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import PrimarySidebar from '@/components/layout/PrimarySidebar';
import AnnotationNavSidebar from '@/features/annotations/components/AnnotationNavSidebar';


export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
// Check if the current path includes either '/annotate' or '/ml-annotate'
  const isAnnotatePage = ['/annotate', '/ml-annotate'].some(path => pathname.includes(path));

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 h-12">
      <div className="container-compact h-full flex items-center justify-between">
        <TopNav />
      </div>
    </header>
  );

return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {isAnnotatePage ? <AnnotationNavSidebar /> : <PrimarySidebar />}
      <main className="relative z-30 pt-12 sm:pl-16 transition-[padding] duration-200 ease-out">
        {isAnnotatePage ? (
          <div className="h-[calc(100vh-48px)]">
            {/* The providers are GONE. We just render the children. */}
            {children}
          </div>
        ) : (
          <div className="container-compact py-3">
            {/* The providers are GONE. We just render the children. */}
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
