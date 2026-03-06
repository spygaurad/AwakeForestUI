'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, X, Cpu, Edit2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface InferenceModel {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  version: string;
  model_type: 'detection' | 'segmentation' | 'classification';
  is_public: boolean;
  endpoint_url: string;
  endpoint_path: string;
  supported_classes?: string[];
  config?: Record<string, unknown>;
  category: 'standard' | 'sam3' | 'custom';
  createdAt: string;
  updatedAt: string;
}

const GRID_LAYOUT =
  'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]';

const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className={GRID_LAYOUT}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="card-compact">
        <CardContent className="p-3 animate-pulse space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-md bg-gray-200 w-7 h-7" />
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-2 bg-gray-200 rounded w-14" />
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-3.5 w-3.5 bg-gray-200 rounded" />
              <div className="h-3.5 w-3.5 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-2 bg-gray-200 rounded w-5/6 mt-2" />
          <div className="space-y-1.5 text-xs mt-2">
            <div className="h-2 bg-gray-200 rounded w-4/5" />
            <div className="h-2 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="flex gap-1 mt-3">
            <div className="h-4 w-10 bg-gray-200 rounded" />
            <div className="h-4 w-6 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard',
  sam3: 'SAM3 Experimental',
  custom: 'Custom'
};

const CATEGORY_COLORS: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  sam3: 'bg-orange-50 text-orange-700 border-orange-200',
  custom: 'bg-purple-50 text-purple-700 border-purple-200'
};

export default function ModelsPage() {
  const [models, setModels] = useState<InferenceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<InferenceModel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    version: '',
    model_type: 'detection' as 'detection' | 'segmentation' | 'classification',
    endpoint_url: 'http://localhost:8010',
    endpoint_path: '',
    description: '',
    supported_classes: '',
    category: 'custom' as 'standard' | 'sam3' | 'custom',
    is_public: false,
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setErr(null);
      const response = await fetch('/api/ml-models');
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      setModels(data.models || []);
    } catch (error: any) {
      console.error('Failed to fetch models:', error);
      setErr(error?.message || 'Failed to fetch models');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);

    const payload: any = {
      name: formData.name.trim(),
      display_name: (formData.display_name || formData.name).trim(),
      version: formData.version.trim(),
      model_type: formData.model_type,
      endpoint_url: formData.endpoint_url.trim(),
      endpoint_path: formData.endpoint_path.trim(),
      category: formData.category,
      is_public: formData.is_public,
      config: {},
    };

    if (formData.description.trim()) payload.description = formData.description.trim();
    if (formData.supported_classes.trim()) {
      payload.supported_classes = formData.supported_classes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      if (editingModel) {
        // Update existing model
        const response = await fetch('/api/ml-models', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingModel.id, ...payload }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update model');
        }
      } else {
        // Create new model
        const response = await fetch('/api/ml-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create model');
        }
      }
      await fetchModels();
      resetForm();
    } catch (error: any) {
      const msg = error?.message || 'Failed to save model';
      setErr(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this model?')) return;
    try {
      const response = await fetch(`/api/ml-models?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete model');
      }
      await fetchModels();
    } catch (error: any) {
      const msg = error?.message || 'Failed to delete model';
      alert(msg);
    }
  };

  const togglePublic = async (model: InferenceModel) => {
    try {
      const response = await fetch('/api/ml-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: model.id, is_public: !model.is_public }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update visibility');
      }
      await fetchModels();
    } catch (error: any) {
      const msg = error?.message || 'Failed to update visibility';
      alert(msg);
    }
  };

  const startEdit = (model: InferenceModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      display_name: model.display_name,
      version: model.version,
      model_type: model.model_type,
      endpoint_url: model.endpoint_url,
      endpoint_path: model.endpoint_path,
      description: model.description || '',
      supported_classes: model.supported_classes?.join(', ') || '',
      category: model.category,
      is_public: model.is_public,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingModel(null);
    setFormData({
      name: '',
      display_name: '',
      version: '',
      model_type: 'detection',
      endpoint_url: 'http://localhost:8010',
      endpoint_path: '',
      description: '',
      supported_classes: '',
      category: 'custom',
      is_public: false,
    });
  };

  // Group models by category
  const modelsByCategory = models.reduce((acc, model) => {
    const cat = model.category || 'custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(model);
    return acc;
  }, {} as Record<string, InferenceModel[]>);

  return (
    <div className="container-custom py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Management</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Register and manage ML models available for predictions
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {showForm ? 'Cancel' : 'Add Model'}
        </Button>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
          {err}
        </div>
      )}

      {/* Add/Edit Model Form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-3">
              {editingModel ? 'Edit Model' : 'Add New Model'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="yolo11x-ortho"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="YOLO11x Ortho"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Version *</label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model Type *</label>
                  <select
                    value={formData.model_type}
                    onChange={(e) => setFormData({ ...formData, model_type: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="detection">Detection</option>
                    <option value="segmentation">Segmentation</option>
                    {/* <option value="classification">Classification</option> */}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="standard">Standard</option>
                    <option value="sam3">SAM3 Experimental</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Endpoint URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endpoint_url}
                    onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="http://localhost:8010"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Endpoint Path *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endpoint_path}
                    onChange={(e) => setFormData({ ...formData, endpoint_path: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="/predict/upload"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  placeholder="High-accuracy object detection for orthomosaics"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Supported Classes (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.supported_classes}
                  onChange={(e) => setFormData({ ...formData, supported_classes: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="tree, building, vehicle"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="is_public"
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">
                  Make model public (visible in inference sidebar)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting} disabled={submitting}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {editingModel ? 'Update Model' : 'Create Model'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Models List */}
      {!loaded ? (
        <SkeletonGrid />
      ) : loading ? (
        <SkeletonGrid />
      ) : models.length === 0 ? (
        <Card className="card-compact">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 text-sm">No models yet. Add your first model to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {['standard', 'sam3', 'custom'].map((category) => {
            const categoryModels = modelsByCategory[category];
            if (!categoryModels || categoryModels.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  {CATEGORY_LABELS[category]} ({categoryModels.length})
                </h2>
                <div className={GRID_LAYOUT}>
                  {categoryModels.map((model) => (
                    <Card key={model.id} className="card-compact hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-2 rounded-md bg-purple-50 shrink-0">
                              <Cpu className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-gray-900">
                                {model.display_name || model.name}
                              </h3>
                              <p className="text-xs text-gray-500">v{model.version}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(model)}
                              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button
                              onClick={() => togglePublic(model)}
                              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                              title={model.is_public ? 'Make Private' : 'Make Public'}
                            >
                              {model.is_public ? (
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(model.id)}
                              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {model.description || 'No description'}
                        </p>

                        <div className="mt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type:</span>
                            <span className="font-medium text-gray-900 capitalize">{model.model_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Visibility:</span>
                            <span className={`font-medium ${model.is_public ? 'text-emerald-600' : 'text-gray-600'}`}>
                              {model.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Path:</span>
                            <span className="font-mono text-gray-900 truncate max-w-[140px]">
                              {model.endpoint_path}
                            </span>
                          </div>
                        </div>

                        {model.supported_classes && model.supported_classes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {model.supported_classes.slice(0, 3).map((label, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-[10px] font-medium"
                              >
                                {label}
                              </span>
                            ))}
                            {model.supported_classes.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                +{model.supported_classes.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${CATEGORY_COLORS[model.category]}`}>
                            {CATEGORY_LABELS[model.category]}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
