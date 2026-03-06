'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Breadcrumbs from './Breadcrumbs';

// Use your existing React Query hook to fetch the current project by ID
import { useProject } from '@/features/projects/hooks/use-project';

// Helper to extract current project ID from pathname (adjust this logic as needed)
function getProjectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'projects' && parts[1]) return parts[1];
  return null;
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Derive current project ID from URL
  const currentProjectId = getProjectIdFromPath(pathname);

  // Fetch current project details with React Query
  const { data: currentProject } = useProject(currentProjectId ?? '');

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: 'Home', href: '/dashboard' }];

    if (pathname?.startsWith('/projects')) {
      crumbs.push({ label: 'Projects', href: '/projects' });

      if (currentProjectId) {
        crumbs.push({
          label: currentProject?.name ?? 'Project',
          href: `/projects/${currentProjectId}`,
        });
      }
    }

    return crumbs;
  }, [pathname, currentProject, currentProjectId]);

  const handleLogout = useCallback(async () => {
    // Clear React Query cache before navigating to logout
    await queryClient.clear();
    // Navigate to logout page which handles token/cookie cleanup
    router.push('/logout');
  }, [queryClient, router]);

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: App Title + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
        <img 
              src="/AwakeForest_logo.png" 
              alt="AwakeForest Logo" 
              className="h-8 w-auto object-contain" 
            />
          <span className="font-semibold text-base text-gray-900">AwakeForest</span>
        </div>
        <div className="w-px h-4 bg-gray-300" /> {/* Divider */}
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Right: Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}
