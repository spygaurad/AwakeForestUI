'use client';

import { useState, useEffect } from 'react';
import { Upload, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';

interface Model {
  id: number;
  name: string;
  version: string;
  description: string;
  framework: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
}

export default function UploadPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
    fetchProjects();
  }, []);

  const fetchModels = async () => {
    try {
      const data = await apiClient.getMLModels();
      setModels(data);
      if (data.length > 0) {
        setSelectedModel(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await apiClient.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if it's a TIFF file
      if (!selectedFile.name.toLowerCase().endsWith('.tif') && 
          !selectedFile.name.toLowerCase().endsWith('.tiff')) {
        setError('Please select a TIFF or GeoTIFF file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setUploadedImageId(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedProject) {
      setError('Please select a file and project');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', selectedProject.toString());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setUploadedImageId(data.id);
      setSuccess('File uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!uploadedImageId || !selectedModel) {
      setError('Please upload a file first and select a model');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inference/geotiff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_id: uploadedImageId,
          model_id: selectedModel,
          crop_size: 800,
          stride: 400,
          conf_threshold: 0.25,
          iou_threshold: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      const data = await response.json();
      setSuccess(`Processing complete! Found ${data.results.total_detections} objects.`);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
      console.error('Processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.tif') && 
          !droppedFile.name.toLowerCase().endsWith('.tiff')) {
        setError('Please select a TIFF or GeoTIFF file');
        return;
      }
      setFile(droppedFile);
      setError(null);
      setSuccess(null);
      setUploadedImageId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <Layout requireAuth>
      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Upload GeoTIFF
            </h1>
            <p className="text-gray-600">
              Upload large orthomosaic files for AI-powered object detection
            </p>
          </div>

          <div className="space-y-6">
            {/* Project Selection */}
            <Card>
              <CardContent className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                {projects.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                    <p className="text-sm">
                      You don't have any projects yet. 
                      <a href="/projects" className="underline ml-1">Create one first</a>
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedProject || ''}
                    onChange={(e) => setSelectedProject(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardContent className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload GeoTIFF File
                </label>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors cursor-pointer bg-gray-50"
                  onClick={() => document.getElementById('geotiff-input')?.click()}
                >
                  {file ? (
                    <div className="space-y-4">
                      <FileImage className="w-16 h-16 mx-auto text-primary-500" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setUploadedImageId(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Drop GeoTIFF here or click to upload
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports .tif and .tiff files (large orthomosaics supported)
                      </p>
                    </>
                  )}
                </div>

                <input
                  id="geotiff-input"
                  type="file"
                  accept=".tif,.tiff"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!uploadedImageId && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-6"
                    onClick={handleUpload}
                    disabled={!file || !selectedProject || uploading}
                    isLoading={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload to S3'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Model Selection & Processing */}
            {uploadedImageId && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-green-700 font-medium">
                      File uploaded successfully!
                    </span>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select AI Model
                  </label>
                  <select
                    value={selectedModel || ''}
                    onChange={(e) => setSelectedModel(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} v{model.version} - {model.framework}
                      </option>
                    ))}
                  </select>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-blue-900 mb-2">Processing Information</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Large files will be processed with sliding window</li>
                      <li>• Crop size: 800x800 pixels</li>
                      <li>• Stride: 400 pixels</li>
                      <li>• This may take several minutes</li>
                    </ul>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleProcess}
                    disabled={processing}
                    isLoading={processing}
                  >
                    {processing ? 'Processing...' : 'Start AI Detection'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Success</p>
                  <p className="text-sm text-green-700">{success}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => window.location.href = '/projects'}
                  >
                    View in Projects
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
