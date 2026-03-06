'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Zap, Image as ImageIcon, Sparkles, Cpu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import BackendStatus from '@/components/backend/BackendStatus';

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

interface Detection {
  class_name: string;
  confidence: number;   // 0..1
  center_x: number;
  center_y: number;
  width: number;
  height: number;
  item_name: string;
  longitude?: number;
  latitude?: number;
  x?: number;
  y?: number;
}

interface Segmentation {
  id: number;
  label: string;
  confidence: number;
  // Polygon points as [x, y] pairs (normalized 0-1 or absolute pixels)
  polygon?: number[][];
  // Bounding box [x1, y1, x2, y2]
  bbox?: number[];
  // Base64 encoded mask image
  mask_base64?: string;
  // RLE encoded mask
  rle?: { counts: number[]; size: [number, number] };
  // Area in pixels
  area?: number;
  // Color for rendering (assigned automatically if not provided)
  color?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [models, setModels] = useState<InferenceModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [results, setResults] = useState<Detection[]>([]);
  const [segmentations, setSegmentations] = useState<Segmentation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Color palette for segmentation masks
  const MASK_COLORS = [
    'rgba(255, 99, 132, 0.4)',   // red
    'rgba(54, 162, 235, 0.4)',   // blue
    'rgba(255, 206, 86, 0.4)',   // yellow
    'rgba(75, 192, 192, 0.4)',   // teal
    'rgba(153, 102, 255, 0.4)',  // purple
    'rgba(255, 159, 64, 0.4)',   // orange
    'rgba(46, 204, 113, 0.4)',   // green
    'rgba(231, 76, 60, 0.4)',    // crimson
    'rgba(52, 152, 219, 0.4)',   // sky blue
    'rgba(155, 89, 182, 0.4)',   // violet
  ];

  // Canvas ref for drawing segmentation masks
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Text prompt for SAM3 models
  const [textPrompt, setTextPrompt] = useState<string>('');

  // Get selected model object
  const selectedModel = useMemo(() => {
    return models.find(m => m.id === selectedModelId) || null;
  }, [models, selectedModelId]);

  // Check if selected model requires text prompt
  const requiresTextPrompt = useMemo(() => {
    if (!selectedModel) return false;
    const promptType = selectedModel.config?.prompt_type as string | undefined;
    return promptType === 'text' || promptType === 'multimodal';
  }, [selectedModel]);

  // Group models by category
  const { standardModels, sam3Models, customModels } = useMemo(() => {
    return {
      standardModels: models.filter(m => m.category === 'standard'),
      sam3Models: models.filter(m => m.category === 'sam3'),
      customModels: models.filter(m => m.category === 'custom'),
    };
  }, [models]);

  // thresholds (0..1)
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [iouThreshold, setIouThreshold] = useState<number>(0.7);

