'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, Download } from 'lucide-react';

interface Detection {
  longitude: number;
  latitude: number;
  width: number;
  height: number;
  class_name: string;
  item_name: string;
  confidence: number;
  x: number;
  y: number;
  center_x: number;
  center_y: number;
}

interface Mask {
  bbox: number[];
  class_name: string;
  item_name: string;
  confidence: number;
  segmentation: number[][];
}

interface SegmentationResponse {
  detections: Detection[];
  masks: Mask[];
}

export default function TestFastApiPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [iouThreshold, setIouThreshold] = useState(0.7);
  const [mode, setMode] = useState<'detect' | 'segment'>('detect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<Detection[] | SegmentationResponse | null>(null);
  const [showJson, setShowJson] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Ref to store the loaded image element for dimensions and download composition
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  // Color palette for different classes
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80'
  ];

  const getColorForClass = (className: string, index: number): string => {
    const hash = className.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setError(null);
      setResponseData(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponseData(null);

    try {
      const formData = new FormData();
      formData.append('file', image);

      // Adjust endpoints based on your actual API structure
      const endpoint = mode === 'detect' ? '/predict/upload' : '/segment/upload';
      const baseurl = 'http://localhost:8010';
      
      const params = new URLSearchParams({
        conf_threshold: String(confThreshold),
        iou_threshold: String(iouThreshold),
      });

      const res = await fetch(`${baseurl}${endpoint}?${params}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorResp = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorResp.detail || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setResponseData(data);
    } catch (e: any) {
      console.error('Error:', e);
      setError(e.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const drawDetections = (detections: Detection[]) => {
    const canvas = canvasRef.current;
    const img = sourceImageRef.current;
    
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas internal resolution to image resolution
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Clear entire canvas to ensure transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det, index) => {
      const color = getColorForClass(det.class_name, index);
      
      const x = det.center_x - det.width / 2;
      const y = det.center_y - det.height / 2;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, det.width, det.height);

      // Draw label background
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(1)}%`;
      ctx.font = 'bold 16px sans-serif';
      const textMetrics = ctx.measureText(label);
      const textHeight = 20;
      const padding = 6;

      ctx.fillStyle = color;
      ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x + padding, y - padding - 2);
    });
  };

  const drawSegmentations = (data: SegmentationResponse) => {
    const canvas = canvasRef.current;
    const img = sourceImageRef.current;
    
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas internal resolution to image resolution
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Clear entire canvas to ensure transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create a buffer for pixel manipulation
    // Initial state is all transparent zeroes (r=0, g=0, b=0, a=0)
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const buffer = imageData.data;

    // 1. Draw masks onto the pixel buffer
    data.masks.forEach((mask, index) => {
      const color = getColorForClass(mask.class_name, index);
      const rgb = hexToRgb(color);
      if (!rgb) return;

      const segmentation = mask.segmentation;
      
      // Safety check for dimensions
      if (segmentation.length > canvas.height) return;

      for (let y = 0; y < segmentation.length; y++) {
        const row = segmentation[y];
        // Safety check for row length
        if (row.length > canvas.width) continue;

        for (let x = 0; x < row.length; x++) {
          // If the mask exists at this pixel
          if (row[x] > 0) {
            const pos = (y * canvas.width + x) * 4;
            
            // Overwrite pixel with mask color
            // Alpha set to 120 (~47%) for transparency over the original image
            buffer[pos] = rgb.r;
            buffer[pos + 1] = rgb.g;
            buffer[pos + 2] = rgb.b;
            buffer[pos + 3] = 120; 
          }
        }
      }
    });

    // Put the mask layer onto the canvas
    ctx.putImageData(imageData, 0, 0);

    // 2. Draw bounding boxes and labels on top of masks
    data.masks.forEach((mask, index) => {
      const color = getColorForClass(mask.class_name, index);
      const [x1, y1, x2, y2] = mask.bbox;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label = `${mask.class_name} ${(mask.confidence * 100).toFixed(1)}%`;
      ctx.font = 'bold 14px sans-serif';
      const textMetrics = ctx.measureText(label);
      const textHeight = 18;
      const padding = 4;

      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x1 + padding, y1 - padding - 2);
    });
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const downloadResult = () => {
    const canvas = canvasRef.current;
    const img = sourceImageRef.current;
    if (!canvas || !img) return;

    // Create a temporary canvas to merge image + overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // 1. Draw the original image first
      tempCtx.drawImage(img, 0, 0);
      // 2. Draw the overlay canvas on top
      tempCtx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = `analysis-${mode}-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }
  };

  // Effect to handle drawing when data or image changes
  useEffect(() => {
    if (responseData && imagePreview) {
      const img = new Image();
      img.onload = () => {
        sourceImageRef.current = img;
        
        if (mode === 'detect' && Array.isArray(responseData)) {
          drawDetections(responseData);
        } else if (mode === 'segment' && !Array.isArray(responseData)) {
          drawSegmentations(responseData as SegmentationResponse);
        }
      };
      img.src = imagePreview;
    }
  }, [responseData, imagePreview, mode]);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6 font-sans">
      <h1 className="text-3xl font-bold text-center text-gray-800">YOLO + SAM2 Detection & Segmentation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="space-y-6 bg-white shadow rounded-lg p-6">
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Choose Mode:</label>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as 'detect' | 'segment');
                setResponseData(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              disabled={loading}
            >
              <option value="detect">YOLO Detection Only</option>
              <option value="segment">YOLO + SAM2 Segmentation</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2 text-gray-700">Upload Image</label>
            <div
              onClick={handleUploadClick}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                imagePreview ? 'border-gray-300' : 'border-gray-400 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              {imagePreview ? (
                <div className="space-y-2">
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded object-contain" />
                  <p className="text-sm text-gray-500">Click to change image</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 text-gray-400" size={48} />
                  <p className="text-gray-600">Click to upload image</p>
                  <p className="text-sm text-gray-400 mt-1">PNG, JPG, or TIFF</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/tiff"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2 text-gray-700">
                Confidence Threshold: {(confThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2 text-gray-700">
                IOU Threshold: {(iouThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={iouThreshold}
                onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !image}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              loading || !image
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </div>

        {/* Right Panel - Results */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full">
          {responseData ? (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-xl font-semibold text-gray-800">Results:</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showJson ? 'Show Visualization' : 'Show JSON'}
                  </button>
                  <button
                    onClick={downloadResult}
                    className="flex items-center gap-1 text-sm px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>

              <div className="flex-grow min-h-0 relative">
                {!showJson ? (
                  <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                     {/* The Original Image Layer */}
                    <img 
                      src={imagePreview!} 
                      alt="Original" 
                      className="w-full h-auto block relative z-0"
                    />
                    
                    {/* The Transparent Overlay Layer */}
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
                    />
                  </div>
                ) : (
                  <pre className="bg-gray-50 p-4 rounded-lg h-full overflow-auto text-xs border border-gray-200">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 shrink-0">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {mode === 'detect' && Array.isArray(responseData)
                      ? responseData.length
                      : !Array.isArray(responseData)
                      ? responseData.detections.length
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Detections</div>
                </div>
                {mode === 'segment' && !Array.isArray(responseData) && (
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {responseData.masks.length}
                    </div>
                    <div className="text-sm text-gray-600">Masks</div>
                  </div>
                )}
              </div>

              {/* Class breakdown */}
              <div className="pt-4 border-t border-gray-200 shrink-0">
                <h3 className="font-semibold mb-2 text-gray-700">Detected Classes:</h3>
                <div className="flex flex-wrap gap-2">
                  {mode === 'detect' && Array.isArray(responseData) ? (
                    Array.from(new Set(responseData.map(d => d.class_name))).map((className, idx) => {
                      const count = responseData.filter(d => d.class_name === className).length;
                      return (
                        <div
                          key={className}
                          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${getColorForClass(className, idx)}20`,
                            color: getColorForClass(className, idx)
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getColorForClass(className, idx) }}
                          />
                          <span className="font-medium">{className}</span>
                          <span className="text-xs opacity-75">({count})</span>
                        </div>
                      );
                    })
                  ) : !Array.isArray(responseData) ? (
                    Array.from(new Set(responseData.detections.map(d => d.class_name))).map((className, idx) => {
                      const count = responseData.detections.filter(d => d.class_name === className).length;
                      return (
                        <div
                          key={className}
                          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${getColorForClass(className, idx)}20`,
                            color: getColorForClass(className, idx)
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getColorForClass(className, idx) }}
                          />
                          <span className="font-medium">{className}</span>
                          <span className="text-xs opacity-75">({count})</span>
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Upload size={64} className="mx-auto mb-4 opacity-50" />
                <p>Upload an image and click Submit to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}