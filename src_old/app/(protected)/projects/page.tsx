'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder as FolderIcon, Trash2, Edit, Building2 } from 'lucide-react';

// Your component imports
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';

// API and Context imports
import { projectsApi } from '@/features/projects/api/projects-api';
import { organizationsApi } from '@/features/organizations/api/organizations-api';
import { useApp } from '@/lib/contexts/AppContext'; // <-- UPDATED IMPORT
import { formatDate } from '@/lib/utils';
import type { Project, ProjectCreate } from '@/features/projects/types';

// A simple UUID validation helper
const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || '');

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Replaced useStore with useApp context
  const { currentOrganizationId, setCurrentProjectId } = useApp();

  // Local UI state for the modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    organization_id: string;
  }>({
    name: '',
    description: '',
    organization_id: '',
  });

  // Fetch all organizations
  const { data: organizations, isLoading: isOrganizationsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  });

  // 2. Derive the current organization object from the ID in the context
  const currentOrganization = useMemo(() => {
    if (!currentOrganizationId || !organizations) return null;
    return organizations.find((org) => org.id === currentOrganizationId);
  }, [currentOrganizationId, organizations]);

  // 3. Fetch projects based on the currentOrganizationId.
  // It will automatically refetch when the ID changes.
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects', currentOrganizationId],
    queryFn: () => projectsApi.list(currentOrganizationId ?? undefined),
    // Only run this query once organizations have been fetched.
    enabled: !!organizations,
  });

  const createProjectMutation = useMutation({
    mutationFn: (newProject: ProjectCreate) => projectsApi.create(newProject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', description: '', organization_id: '' });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Failed to delete project:', error);
    },
  });

  // Pre-select organization in the modal based on context
  useEffect(() => {
    if (!isCreateModalOpen) return;
    if (currentOrganizationId) {
      setFormData((f) => ({ ...f, organization_id: currentOrganizationId }));
    } else if (organizations && organizations.length === 1) {
      setFormData((f) => ({ ...f, organization_id: organizations[0].id }));
    }
  }, [isCreateModalOpen, currentOrganizationId, organizations]);

  const canSubmit = useMemo(
    () => !!formData.name.trim() && isUuid(formData.organization_id) && !createProjectMutation.isPending,
    [formData.name, formData.organization_id, createProjectMutation.isPending]
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: ProjectCreate = {
      name: formData.name.trim(),
      organization_id: formData.organization_id.trim(),
      description: formData.description.trim() ? formData.description.trim() : undefined,
    };
    createProjectMutation.mutate(payload);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProjectMutation.mutate(id);
    }
  };

  // 4. Update the openProject handler to use the context setter
  const openProject = (project: Project) => {
    setCurrentProjectId(project.id);
    router.push(`/projects/${project.id}`);
  };

  const renderContent = () => {
    // Show loader while either organizations or projects are loading
    if (isProjectsLoading || isOrganizationsLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Loader />
        </div>
      );
    }

    if (!projects || projects.length === 0) {
      return (
        <Card className="card-compact">
          <CardContent className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Create your first project to get started</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} hover>
            <CardContent className="p-6">
              <div className="cursor-pointer" onClick={() => openProject(project)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FolderIcon className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(project.created_at)}</div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}
              </div>
              <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
                <Button size="sm" variant="outline" onClick={() => openProject(project)} className="flex-1">
                  <Edit className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                  isLoading={deleteProjectMutation.isPending && deleteProjectMutation.variables === project.id}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-description">
            {currentOrganization // This now uses the derived organization object
              ? `Projects in ${currentOrganization.name}`
              : 'Organize your annotation work into projects'}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {renderContent()}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          {createProjectMutation.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {(createProjectMutation.error as Error).message || 'An unexpected error occurred'}
            </div>
          )}

          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Annotation Project"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <div className="relative">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                required
                disabled={isOrganizationsLoading || !organizations?.length}
              >
                <option value="" disabled>
                  {isOrganizationsLoading
                    ? 'Loading organizations...'
                    : !organizations?.length
                    ? 'No organizations available'
                    : 'Select an organization'}
                </option>
                {(organizations || []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1"
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createProjectMutation.isPending}
              className="flex-1"
              disabled={!canSubmit}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}