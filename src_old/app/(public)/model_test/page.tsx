"use client";
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Layers, Box } from 'lucide-react';

const API_BASE = 'http://localhost:8010';
const COG_BASE = 'http://localhost:8011/cog';
const COG_URL = 's3://geotiffs/orthomosaic/TESORO_ESCONDIDO_2_cog.tif';

interface Detection {
  center_x: number;
  center_y: number;
  width: number;
  height: number;
  class_name: string;
  item_name: string;
  confidence: number;
}

interface MaskResult {
  bbox: number[];
  class_name: string;
  item_name: string;
  confidence: number;
  segmentation: number[][];
}

interface SegmentationResponse {
  detections: Detection[];
  masks: MaskResult[];
}

interface COGInfo {
  bounds: number[];
  minzoom: number;
  maxzoom: number;
  width: number;
  height: number;
}

interface TileCoords {
  z: number;
  x: number;
  y: number;
}

export default function InferenceViewer() {
  const [cogInfo, setCogInfo] = useState<COGInfo | null>(null);
  const [currentTile, setCurrentTile] = useState<TileCoords>({ z: 14, x: 0, y: 0 });
  const [tileImage, setTileImage] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<SegmentationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelEndpoint, setModelEndpoint] = useState<string>('/segment/upload');
  const [showMasks, setShowMasks] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    fetchCOGInfo();
  }, []);

  useEffect(() => {
    if (cogInfo) {
      fetchTileAndInference();
    }
  }, [currentTile, cogInfo]);

  useEffect(() => {
    if (tileImage && inferenceResult) {
      drawOverlay();
    }
  }, [tileImage, inferenceResult, showMasks, showBoxes]);

  const fetchCOGInfo = async () => {
    try {
      const response = await fetch(`${COG_BASE}/info?url=${encodeURIComponent(COG_URL)}`);
      if (!response.ok) throw new Error('Failed to fetch COG info');
      const data = await response.json();
      setCogInfo(data);

      const startZ = Math.floor((data.minzoom + data.maxzoom) / 2);
      setCurrentTile({ z: startZ, x: 0, y: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchTileAndInference = async () => {
    setLoading(true);
    setError(null);

    try {
      const tileUrl = `${COG_BASE}/tiles/${currentTile.z}/${currentTile.x}/${currentTile.y}?url=${encodeURIComponent(COG_URL)}`;

      const tileResponse = await fetch(tileUrl);
      if (!tileResponse.ok) throw new Error('Tile not found');

      const tileBlob = await tileResponse.blob();
      const tileDataUrl = URL.createObjectURL(tileBlob);
      setTileImage(tileDataUrl);

      const formData = new FormData();
      formData.append('file', tileBlob, 'tile.png');

      const inferenceResponse = await fetch(`${API_BASE}${modelEndpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!inferenceResponse.ok) {
        throw new Error('Inference failed');
      }

      const result = await inferenceResponse.json();
      setInferenceResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setInferenceResult(null);
    } finally {
      setLoading(false);
    }
  };

  const drawOverlay = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !inferenceResult) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showMasks && inferenceResult.masks) {
      inferenceResult.masks.forEach((mask, idx) => {
        const color = getColorForClass(mask.class_name, idx);
        drawMask(ctx, mask.segmentation, color, 0.4);
      });
    }

    if (showBoxes && inferenceResult.detections) {
      inferenceResult.detections.forEach((det, idx) => {
        const color = getColorForClass(det.class_name, idx);
        drawBoundingBox(ctx, det, color);
      });
    }
  };

  const drawMask = (
    ctx: CanvasRenderingContext2D,
    mask: number[][],
    color: string,
    alpha: number
  ) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (mask[y][x] === 1) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    ctx.globalAlpha = 1.0;
  };

  const drawBoundingBox = (
    ctx: CanvasRenderingContext2D,
    detection: Detection,
    color: string
  ) => {
    const x = detection.center_x - detection.width / 2;
    const y = detection.center_y - detection.height / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, detection.width, detection.height);

    ctx.fillStyle = color;
    ctx.fillRect(x, y - 25, detection.width, 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `${detection.class_name} ${(detection.confidence * 100).toFixed(1)}%`,
      x + 5,
      y - 8
    );
  };

  const getColorForClass = (className: string, index: number): string => {
    const colors = ['#c19b5c', '#7e6228'];
    const hash = className.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleNext = () => {
    setCurrentTile(prev => ({ ...prev, x: prev.x + 1 }));
  };

  const handlePrevious = () => {
    if (currentTile.x > 0) {
      setCurrentTile(prev => ({ ...prev, x: prev.x - 1 }));
    }
  };

  const handleGoToTile = (x: number, y: number) => {
    setCurrentTile(prev => ({ ...prev, x, y }));
  };

  const handleZoomChange = (z: number) => {
    if (cogInfo && z >= cogInfo.minzoom && z <= cogInfo.maxzoom) {
      setCurrentTile(prev => ({ ...prev, z }));
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#7e6228' }}>
            Geospatial ML Inference Viewer
          </h1>
          <p style={{ color: '#7e6228' }}>Real-time segmentation and detection on satellite imagery</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#f5f5f5', borderColor: '#7e6228' }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#7e6228' }}>
                <Layers className="w-5 h-5" style={{ color: '#c19b5c' }} />
                Controls
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#7e6228' }}>
                    Model Endpoint
                  </label>
                  <select
                    value={modelEndpoint}
                    onChange={(e) => setModelEndpoint(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: '1px',
                      borderColor: '#7e6228',
                      color: '#7e6228'
                    }}
                  >
                    <option value="/segment/upload">YOLO + SAM2</option>
                    <option value="/segment/sam3/upload">YOLO + SAM3</option>
                    <option value="/predict/upload">YOLO Only</option>
                  </select>
                </div>

                {cogInfo && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#7e6228' }}>
                      Zoom Level: {currentTile.z}
                    </label>
                    <input
                      type="range"
                      min={cogInfo.minzoom}
                      max={cogInfo.maxzoom}
                      value={currentTile.z}
                      onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                      className="w-full"
                      style={{ accentColor: '#c19b5c' }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: '#7e6228' }}>
                      <span>Min: {cogInfo.minzoom}</span>
                      <span>Max: {cogInfo.maxzoom}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#7e6228' }}>
                      Tile X
                    </label>
                    <input
                      type="number"
                      value={currentTile.x}
                      onChange={(e) => handleGoToTile(parseInt(e.target.value) || 0, currentTile.y)}
                      className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'white',
                        borderWidth: '1px',
                        borderColor: '#7e6228',
                        color: '#7e6228'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#7e6228' }}>
                      Tile Y
                    </label>
                    <input
                      type="number"
                      value={currentTile.y}
                      onChange={(e) => handleGoToTile(currentTile.x, parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'white',
                        borderWidth: '1px',
                        borderColor: '#7e6228',
                        color: '#7e6228'
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrevious}
                    disabled={loading || currentTile.x <= 0}
                    className="flex-1 rounded-lg px-4 py-2 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      backgroundColor: currentTile.x <= 0 || loading ? '#e5e5e5' : '#c19b5c',
                      color: 'white'
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={loading}
                    className="flex-1 rounded-lg px-4 py-2 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      backgroundColor: loading ? '#e5e5e5' : '#c19b5c',
                      color: 'white'
                    }}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-4" style={{ borderTopWidth: '1px', borderTopColor: '#7e6228' }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: '#7e6228' }}>Display Options</h3>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={showMasks}
                      onChange={(e) => setShowMasks(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#c19b5c' }}
                    />
                    <span className="text-sm" style={{ color: '#7e6228' }}>Show Masks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBoxes}
                      onChange={(e) => setShowBoxes(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#c19b5c' }}
                    />
                    <span className="text-sm" style={{ color: '#7e6228' }}>Show Bounding Boxes</span>
                  </label>
                </div>
              </div>
            </div>

            {inferenceResult && (
              <div className="rounded-xl border p-4" style={{ backgroundColor: '#f5f5f5', borderColor: '#7e6228' }}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#7e6228' }}>
                  <Box className="w-5 h-5" style={{ color: '#c19b5c' }} />
                  Results
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: '#7e6228' }}>Detections:</span>
                    <span className="font-semibold" style={{ color: '#c19b5c' }}>
                      {inferenceResult.detections?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#7e6228' }}>Masks:</span>
                    <span className="font-semibold" style={{ color: '#c19b5c' }}>
                      {inferenceResult.masks?.length || 0}
                    </span>
                  </div>
                </div>

                {inferenceResult.detections && inferenceResult.detections.length > 0 && (
                  <div className="mt-4 pt-4" style={{ borderTopWidth: '1px', borderTopColor: '#7e6228' }}>
                    <h3 className="text-sm font-medium mb-2" style={{ color: '#7e6228' }}>Detected Objects</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {inferenceResult.detections.map((det, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-2 text-xs"
                          style={{
                            backgroundColor: 'white',
                            borderLeft: `3px solid ${getColorForClass(det.class_name, idx)}`
                          }}
                        >
                          <div className="font-semibold" style={{ color: '#7e6228' }}>{det.class_name}</div>
                          <div style={{ color: '#7e6228' }}>
                            Confidence: {(det.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-xl border p-6" style={{ backgroundColor: '#f5f5f5', borderColor: '#7e6228' }}>
              {error && (
                <div className="mb-4 border rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#fee', borderColor: '#fcc' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#c00' }} />
                  <div>
                    <h3 className="font-semibold" style={{ color: '#c00' }}>Error</h3>
                    <p className="text-sm mt-1" style={{ color: '#c00' }}>{error}</p>
                  </div>
                </div>
              )}

              <div className="relative rounded-lg overflow-hidden" style={{ minHeight: '500px', backgroundColor: 'white' }}>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#c19b5c' }} />
                      <p style={{ color: '#7e6228' }}>Processing tile and running inference...</p>
                    </div>
                  </div>
                )}

                {tileImage && (
                  <div className="relative inline-block">
                    <img
                      ref={imageRef}
                      src={tileImage}
                      alt="Satellite tile"
                      className="max-w-full h-auto"
                      onLoad={() => drawOverlay()}
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                )}

                {!tileImage && !loading && (
                  <div className="flex items-center justify-center h-96">
                    <p style={{ color: '#7e6228' }}>No image loaded</p>
                  </div>
                )}
              </div>

              <div className="mt-4 text-sm text-center" style={{ color: '#7e6228' }}>
                Tile: {currentTile.z}/{currentTile.x}/{currentTile.y}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
