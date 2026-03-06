'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Building2, Folder as FolderIcon, Database, Tag, Cpu, Plus, Layers } from 'lucide-react';

// Component & Utility Imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader'; // Assuming a generic Loader component exists

// API & Context Imports
import { useApp } from '@/lib/contexts/AppContext';
import { organizationsApi } from '@/features/organizations/api/organizations-api';
import { projectsApi } from '@/features/projects/api/projects-api';
import { datasetsApi } from '@/features/datasets/api/datasets-api';
import { mlModelsApi } from '@/features/ml-models/api/ml-models-api';

export default function DashboardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { currentOrganizationId, setCurrentOrganizationId, setCurrentProjectId } = useApp();

  // --- Data Fetching with Tanstack Query ---

  const { data: organizations, isLoading: isOrganizationsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  });

  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects', currentOrganizationId, 'dashboard'], // Scoped key for dashboard
    queryFn: () => projectsApi.list(currentOrganizationId ?? undefined),
  });

  const { data: datasets, isLoading: isDatasetsLoading } = useQuery({
    queryKey: ['datasets', currentOrganizationId, 'dashboard'], // Scoped key for dashboard
    queryFn: () => datasetsApi.list(currentOrganizationId ?? undefined),
  });

  const { data: models, isLoading: isModelsLoading } = useQuery({
    queryKey: ['models', 'dashboard'], // Scoped key for dashboard
    queryFn: () => mlModelsApi.list(), // Assuming mlModelsApi.list() exists
  });

  // --- Derived State ---

  const currentOrganization = useMemo(() => {
    if (!currentOrganizationId || !organizations) return null;
    return organizations.find((org) => org.id === currentOrganizationId);
  }, [currentOrganizationId, organizations]);

  const stats = useMemo(() => ({
    totalOrganizations: organizations?.length ?? 0,
    totalProjects: projects?.length ?? 0,
    totalDatasets: datasets?.length ?? 0,
    totalDatasetItems: 0, // Placeholder, as in original code
    totalModels: models?.filter((m: any) => m.is_public).length ?? 0,
  }), [organizations, projects, datasets, models]);

  // --- Navigation & Paths ---

  const go = (path: string) => startTransition(() => router.push(path));
  const selectOrgAndGo = (orgId: string) => {
    setCurrentOrganizationId(orgId);
    go(`/`); // Go to dashboard, which will be scoped to the org
  };

  const projectsPath = currentOrganization ? `/projects` : '/projects';
  const datasetsPath = currentOrganization ? `/datasets` : '/datasets';
  const orgsPath = '/organizations';

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            {currentOrganization ? `Overview of ${currentOrganization.name}` : 'Overview of your workspace'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="btn-compact" onClick={() => go(projectsPath)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
          <Button variant="outline" className="btn-compact" onClick={() => go(datasetsPath)}>
            <Database className="w-4 h-4 mr-1.5" />
            Upload Dataset
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Card className="card-compact">
          <CardContent className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-indigo-50"><Building2 className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-600">Organizations</p>
              <p className="text-xl font-semibold">{isOrganizationsLoading ? '...' : stats.totalOrganizations}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-compact">
          <CardContent className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary-50"><FolderIcon className="w-4 h-4 text-primary-600" /></div>
            <div>
              <p className="text-xs text-gray-600">Projects</p>
              <p className="text-xl font-semibold">{isProjectsLoading ? '...' : stats.totalProjects}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-compact">
          <CardContent className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-50"><Database className="w-4 h-4 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-600">Datasets</p>
              <p className="text-xl font-semibold">{isDatasetsLoading ? '...' : stats.totalDatasets}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-compact">
          <CardContent className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-50"><Cpu className="w-4 h-4 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-600">Active Models</p>
              <p className="text-xl font-semibold">{isModelsLoading ? '...' : stats.totalModels}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations & Projects Section */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Organizations List */}
        <Card className="card-compact">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Organizations</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => go(orgsPath)} className="text-xs">View All</Button>
          </CardHeader>
          <CardContent>
            {isOrganizationsLoading ? <Loader /> :
              !organizations || organizations.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3 text-sm">No organizations yet</p>
                  <Button className="btn-compact" onClick={() => go(orgsPath)}>Create Organization</Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {organizations.slice(0, 5).map((org) => (
                    <button key={org.id} onClick={() => selectOrgAndGo(org.id)} className="w-full text-left py-2.5 px-2 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-indigo-100 rounded-md grid place-items-center"><Building2 className="w-4 h-4 text-indigo-600" /></div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium text-gray-900">{org.name}</h3>
                          <p className="text-xs text-gray-600 truncate">{formatDate(org.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Recent Projects List */}
        <Card className="card-compact">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => go(projectsPath)} className="text-xs">View All</Button>
          </CardHeader>
          <CardContent>
            {isProjectsLoading ? <Loader /> :
              !projects || projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderIcon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3 text-sm">No projects yet</p>
                  <Button className="btn-compact" onClick={() => go(projectsPath)}>Create Your First Project</Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {projects.slice(0, 5).map((project: any) => (
                    <button key={project.id} onClick={() => { setCurrentProjectId(project.id); go(`/projects/${project.id}`); }} className="w-full text-left py-2.5 px-2 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-primary-100 rounded-md grid place-items-center"><FolderIcon className="w-4 h-4 text-primary-600" /></div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium text-gray-900">{project.name}</h3>
                          <p className="text-xs text-gray-600 truncate">{project.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-gray-500">{formatDate(project.created_at)}</div>
                    </button>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions can remain as they are, as they are simple navigations */}
    </div>
  );
}
