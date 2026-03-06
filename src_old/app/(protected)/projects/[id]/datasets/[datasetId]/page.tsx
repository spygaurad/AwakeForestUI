'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, RefreshCcw, PencilLine, X, Copy, Info } from 'lucide-react';

// Component, API, and Type Imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { projectsApi } from '@/features/projects/api/projects-api';
import { datasetsApi } from '@/features/datasets/api/datasets-api';
import { formatDate } from '@/lib/utils';
import type { Dataset, DatasetItem } from '@/features/datasets/types';

const fileNameFromKey = (key: string) => key.split('/').pop() ?? key;

export default function ProjectDatasetDetailPage() {
  const { id: projectId, datasetId } = useParams<{ id: string; datasetId: string }>();
  const router = useRouter();

  // UI State - only for the modal visibility
  const [openItem, setOpenItem] = useState<DatasetItem | null>(null);

  // --- Data Fetching with Tanstack Query ---

  const { data: dataset, isLoading: isDatasetLoading, isError: isDatasetError } = useQuery<Dataset>({
    queryKey: ['dataset', datasetId],
    queryFn: () => datasetsApi.get(datasetId),
    enabled: !!datasetId,
  });

  // Query for the items within the dataset, scoped to the project.
  // THE FIX IS APPLIED HERE by adding <DatasetItem[]>
  const { data: items = [], isLoading: isItemsLoading, refetch: refetchItems } = useQuery<DatasetItem[]>({
    queryKey: ['dataset-items', projectId, datasetId],
    queryFn: () => projectsApi.listDatasetItems(projectId, datasetId),
    enabled: !!projectId && !!datasetId,
  });


  // --- Handlers & Derived State ---

  const handleRowOpen = (it: DatasetItem) => setOpenItem(it);

const handleViewer = (e: React.MouseEvent, item: DatasetItem) => {
    e.stopPropagation();
    const qs = new URLSearchParams({ uri: item.uri }).toString();
    router.push(`/projects/${projectId}/datasets/${datasetId}/items/${String(item.id)}/annotate?${qs}`);
  };

  const handleAnnotate = (e: React.MouseEvent, item: DatasetItem) => {
    e.stopPropagation();
    const qs = new URLSearchParams({ uri: item.uri }).toString();
    router.push(`/projects/${projectId}/datasets/${datasetId}/items/${String(item.id)}/ml-annotate?${qs}`);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // With the fix above, TypeScript now knows `items` is DatasetItem[],
  // so it correctly infers `it` is a DatasetItem. The error is gone.
  const rows = useMemo(() =>
    items.map((it) => ({
      id: String(it.id),
      filename: fileNameFromKey(it.key),
      raw: it,
    })),
    [items]
  );


  // --- Render Logic (unchanged from previous refactor) ---

  if (isDatasetLoading) {
    return (
      <div className="container-custom py-4">
        <div className="p-4"><Loader /></div>
      </div>
    );
  }

  if (isDatasetError || !dataset) {
    return (
      <div className="container-custom py-4 space-y-3">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {isDatasetError ? 'Failed to load dataset details.' : 'Dataset not found.'}
        </div>
        <Button onClick={() => router.push(`/projects/${projectId}`)} variant="outline" className="btn-compact">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Project
        </Button>
      </div>
    );
  }

  return (
    <div className="container-custom py-4 space-y-4">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">{dataset.name}</h1>
          <p className="page-description">{dataset.description || 'Dataset details and items'}</p>
        </div>
        <Button variant="outline" className="btn-compact" onClick={() => router.push(`/projects/${projectId}`)}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Project
        </Button>
      </div>

      {/* Meta Card */}
      <Card className="card-compact">
        <CardContent className="p-3 text-xs text-gray-700">
           <div className="flex flex-wrap gap-4">
            <div><span className="text-gray-500">Dataset ID:</span>{' '}<span className="font-mono">{String(dataset.id)}</span></div>
            <div><span className="text-gray-500">Project ID:</span>{' '}<span className="font-mono">{projectId}</span></div>
            <div><span className="text-gray-500">Path:</span>{' '}<span className="font-mono">{dataset.storage_path}</span></div>
            <div><span className="text-gray-500">Status:</span> {dataset.status}</div>
            <div><span className="text-gray-500">Created:</span> {formatDate(dataset.created_at)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card className="card-compact">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dataset Items ({items.length})</CardTitle>
          <Button variant="outline" className="btn-compact" onClick={() => refetchItems()} disabled={isItemsLoading}>
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isItemsLoading ? 'animate-spin' : ''}`} />
            {isItemsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isItemsLoading && items.length === 0 ? (
            <div className="p-4 flex justify-center"><Loader /></div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-600">No items found in this dataset.</div>
          ) : (
            <div className="overflow-x-hidden rounded-b-lg">
              <table className="w-full text-sm">
                <thead>
                  {/* ... */}
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowOpen(row.raw)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium truncate">{row.filename}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          className="btn-compact"
                          onClick={(e) => handleViewer(e, row.raw)}
                        >
                          <PencilLine className="w-3.5 h-3.5 mr-1.5" />
                          Viewer
                        </Button>
                      </td>
                      
                      <td className="px-3 py-2 text-center">
                        <Button
                          className="btn-compact"
                          onClick={(e) => handleAnnotate(e, row.raw)}
                        >
                          <PencilLine className="w-3.5 h-3.5 mr-1.5" />
                          Annotate
                        </Button>
                      </td>


                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data View Modal */}
      {openItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenItem(null)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Item Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpenItem(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <p><strong>File:</strong> {fileNameFromKey(openItem.key)}</p>
              <p className="font-mono text-xs"><strong>URI:</strong> {openItem.uri}</p>
              <p><strong>Created:</strong> {formatDate(openItem.created_at)}</p>
              {openItem.meta && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">{JSON.stringify(openItem.meta, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}