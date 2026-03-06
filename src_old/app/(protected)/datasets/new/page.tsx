'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Database, Info } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// Feature Hooks & API
import { useOrganizations } from '@/features/organizations';
import { datasetsApi } from '@/features/datasets/api/datasets-api';

export default function NewDatasetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Fetch organizations using your feature hook
  const { data: organizations = [], isLoading: isOrgsLoading } = useOrganizations();

  // 2. Setup the Create Mutation
  const { mutate: createDataset, isPending } = useMutation({
    mutationFn: datasetsApi.create,
    onSuccess: () => {
      // Invalidate the datasets list cache to trigger a background refetch
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      router.push('/datasets');
    },
    onError: (error: any) => {
      setErr(error?.message ?? 'Failed to create dataset');
    },
  });

  const [err, setErr] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: '',
    storage_path: '',
  });

  // Derived state: check if form is valid
  const canSubmit = useMemo(() => {
    return (
      formData.name.trim().length > 0 &&
      formData.organization_id.trim().length > 0 &&
      formData.storage_path.trim().length > 0 &&
      !isPending
    );
  }, [formData, isPending]);

  const normalizeStoragePath = (p: string) => {
    const trimmed = p.trim();
    if (!trimmed) return trimmed;
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    createDataset({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      organization_id: formData.organization_id,
      storage_path: normalizeStoragePath(formData.storage_path),
    });
  };

  return (
    <div className="container-custom py-8">
      <Card className="max-w-2xl mx-auto shadow-lg border-t-4 border-t-blue-600">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <CardTitle>Create New Dataset</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {err && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4" />
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Dataset Name */}
            <Input
              label="Dataset Name"
              placeholder="e.g., Orthomosaic (Oct 2025)"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              required
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px]"
                placeholder="Describe the contents or purpose of this imagery collection..."
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Organization Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organization</label>
              <div className="relative">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white transition-all disabled:bg-gray-50"
                  value={formData.organization_id}
                  onChange={(e) => setFormData((f) => ({ ...f, organization_id: e.target.value }))}
                  required
                  disabled={isOrgsLoading || organizations.length === 0}
                >
                  <option value="" disabled>
                    {isOrgsLoading ? 'Fetching organizations...' : 'Select an organization'}
                  </option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Storage Path */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <Input
                label="Dataset Storage Path"
                placeholder="s3://bucket-name/prefix/"
                value={formData.storage_path}
                onChange={(e) => setFormData((f) => ({ ...f, storage_path: e.target.value }))}
                required
                className="bg-white"
              />
              <div className="flex gap-2 mt-2">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  We’ll recursively scan this S3/MinIO path for supported imagery files. 
                  Ensure the trailing slash is included for bucket prefixes.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/datasets')}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700" 
                isLoading={isPending} 
                disabled={!canSubmit}
              >
                Create Dataset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}