  // image + overlay sizing
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgDims, setImgDims] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
  });

  // selection + list refs for scroll/highlight
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchPublicModels();
  }, []);

  const fetchPublicModels = async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      // Fetch public models from our JSON-based API
      const res = await fetch('/api/ml-models?is_public=true', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const publicModels: InferenceModel[] = data.models ?? [];
      setModels(publicModels);
      // Select first standard model by default, or first available
      const defaultModel = publicModels.find(m => m.category === 'standard') || publicModels[0];
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
      }
    } catch (e: any) {
      console.error('Failed to fetch public models:', e);
      setModels([]);
      setModelsError("Couldn't load public models. Please refresh the page.");
    } finally {
      setModelsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setError(null);
      setResults([]);
      setSegmentations([]);
      setSelectedIdx(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setError(null);
      setResults([]);
      setSegmentations([]);
      setSelectedIdx(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDetect = async () => {
    if (!image || !selectedModel) {
      setError('Please select an image and model');
      return;
    }

    // Check if model requires text prompt
    const promptType = selectedModel.config?.prompt_type as string | undefined;
    if ((promptType === 'text' || promptType === 'multimodal') && !textPrompt.trim()) {
      setError('Please enter a text prompt for this model');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedIdx(null);

    try {
      const formData = new FormData();
      formData.append('file', image);

      // Build URL with query params based on model type
      const baseUrl = selectedModel.endpoint_url;
      const endpointPath = selectedModel.endpoint_path;
      const params = new URLSearchParams();

      // Add confidence and IOU thresholds for detection models
      if (selectedModel.model_type === 'detection') {
        params.append('conf_threshold', String(confThreshold));
        params.append('iou_threshold', String(iouThreshold));
      }

      // Handle different prompt types for SAM3 models
      if (promptType === 'text') {
        params.append('text_prompts', textPrompt);
      } else if (promptType === 'multimodal') {
        params.append('text_prompt', textPrompt);
        // For multimodal, we'd also need bboxes - for now use full image
        // This would require canvas dimensions which we don't have here
      }

      const url = `${baseUrl}${endpointPath}${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Detection failed (${response.status})`);
      }

      const data = await response.json();
      console.log('Model response:', data);

      // Handle different response formats from various model servers
      let dets: Detection[] = [];

      // Format 1: Direct array of detections (YOLO-style)
      if (Array.isArray(data)) {
        dets = data.map((det: any) => ({
          class_name: det.class_name || det.class || det.label || 'object',
          confidence: det.confidence || det.score || det.conf || 0,
          center_x: det.center_x ?? det.x ?? (det.bbox ? (det.bbox[0] + det.bbox[2]) / 2 : 0),
          center_y: det.center_y ?? det.y ?? (det.bbox ? (det.bbox[1] + det.bbox[3]) / 2 : 0),
          width: det.width ?? det.w ?? (det.bbox ? (det.bbox[2] - det.bbox[0]) : 0),
          height: det.height ?? det.h ?? (det.bbox ? (det.bbox[3] - det.bbox[1]) : 0),
          item_name: det.item_name || det.name || det.label || det.class_name || 'object',
        }));
      }
      // Format 2: { detections: [...] }
      else if (Array.isArray(data?.detections)) {
        dets = data.detections.map((det: any) => ({
          class_name: det.class_name || det.class || det.label || 'object',
          confidence: det.confidence || det.score || det.conf || 0,
          center_x: det.center_x ?? det.x ?? (det.bbox ? (det.bbox[0] + det.bbox[2]) / 2 : 0),
          center_y: det.center_y ?? det.y ?? (det.bbox ? (det.bbox[1] + det.bbox[3]) / 2 : 0),
          width: det.width ?? det.w ?? (det.bbox ? (det.bbox[2] - det.bbox[0]) : 0),
          height: det.height ?? det.h ?? (det.bbox ? (det.bbox[3] - det.bbox[1]) : 0),
          item_name: det.item_name || det.name || det.label || det.class_name || 'object',
        }));
      }
      // Format 3: { predictions: [...] }
      else if (Array.isArray(data?.predictions)) {
        dets = data.predictions.map((pred: any) => ({
          class_name: pred.class_name || pred.class || pred.label || 'object',
          confidence: pred.confidence || pred.score || pred.conf || 0,
          center_x: pred.center_x ?? pred.x ?? (pred.bbox ? (pred.bbox[0] + pred.bbox[2]) / 2 : 0),
          center_y: pred.center_y ?? pred.y ?? (pred.bbox ? (pred.bbox[1] + pred.bbox[3]) / 2 : 0),
          width: pred.width ?? pred.w ?? (pred.bbox ? (pred.bbox[2] - pred.bbox[0]) : 0),
          height: pred.height ?? pred.h ?? (pred.bbox ? (pred.bbox[3] - pred.bbox[1]) : 0),
          item_name: pred.item_name || pred.name || pred.label || pred.class_name || 'object',
        }));
      }
      // Format 4: { results: [...] }
      else if (Array.isArray(data?.results)) {
        dets = data.results.map((res: any) => ({
          class_name: res.class_name || res.class || res.label || 'object',
          confidence: res.confidence || res.score || res.conf || 0,
          center_x: res.center_x ?? res.x ?? (res.bbox ? (res.bbox[0] + res.bbox[2]) / 2 : 0),
          center_y: res.center_y ?? res.y ?? (res.bbox ? (res.bbox[1] + res.bbox[3]) / 2 : 0),
          width: res.width ?? res.w ?? (res.bbox ? (res.bbox[2] - res.bbox[0]) : 0),
          height: res.height ?? res.h ?? (res.bbox ? (res.bbox[3] - res.bbox[1]) : 0),
          item_name: res.item_name || res.name || res.label || res.class_name || 'object',
        }));
      }
      // Format 5: Segmentation with masks/segments (SAM responses)
      else if (Array.isArray(data?.masks) || Array.isArray(data?.segments) || Array.isArray(data?.segmentation_results)) {
        const segments = data.masks || data.segments || data.segmentation_results || [];

        // Parse segmentation data for mask visualization
        const segs: Segmentation[] = segments.map((seg: any, idx: number) => ({
          id: idx,
          label: seg.label || seg.class_name || seg.class || `Segment ${idx + 1}`,
          confidence: seg.confidence || seg.score || 1,
          polygon: seg.polygon || seg.points || seg.contour || seg.segmentation,
          bbox: seg.bbox || seg.box || seg.bounding_box,
          mask_base64: seg.mask || seg.mask_base64 || seg.encoded_mask,
          rle: seg.rle || seg.counts ? { counts: seg.counts || seg.rle?.counts, size: seg.size || seg.rle?.size } : undefined,
          area: seg.area,
          color: MASK_COLORS[idx % MASK_COLORS.length],
        }));
        setSegmentations(segs);

        // Also create detection entries for the list view
        dets = segments.map((seg: any, idx: number) => ({
          class_name: seg.class_name || seg.class || 'segment',
          confidence: seg.confidence || seg.score || 1,
          center_x: seg.bbox ? (seg.bbox[0] + seg.bbox[2]) / 2 : 0,
          center_y: seg.bbox ? (seg.bbox[1] + seg.bbox[3]) / 2 : 0,
          width: seg.bbox ? (seg.bbox[2] - seg.bbox[0]) : 0,
          height: seg.bbox ? (seg.bbox[3] - seg.bbox[1]) : 0,
          item_name: seg.label || seg.name || `Segment ${idx + 1}`,
        }));
      }
      // Format 6: { boxes: [...], scores: [...], labels: [...] } (common YOLO output)
      else if (Array.isArray(data?.boxes) && Array.isArray(data?.scores)) {
        const boxes = data.boxes;
        const scores = data.scores;
        const labels = data.labels || data.classes || [];
        dets = boxes.map((box: number[], idx: number) => {
          // box can be [x1, y1, x2, y2] or [cx, cy, w, h]
          const [v1, v2, v3, v4] = box;
          const isXYXY = v3 > v1 && v4 > v2; // Likely x1,y1,x2,y2 format
          return {
            class_name: labels[idx] || 'object',
            confidence: scores[idx] || 0,
            center_x: isXYXY ? (v1 + v3) / 2 : v1,
            center_y: isXYXY ? (v2 + v4) / 2 : v2,
            width: isXYXY ? (v3 - v1) : v3,
            height: isXYXY ? (v4 - v2) : v4,
            item_name: labels[idx] || `Detection ${idx + 1}`,
          };
        });
      }

      console.log('Parsed detections:', dets);
      console.log('Segmentations:', segmentations.length > 0 ? segmentations : 'none');

      // If no detections found but we got a response, log warning
      if (dets.length === 0 && data) {
        console.warn('No detections parsed. Response keys:', Object.keys(data));
        // Try to show a helpful message
        if (typeof data === 'object' && !Array.isArray(data)) {
          const possibleArrays = Object.entries(data).filter(([_, v]) => Array.isArray(v));
          if (possibleArrays.length > 0) {
            console.log('Found arrays in response:', possibleArrays.map(([k, v]) => `${k}: ${(v as any[]).length} items`));
          }
        }
      }

      // Clear segmentations if this wasn't a segmentation response
      if (!(Array.isArray(data?.masks) || Array.isArray(data?.segments) || Array.isArray(data?.segmentation_results))) {
        setSegmentations([]);
      }

      setResults(dets);
    } catch (err: any) {
      console.error('Detection error:', err);
      setError(err.message || 'Failed to run detection');
    } finally {
      setLoading(false);
    }
  };

  // scale detections to displayed image size
  const scaledBoxes = useMemo(() => {
    if (!results.length || !imgDims.clientWidth || !imgDims.clientHeight) return [];
    const nw = imgDims.naturalWidth || 1;
    const nh = imgDims.naturalHeight || 1;
    const sx = imgDims.clientWidth / nw;
    const sy = imgDims.clientHeight / nh;

    return results.map((det, idx) => {
      const x1 = det.center_x - det.width / 2;
      const y1 = det.center_y - det.height / 2;
      return {
        index: idx,
        left: x1 * sx,
        top: y1 * sy,
        width: det.width * sx,
        height: det.height * sy,
        label: det.item_name || det.class_name,
        score: det.confidence,
        className: det.class_name,
      };
    });
  }, [results, imgDims]);

  // mean and std of confidence
  const { meanConf, stdConf } = useMemo(() => {
    if (!results.length) return { meanConf: 0, stdConf: 0 };
    const vals = results.map((d) => d.confidence);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vals.length;
    return { meanConf: mean, stdConf: Math.sqrt(variance) };
  }, [results]);


  const onBoxClick = (idx: number) => {
    setSelectedIdx(idx);
    const el = itemRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // brief focus flash
      el.classList.add('ring-2', 'ring-primary-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 600);
    }
  };

  const onItemClick = (idx: number) => {
    setSelectedIdx(idx);
  };

  return (
    <BackendStatus>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
        {/* Header */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14">
              <div className="flex items-center gap-3">
                <img 
                  src="/AwakeForest_logo.png" 
                  alt="AwakeForest Logo" 
                  className="h-8 w-auto object-contain" 
                />
                <div>
                  <span className="text-lg font-bold text-primary-500">AwakeForest</span>
                  <p className="text-[10px] text-gray-500 leading-none">Forest Management</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="primary" size="sm" onClick={() => router.push('/login')}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => router.push('/register')}>
                  Register
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero + Main */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              A Platform for Forest Management
            </h1>
            <p className="text-base text-gray-600 mb-3">
              Upload an image and get instant AI predictions
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Zap className="w-3 h-3 text-primary-500" />
              <span>Fast</span>
              <span>•</span>
              <span>Accurate</span>
              <span>•</span>
              <span>Free to Try</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Upload & Settings */}
            <div className="space-y-4">
              {/* Model Selection */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-primary-500" />
                    <label className="text-xs font-medium text-gray-700">
                      Select AI Model
                    </label>
                  </div>

                  <select
                    value={selectedModelId ?? ''}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                    disabled={modelsLoading || models.length === 0}
                  >
                    {modelsLoading ? (
                      <option value="">Loading models...</option>
                    ) : models.length === 0 ? (
                      <option value="">No public models found</option>
                    ) : (
                      <>
                        {standardModels.length > 0 && (
                          <optgroup label="Standard Models">
                            {standardModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.display_name} v{model.version}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {sam3Models.length > 0 && (
                          <optgroup label="SAM3 Experimental">
                            {sam3Models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.display_name} v{model.version}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {customModels.length > 0 && (
                          <optgroup label="Custom Models">
                            {customModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.display_name} v{model.version}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>

                  {modelsLoading && (
                    <>
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" d="M4 12a8 8 0 018-8v4" fill="currentColor" />
                        </svg>
                        Fetching available models...
                      </div>
                      <div className="mt-2 h-2 w-full bg-gray-100 rounded overflow-hidden">
                        <div className="h-2 w-1/3 animate-[pulse_1.2s_ease-in-out_infinite]" />
                      </div>
                    </>
                  )}

                  {!modelsLoading && models.length === 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {modelsError ?? 'No public models found.'} Refresh the page.
                    </div>
                  )}

                  {/* Model Details */}
                  {!modelsLoading && selectedModel && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">
                          {selectedModel.display_name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          selectedModel.model_type === 'detection'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {selectedModel.model_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedModel.description || 'No description available'}
                      </p>
                      {selectedModel.supported_classes && selectedModel.supported_classes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedModel.supported_classes.slice(0, 5).map((cls, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded">
                              {cls}
                            </span>
                          ))}
                          {selectedModel.supported_classes.length > 5 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              +{selectedModel.supported_classes.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Prompt Input for SAM3 models */}
                  {requiresTextPrompt && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <label className="text-xs font-medium text-blue-700">
                          Text Prompt
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g., 'tree', 'building', 'vehicle'"
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      />
                      <p className="mt-1.5 text-[10px] text-blue-600">
                        Describe what you want to detect or segment
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Area */}
              <Card>
                <CardContent className="p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Upload Image
                  </label>

                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer bg-gray-50"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    {imagePreview ? (
                      <div className="space-y-3">
                        <img
                          ref={imgRef}
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-lg"
                          onLoad={(e) => {
                            const el = e.currentTarget;
                            setImgDims({
                              naturalWidth: el.naturalWidth,
                              naturalHeight: el.naturalHeight,
                              clientWidth: el.clientWidth,
                              clientHeight: el.clientHeight,
                            });
                          }}
                        />
                        <p className="text-xs text-gray-600">{image?.name}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImage(null);
                            setImagePreview(null);
                            setResults([]);
                            setSelectedIdx(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Drop image here or click to upload
                        </p>
                        <p className="text-xs text-gray-500">
                          Supports: JPG, PNG, TIFF (Recommended: 800×800)
                        </p>
                      </>
                    )}
                  </div>

                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Threshold sliders */}
                  <div className="mt-4 space-y-3">
                    {/* Confidence Threshold */}
                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Confidence Threshold: {(confThreshold * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={confThreshold}
                        onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                      />
                    </div>

                    {/* IOU Threshold */}
                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        IOU Threshold: {(iouThreshold * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={iouThreshold}
                        onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>


                  {error && (
                    <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                      {error}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-4"
                    onClick={handleDetect}
                    disabled={!image || !selectedModel || loading || (requiresTextPrompt && !textPrompt.trim())}
                    isLoading={loading}
                  >
                    {loading
                      ? (selectedModel?.model_type === 'segmentation' ? 'Segmenting...' : 'Detecting...')
                      : (selectedModel?.model_type === 'segmentation' ? 'Run Segmentation' : 'Detect Objects')
                    }
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Detection Results
                  </h3>

                  {results.length === 0 && !loading && (
                    <div className="text-center py-10">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        Upload an image and click <strong>Detect Objects</strong> to see results
                      </p>
                    </div>
                  )}

                  {loading && (
                    <div className="text-center py-10">
                      <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-3"></div>
                      <p className="text-sm text-gray-600">Analyzing image...</p>
                    </div>
                  )}

                  {results.length > 0 && imagePreview && (
                    <div className="space-y-4">
                      {/* Image with bounding boxes */}
                      <div className="w-full flex justify-center">
                        <div className="relative inline-block">
                          <img
                            ref={imgRef}
                            src={imagePreview}
                            alt="Detected"
                            className="max-h-96 rounded-lg"
                            onLoad={(e) => {
                              const el = e.currentTarget;
                              setImgDims({
                                naturalWidth: el.naturalWidth,
                                naturalHeight: el.naturalHeight,
                                clientWidth: el.clientWidth,
                                clientHeight: el.clientHeight,
                              });
                            }}
                          />
                          {scaledBoxes.map((b) => {
                            const isSel = selectedIdx === b.index;
                            return (
                              <div
                                key={b.index}
                                className={`absolute rounded-sm cursor-pointer border-2 ${
                                  isSel ? 'border-primary-700' : 'border-primary-500'
                                }`}
                                style={{
                                  left: `${b.left}px`,
                                  top: `${b.top}px`,
                                  width: `${b.width}px`,
                                  height: `${b.height}px`,
                                  backgroundColor: isSel
                                    ? 'rgba(140, 109, 44, 0.12)' // primary-500 @ 12% opacity
                                    : 'rgba(140, 109, 44, 0.08)', // primary-500 @ 8% opacity
                                }}
                                onClick={() => onBoxClick(b.index)}
                                title={`${b.label} · ${(b.score * 100).toFixed(1)}%`}
                              >
                                <span
                                  className={`absolute -top-4 -right-2 text-[10px] px-1.5 py-0.5 rounded shadow-sm text-white ${
                                    isSel ? 'bg-primary-700' : 'bg-primary-500'
                                  }`}
                                >
                                  B{b.index + 1}
                                </span>
                              </div>
                            );
                          })}

                        </div>
                      </div>

                      {/* Summary (no classes count) */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                          <p className="text-xl font-bold text-primary-700">{results.length}</p>
                          <p className="text-xs text-primary-600">Objects Detected</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-xl font-bold text-gray-800">
                            {(meanConf * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">Mean Confidence</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-xl font-bold text-gray-800">
                            {(stdConf * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">Std. Dev.</p>
                        </div>
                      </div>

                      {/* Scrollable stats list */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {results.map((det, idx) => {
                          const isSel = selectedIdx === idx;
                          return (
                            <div
                              key={idx}
                              ref={(el) => (itemRefs.current[idx] = el)}
                              onClick={() => onItemClick(idx)}
                              className={`flex items-center justify-between bg-white border rounded-lg p-2 text-xs cursor-pointer transition 
                                ${isSel ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${isSel ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                >
                                  B{idx + 1}
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">
                                    {det.item_name || det.class_name}
                                  </span>
                                  <span className="text-gray-500 capitalize">{det.class_name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-medium text-gray-900">
                                  {(det.confidence * 100).toFixed(1)}%
                                </span>
                                <span className="block text-[10px] text-gray-500">
                                  w×h: {det.width.toFixed(0)}×{det.height.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Compact Features Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Instant Results</h3>
              <p className="text-xs text-gray-600">
                Get AI predictions in seconds with state-of-the-art models
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-primary-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Multiple Formats</h3>
              <p className="text-xs text-gray-600">
                Support for JPG, PNG, TIFF, and large GeoTIFF orthomosaics
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-primary-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Easy Upload</h3>
              <p className="text-xs text-gray-600">
                Drag and drop interface with real-time preview
              </p>
            </div>
          </div>
        </div>
      </div>
    </BackendStatus>
  );
}
