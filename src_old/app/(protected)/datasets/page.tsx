'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Database, RefreshCcw, AlertCircle } from 'lucide-react';

// UI Components
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';

// Logic & API
import { useOrganizations } from '@/features/organizations'; // Using your hook
import { datasetsApi } from '@/features/datasets/api/datasets-api';
import { formatDate } from '@/lib/utils';
import type { Dataset } from '@/features/datasets/types';

export default function DatasetsPage() {
  const router = useRouter();
  
  // 1. Get organization data from your custom hook
  const { data: organizations, isLoading: isOrgsLoading } = useOrganizations();
  
  // 2. Determine current org (Logic: take the first one, or add your own selection logic)
  const currentOrg = organizations?.[0];

  // 3. Fetch datasets filtered by the current org
  const { 
    data: datasets = [], 
    isLoading: isDatasetsLoading, 
    isError, 
    refetch 
  } = useQuery<Dataset[]>({
    queryKey: ['datasets', currentOrg?.id],
    queryFn: () => datasetsApi.list(currentOrg?.id),
    enabled: !!currentOrg?.id, // Only fetch once we have an org ID
  });

  const isLoading = isOrgsLoading || isDatasetsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="page-header flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Datasets</h1>
          <p className="page-description">
            {currentOrg 
              ? `Managing collections for ${currentOrg.name}` 
              : 'Geospatial imagery collections'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button onClick={() => router.push('/datasets/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Dataset
          </Button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-3 p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p>Error loading datasets.</p>
        </div>
      )}

      {datasets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Database className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No datasets found</h3>
            <p className="text-gray-500 mb-6">Start by creating a new dataset for this organization.</p>
            <Button onClick={() => router.push('/datasets/new')}>Create Dataset</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <Card key={d.id} hover onClick={() => router.push(`/datasets/${d.id}`)}>
              <CardContent className="p-6 cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDate(d.created_at)}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{d.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{d.description}</p>
                <div className="flex items-center gap-2">
                   <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700">
                    {d.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}