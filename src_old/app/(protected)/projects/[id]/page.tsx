'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Link2, Unlink, FileText } from 'lucide-react';

// Component & Utility Imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';

// API and Type Imports
import { projectsApi } from '@/features/projects/api/projects-api';
import { datasetsApi } from '@/features/datasets/api/datasets-api';
import type { Dataset } from '@/features/datasets/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params?.id as string;

  // UI State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');

  // --- Data Fetching with Tanstack Query ---

  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
  });

  // Fetch the datasets linked to this project with the correct type
  const { data: linkedDatasets = [], isLoading: isLinkedLoading } = useQuery<Dataset[]>({ // <-- FIX APPLIED HERE
    queryKey: ['linked-datasets', projectId],
    queryFn: () => projectsApi.listDatasets(projectId),
    enabled: !!projectId,
  });

  // Fetch all datasets in the project's organization
  const { data: allDatasets = [] } = useQuery<Dataset[]>({ // <-- Also good to type this one
    queryKey: ['datasets', project?.organization_id],
    queryFn: () => datasetsApi.list(project!.organization_id),
    enabled: !!project?.organization_id,
  });


  // --- Mutations ---

  const linkDatasetMutation = useMutation({
    mutationFn: (datasetId: string) => projectsApi.linkDataset(projectId, datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-datasets', projectId] });
      setIsLinkModalOpen(false);
      setSelectedDatasetId('');
    },
    onError: (error) => {
      console.error('Failed to link dataset:', error);
      alert('Failed to link dataset. Please try again.');
    },
  });

  const unlinkDatasetMutation = useMutation({
    mutationFn: (datasetId: string) => projectsApi.unlinkDataset(projectId, datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-datasets', projectId] });
    },
    onError: (error) => {
      console.error('Failed to unlink dataset:', error);
      alert('Failed to unlink dataset. Please try again.');
    }
  });


  // --- Derived State & Handlers ---

  const unlinkedDatasets = useMemo(() => {
    // The error on the next line is now gone because linkedDatasets is Dataset[]
    const linkedIds = new Set(linkedDatasets.map((d) => d.id));
    return allDatasets.filter((d) => !linkedIds.has(d.id));
  }, [linkedDatasets, allDatasets]);

  const handleLinkDataset = () => {
    if (!selectedDatasetId) return;
    linkDatasetMutation.mutate(selectedDatasetId);
  };

  const handleUnlinkDataset = (datasetId: string) => {
    if (window.confirm('Are you sure you want to unlink this dataset? Annotations associated with it will not be deleted.')) {
      unlinkDatasetMutation.mutate(datasetId);
    }
  };

  // --- Render Logic ---

  if (isProjectLoading) {
    return <div className="flex justify-center items-center py-20"><Loader /></div>;
  }

  if (isProjectError || !project) {
    return <div className="text-center py-20 text-red-600">Failed to load project details.</div>;
  }

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-sm text-gray-600">{project.description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Linked Datasets ({isLinkedLoading ? '...' : linkedDatasets.length})</CardTitle>
            <Button size="sm" onClick={() => setIsLinkModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Link Dataset
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLinkedLoading ? <Loader /> :
            linkedDatasets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No datasets have been linked to this project yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedDatasets.map((dataset) => (
                  <Card key={dataset.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{dataset.name}</h4>
                        <p className="text-xs text-gray-600">{dataset.description || 'No description'}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/projects/${projectId}/datasets/${dataset.id}`)}
                        >
                          View Items
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleUnlinkDataset(dataset.id)}
                          isLoading={unlinkDatasetMutation.isPending && unlinkDatasetMutation.variables === dataset.id}
                        >
                          <Unlink className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Link Dataset Modal */}
      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Link a Dataset to your Project">
        <div className="space-y-4">
          {linkDatasetMutation.error && (
            <p className="text-sm text-red-600">{(linkDatasetMutation.error as Error).message}</p>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Select an available dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>-- Choose a dataset to link --</option>
              {unlinkedDatasets.length > 0 ? (
                unlinkedDatasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))
              ) : (
                <option disabled>No unlinked datasets available</option>
              )}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleLinkDataset}
              disabled={!selectedDatasetId || linkDatasetMutation.isPending}
              isLoading={linkDatasetMutation.isPending}
              className="flex-1"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Link Dataset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}