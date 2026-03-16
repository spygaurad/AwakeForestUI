import { AppSidebar } from '@/components/layout/AppSidebar';
import type { ReactNode } from 'react';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: '#f5ede0' }}
    >
      <AppSidebar workspaceId={workspaceId} />
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  );
}
