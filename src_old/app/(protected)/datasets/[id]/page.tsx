'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCcw, PencilLine, X, Copy, Info } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';

// Hooks & API
import { useDataset, useDatasetItems } from '@/features/datasets';
import { formatDate } from '@/lib/utils';
import type { DatasetItem } from '@/features/datasets/types';

const fileNameFromKey = (key: string) => key.split('/').pop() ?? key;

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 1. Data Fetching via specialized hooks
  const { data: dataset, isLoading: isDatasetLoading, error: datasetError } = useDataset(id);
  const { 
    data: items = [], 
    isLoading: isItemsLoading, 
    refetch: refetchItems 
  } = useDatasetItems(id);

  // UI State for Modal
  const [openItem, setOpenItem] = useState<DatasetItem | null>(null);

  // Handlers
  const handleRowOpen = (it: DatasetItem) => setOpenItem(it);

  const handleAnnotate = (e: React.MouseEvent, item: DatasetItem) => {
    e.stopPropagation();
    const qs = new URLSearchParams({ uri: item.uri }).toString();
    router.push(`/datasets/${id}/items/${String(item.id)}/annotate?${qs}`);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  // Derived state for the table
  const rows = useMemo(
    () =>
      items.map((it) => ({
        id: String(it.id),
        filename: fileNameFromKey(it.key),
        raw: it,
      })),
    [items]
  );

  // Loading State
  if (isDatasetLoading) {
    return (
      <div className="container-custom py-4">
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader />
          <p className="text-sm text-gray-500 mt-4">Loading dataset details...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (datasetError || !dataset) {
    return (
      <div className="container-custom py-4 space-y-3">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {datasetError ? 'Failed to load dataset' : 'Dataset not found.'}
        </div>
        <Button onClick={() => router.push('/datasets')} variant="outline" className="btn-compact">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Datasets
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
          <p className="page-description">
            {dataset.description || 'Dataset details and items'}
          </p>
        </div>
        <Button variant="outline" className="btn-compact" onClick={() => router.push('/datasets')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
      </div>

      {/* Meta Card */}
      <Card className="card-compact">
        <CardContent className="p-3 text-xs text-gray-700">
          <div className="flex flex-wrap gap-4">
            <div><span className="text-gray-500">ID:</span> <span className="font-mono">{String(dataset.id)}</span></div>
            <div><span className="text-gray-500">Path:</span> <span className="font-mono">{dataset.storage_path}</span></div>
            <div><span className="text-gray-500">Status:</span> {dataset.status}</div>
            <div><span className="text-gray-500">Created:</span> {formatDate(dataset.created_at)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Items List Card */}
      <Card className="card-compact">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dataset Items ({items.length})</CardTitle>
          <Button variant="outline" className="btn-compact" onClick={() => refetchItems()} disabled={isItemsLoading}>
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isItemsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isItemsLoading && items.length === 0 ? (
            <div className="p-8 flex justify-center"><Loader /></div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-600">No items found in this dataset.</div>
          ) : (
            <div className="overflow-x-auto rounded-b-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">File</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowOpen(row.raw)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Info className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{row.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* <Button
                          className="btn-compact"
                          onClick={(e) => handleAnnotate(e, row.raw)}
                        >
                          <PencilLine className="w-3.5 h-3.5 mr-1.5" />
                          Annotate
                        </Button> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Detail Modal */}
      {openItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-900">Item Details</h3>
              <button onClick={() => setOpenItem(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Filename</label>
                  <p className="text-lg font-semibold">{fileNameFromKey(openItem.key)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">URI</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-50 p-2 rounded text-xs break-all flex-1">{openItem.uri}</code>
                    <Button variant="outline" size="sm" onClick={() => copy(openItem.uri)}><Copy className="w-3 h-3"/></Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl text-center">
                  <div className="text-xs text-gray-500 mb-1">Created At</div>
                  <div className="font-medium text-sm">{formatDate(openItem.created_at)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl text-center">
                  <div className="text-xs text-gray-500 mb-1">CRS</div>
                  <div className="font-medium text-sm">{openItem.crs || 'N/A'}</div>
                </div>
              </div>

              {openItem.meta && (
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Metadata</label>
                  <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-60">
                    <pre className="text-green-400 text-xs font-mono">{JSON.stringify(openItem.meta, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={(e) => handleAnnotate(e as any, openItem)}>
                <PencilLine className="w-4 h-4 mr-2" />
                Open in Annotator
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}