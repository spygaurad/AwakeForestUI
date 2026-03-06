'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { UIAnnotation, isPointGeometry, Keypoint, SKELETON_CONNECTIONS, Label } from '../../types';


type DrawingMode = 'select' | 'point' | 'bbox' | 'polygon' | 'prompt-bbox';

interface PatchViewProps {
  tiffUrl: string;
  bbox: [number, number, number, number];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  annotations: UIAnnotation[];
  labels: Label[];
  selectedAnnotationId: string | null;
  onAnnotationSelect: (annotationId: string | null) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onAnnotationApprove: (annotationId: string) => void;
  onAnnotationCreate: (annotation: UIAnnotation) => void;
  drawingMode: DrawingMode;
  promptBboxes?: [number, number, number, number][];
  onPromptBboxCreate?: (bbox: [number, number, number, number]) => void;
}

export default function PatchView({
  tiffUrl,
  bbox,
  canvasRef,
  annotations,
  labels,
  selectedAnnotationId,
  onAnnotationSelect,
  onAnnotationDelete,
  onAnnotationApprove,
  onAnnotationCreate,
  drawingMode,
  promptBboxes = [],
  onPromptBboxCreate
}: PatchViewProps) {
  console.log('🎯 PatchView annotations:', annotations.length);

  const [minL, minB, maxL, maxB] = bbox;
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Track the selected annotation's bounding box position in pixels
  const [selectedBboxPixels, setSelectedBboxPixels] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>(null);

  // Bbox drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Get the selected annotation for displaying info
  const selectedAnnotation = annotations.find(ann => ann.id === selectedAnnotationId);

  const TILER_BASE = "http://localhost:8011";
  const imageUrl = `${TILER_BASE}/cog/bbox/${minL},${minB},${maxL},${maxB}.png?url=${encodeURIComponent(tiffUrl)}&width=800&height=800`;

  // Track the current bbox to detect patch changes
  const prevBboxRef = useRef<string>(JSON.stringify(bbox));

  // Helper functions for coordinate conversion
  const getPixelCoords = useCallback((lon: number, lat: number, width: number, height: number) => {
    const [w, s, e, n] = bbox;
    const x = ((lon - w) / (e - w)) * width;
    const y = ((n - lat) / (n - s)) * height;
    return { x, y };
  }, [bbox]);


  // Check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = useCallback((px: number, py: number, ring: number[][], width: number, height: number) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const { x: xi, y: yi } = getPixelCoords(ring[i][0], ring[i][1], width, height);
      const { x: xj, y: yj } = getPixelCoords(ring[j][0], ring[j][1], width, height);
      
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, [getPixelCoords]);

  // Find which annotation was clicked
  const findClickedAnnotation = useCallback((clickX: number, clickY: number): UIAnnotation | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const { width, height } = canvas;
    
    // Check annotations in reverse order (top-most first)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (!ann.isVisible || isPointGeometry(ann.geometry)) continue;
      
      const outerRing = ann.geometry.coordinates[0];
      if (!outerRing || outerRing.length === 0) continue;
      
      if (isPointInPolygon(clickX, clickY, outerRing, width, height)) {
        return ann;
      }
    }
    return null;
  }, [annotations, canvasRef, isPointInPolygon]);

  // Convert pixel coordinates to geo coordinates
  const pixelToGeo = useCallback((px: number, py: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const [west, south, east, north] = bbox;
    const lon = west + (px / canvas.width) * (east - west);
    const lat = north - (py / canvas.height) * (north - south);
    return { lon, lat };
  }, [bbox, canvasRef]);

  // Handle mouse down - start drawing bbox
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (drawingMode === 'bbox' || drawingMode === 'prompt-bbox') {
      setIsDrawing(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    } else if (drawingMode === 'select') {
      const clickedAnnotation = findClickedAnnotation(x, y);
      if (clickedAnnotation) {
        onAnnotationSelect(clickedAnnotation.id);
      } else {
        onAnnotationSelect(null);
      }
    }
  }, [canvasRef, drawingMode, findClickedAnnotation, onAnnotationSelect]);

  // Handle mouse move - update bbox being drawn
  const handleMouseMoveDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    setDrawCurrent({ x, y });
  }, [isDrawing, drawStart, canvasRef]);

  // Handle mouse up - finish drawing bbox
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Minimum bbox size (10 pixels)
    const dx = Math.abs(drawCurrent.x - drawStart.x);
    const dy = Math.abs(drawCurrent.y - drawStart.y);

    if (dx < 10 || dy < 10) {
      console.log('Bbox too small, ignoring');
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    // Create bbox in pixel coordinates
    const minX = Math.min(drawStart.x, drawCurrent.x);
    const minY = Math.min(drawStart.y, drawCurrent.y);
    const maxX = Math.max(drawStart.x, drawCurrent.x);
    const maxY = Math.max(drawStart.y, drawCurrent.y);

    // Handle prompt-bbox mode differently - only store pixel coords
    if (drawingMode === 'prompt-bbox') {
      if (onPromptBboxCreate) {
        const promptBbox: [number, number, number, number] = [
          Math.round(minX),
          Math.round(minY),
          Math.round(maxX),
          Math.round(maxY)
        ];
        console.log('🎯 Created prompt bbox:', promptBbox);
        onPromptBboxCreate(promptBbox);
      }
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    // Convert to geo coordinates for annotation bbox
    const topLeft = pixelToGeo(minX, minY);
    const bottomRight = pixelToGeo(maxX, maxY);

    if (!topLeft || !bottomRight) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    // Create UIAnnotation
    const newAnnotation: UIAnnotation = {
      id: `manual-${Date.now()}-${Math.random()}`,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [topLeft.lon, bottomRight.lat],
          [bottomRight.lon, bottomRight.lat],
          [bottomRight.lon, topLeft.lat],
          [topLeft.lon, topLeft.lat],
          [topLeft.lon, bottomRight.lat]
        ]],
        bbox: [topLeft.lon, bottomRight.lat, bottomRight.lon, topLeft.lat]
      },
      annotationType: 'bbox',
      displayLabel: 'Manual Bbox',
      isSaved: false,
      isVisible: true,
      pixelBbox: [minX, minY, maxX, maxY],
      properties: {}
    };

    console.log('✏️ Created manual bbox:', newAnnotation);
    onAnnotationCreate(newAnnotation);

    // Reset drawing state
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [isDrawing, drawStart, drawCurrent, canvasRef, pixelToGeo, onAnnotationCreate, drawingMode, onPromptBboxCreate]);

  // Combined mouse move handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle bbox drawing
    handleMouseMoveDrawing(event);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set cursor based on drawing mode
    if (drawingMode === 'select') {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (event.clientX - rect.left) * scaleX;
      const mouseY = (event.clientY - rect.top) * scaleY;
      const hoveredAnnotation = findClickedAnnotation(mouseX, mouseY);
      canvas.style.cursor = hoveredAnnotation ? 'pointer' : 'default';
    } else if (drawingMode === 'point') {
      canvas.style.cursor = 'crosshair';
    } else if (drawingMode === 'bbox') {
      canvas.style.cursor = 'crosshair';
    } else if (drawingMode === 'polygon') {
      canvas.style.cursor = 'crosshair';
    } else if (drawingMode === 'prompt-bbox') {
      canvas.style.cursor = 'crosshair';
    }
  }, [canvasRef, findClickedAnnotation, drawingMode, handleMouseMoveDrawing]);

  // Main rendering effect - loads image and draws annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect if this is a new patch
    const currentBboxStr = JSON.stringify(bbox);
    const isPatchChange = prevBboxRef.current !== currentBboxStr;

    const render = () => {
      if (!imgRef.current) return;

      // Always clear before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

      // Only draw annotations if we have them
      if (annotations.length > 0) {
        const selectedBounds = drawAnnotations(ctx, annotations, bbox, selectedAnnotationId, labels);
        setSelectedBboxPixels(selectedBounds);
      } else {
        setSelectedBboxPixels(null);
      }

      // Draw prompt bboxes (SAM3 bbox prompts)
      if (promptBboxes.length > 0) {
        promptBboxes.forEach((pbox, index) => {
          const [minX, minY, maxX, maxY] = pbox;

          ctx.save();
          // Orange dashed style for prompt bboxes
          ctx.strokeStyle = '#ff8c00';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

          // Semi-transparent orange fill
          ctx.fillStyle = 'rgba(255, 140, 0, 0.15)';
          ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

          // Draw label
          ctx.setLineDash([]);
          const label = `Prompt ${index + 1}`;
          ctx.font = 'bold 11px sans-serif';
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = '#ff8c00';
          ctx.fillRect(minX, minY - 16, tw + 10, 16);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, minX + 5, minY - 5);

          ctx.restore();
        });
      }

      // Draw temporary bbox while drawing
      if (isDrawing && drawStart && drawCurrent) {
        const minX = Math.min(drawStart.x, drawCurrent.x);
        const minY = Math.min(drawStart.y, drawCurrent.y);
        const maxX = Math.max(drawStart.x, drawCurrent.x);
        const maxY = Math.max(drawStart.y, drawCurrent.y);

        ctx.save();
        // Use orange for prompt-bbox mode, cyan for regular bbox mode
        const strokeColor = drawingMode === 'prompt-bbox' ? '#ff8c00' : '#00f2ff';
        const fillColor = drawingMode === 'prompt-bbox' ? 'rgba(255, 140, 0, 0.1)' : 'rgba(0, 242, 255, 0.1)';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

        // Fill with semi-transparent color
        ctx.fillStyle = fillColor;
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

        ctx.restore();
      }
    };

    // If patch changed or image URL changed, reload the image
    if (isPatchChange || !imgRef.current || imgRef.current.src !== imageUrl) {
      if (isPatchChange) {
        console.log('📍 Patch changed to:', bbox);
        // Clear canvas immediately on patch change
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSelectedBboxPixels(null);
        imgRef.current = null; // Force reload
        prevBboxRef.current = currentBboxStr;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      img.onload = () => {
        imgRef.current = img;
        console.log('🖼️ Patch image loaded, rendering', annotations.length, 'annotations');
        render();
      };

      img.onerror = () => {
        console.error('❌ Failed to load patch image');
      };
    } else {
      // Just re-render with existing image (annotations changed)
      console.log('🔄 Re-rendering', annotations.length, 'annotations');
      render();
    }
  }, [imageUrl, annotations, bbox, canvasRef, selectedAnnotationId, isDrawing, drawStart, drawCurrent, promptBboxes, drawingMode, labels]);

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * Draw an uncompressed COCO-style RLE mask onto ctx.
 * - rle.size = [h,w]
 * - rle.counts = number[] alternating background/foreground runs starting with background [web:22]
 * - RLE is over a Fortran-order flattened mask, so index mapping is x*h + y [web:22]
 */


function drawUncompressedRLEMask(
  ctx: CanvasRenderingContext2D,
  rle: { size: [number, number]; counts: number[] },
  colorHex: string,
  fillAlpha: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  const [maskH, maskW] = rle.size; // [h,w]
  if (!maskH || !maskW) return null;

  // If mask dims differ from canvas dims, we draw on an offscreen canvas then scale via drawImage
  const needsScale = maskW !== canvasW || maskH !== canvasH;

  const { r, g, b } = hexToRgb(colorHex);
  const alpha255 = Math.round(fillAlpha * 255);

  // Create ImageData at mask resolution
  const off = document.createElement("canvas");
  off.width = maskW;
  off.height = maskH;
  const offCtx = off.getContext("2d");
  if (!offCtx) return null;

  const img = offCtx.createImageData(maskW, maskH);
  const data = img.data;

  // Fill alpha in COCO-Fortran order first (fast contiguous fills)
  const alphaF = new Uint8ClampedArray(maskW * maskH);
  let idx = 0;
  let val = 0; // start with background run [web:22]
  for (const run of rle.counts) {
    if (val === 1) alphaF.fill(alpha255, idx, idx + run);
    idx += run;
    val = 1 - val;
  }

  // Convert COCO Fortran indexing -> canvas row-major pixels
  let minX = maskW, minY = maskH, maxX = -1, maxY = -1;

  for (let x = 0; x < maskW; x++) {
    for (let y = 0; y < maskH; y++) {
      const cocoIdx = x * maskH + y; // Fortran order index [web:22]
      const a = alphaF[cocoIdx];
      if (a === 0) continue;

      const p = (y * maskW + x) * 4;
      data[p + 0] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = a;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null; // empty mask

  offCtx.putImageData(img, 0, 0);

  // Draw onto main canvas (scaled if needed)
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = "source-over";
  if (needsScale) {
    ctx.drawImage(off, 0, 0, canvasW, canvasH);
  } else {
    ctx.drawImage(off, 0, 0);
  }
  ctx.restore();

  // Return bounds in canvas coordinates (scale bounds if needed)
  if (!needsScale) return { minX, minY, maxX, maxY };

  const sx = canvasW / maskW;
  const sy = canvasH / maskH;

  return {
    minX: Math.floor(minX * sx),
    minY: Math.floor(minY * sy),
    maxX: Math.floor((maxX + 1) * sx),
    maxY: Math.floor((maxY + 1) * sy),
  };
}

const drawAnnotations = (
  ctx: CanvasRenderingContext2D,
  anns: UIAnnotation[],
  bounds: [number, number, number, number],
  selectedId: string | null,
  labels: Label[]
): { minX: number; minY: number; maxX: number; maxY: number } | null => {
  const { width, height } = ctx.canvas;
  let selectedBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  // Helper: get label color by labelId
  const getLabelColor = (labelId?: string): string => {
    if (!labelId) return "#39ff14"; // Default green for unlabeled
    const label = labels.find(l => l.id === labelId);
    return label?.color || "#39ff14";
  };

  // Helper: convert geo coords to pixel coords
  const getPixelCoords = (lon: number, lat: number, w: number, h: number) => {
    const [west, south, east, north] = bounds;
    const x = ((lon - west) / (east - west)) * w;
    const y = ((north - lat) / (north - south)) * h;
    return { x, y };
  };

  // Helper: compute bounds from polygon ring already in pixel coords
  const boundsFromRingPx = (ringPx: { x: number; y: number }[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of ringPx) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX)) return null;
    return {
      minX: Math.floor(minX),
      minY: Math.floor(minY),
      maxX: Math.ceil(maxX),
      maxY: Math.ceil(maxY),
    };
  };

  for (const ann of anns) {
    if (!ann.isVisible) continue;

    const isSelected = ann.id === selectedId || (ann.isSelected ?? false);
    // Use label color if available, otherwise default; cyan highlight for selected
    const labelColor = getLabelColor(ann.labelId);
    const baseColor = isSelected ? "#00f2ff" : labelColor;
    const fillAlpha = isSelected ? 0.5 : 0.3;

    let annBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    
    console.log("RLE", ann.id, {
  size: ann.segmentationRLE?.size,
  countsType: typeof ann.segmentationRLE?.counts,
  countsIsArray: Array.isArray(ann.segmentationRLE?.counts),
  countsFirst: Array.isArray(ann.segmentationRLE?.counts) ? ann.segmentationRLE.counts.slice(0, 10) : null,
});

    
    // 1) Draw segmentation mask if present
    if (ann.segmentationRLE && Array.isArray(ann.segmentationRLE.counts)) {
      const maskBounds = drawUncompressedRLEMask(
        ctx,
        { size: ann.segmentationRLE.size, counts: ann.segmentationRLE.counts },
        baseColor,
        fillAlpha
      );
      if (maskBounds) annBounds = maskBounds;
    }

    // 2) Draw bbox if present (on top)
    if (ann.pixelBbox) {
      const [minX, minY, maxX, maxY] = ann.pixelBbox;

      ctx.save();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash([]);
      ctx.strokeRect(minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));
      ctx.restore();

      // Prefer bbox bounds (stable UI anchor)
      annBounds = { minX, minY, maxX, maxY };
    }

    // 3) Fallback: draw polygon outline if no bbox and no mask
    if (!annBounds && ann.geometry && !isPointGeometry(ann.geometry)) {
      const ring = ann.geometry.coordinates?.[0];
      if (ring && ring.length >= 2) {
        const ringPx = ring.map(([lon, lat]) => getPixelCoords(lon, lat, width, height));

        ctx.save();
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(ringPx[0].x, ringPx[0].y);
        for (let i = 1; i < ringPx.length; i++) ctx.lineTo(ringPx[i].x, ringPx[i].y);
        ctx.closePath();

        // optional: add a subtle fill so it's obvious
        ctx.globalAlpha = fillAlpha;
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.stroke();
        ctx.restore();

        annBounds = boundsFromRingPx(ringPx);
      }
    }

    // 4) Draw keypoints/skeleton if present (for pose detection)
    if (ann.keypoints && ann.keypoints.length > 0) {
      drawKeypoints(ctx, ann.keypoints, baseColor, isSelected);
      console.log(`  Drew ${ann.keypoints.length} keypoints for ${ann.displayLabel}`);
    }

    // 5) Label placement
    if (annBounds) {
      drawLabel(ctx, ann.displayLabel, annBounds.minX, annBounds.minY, baseColor, isSelected);
      if (isSelected) selectedBounds = annBounds;
    }
  }

  return selectedBounds;
};



// Helper for labels to keep the main function clean
function drawLabel(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, color: string, selected: boolean) {
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.font = selected ? 'bold 13px sans-serif' : 'bold 11px sans-serif';
  const tw = ctx.measureText(txt).width;
  const labelHeight = selected ? 20 : 16;

  ctx.fillStyle = color;
  ctx.fillRect(x, y - labelHeight, tw + 10, labelHeight);
  ctx.fillStyle = '#000000';
  ctx.fillText(txt, x + 5, y - (selected ? 6 : 5));
  ctx.restore();
}

// Color palette for different body parts
const KEYPOINT_COLORS: Record<string, string> = {
  nose: '#FF6B6B',
  left_eye: '#4ECDC4',
  right_eye: '#4ECDC4',
  left_ear: '#45B7D1',
  right_ear: '#45B7D1',
  left_shoulder: '#96CEB4',
  right_shoulder: '#96CEB4',
  left_elbow: '#FFEAA7',
  right_elbow: '#FFEAA7',
  left_wrist: '#DDA0DD',
  right_wrist: '#DDA0DD',
  left_hip: '#98D8C8',
  right_hip: '#98D8C8',
  left_knee: '#F7DC6F',
  right_knee: '#F7DC6F',
  left_ankle: '#BB8FCE',
  right_ankle: '#BB8FCE',
};

// Helper to draw keypoints and skeleton
function drawKeypoints(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  baseColor: string,
  isSelected: boolean,
  minConfidence: number = 0.3
) {
  ctx.save();

  // Filter keypoints by confidence
  const visibleKeypoints = keypoints.filter(kp => kp.confidence >= minConfidence);

  // Draw skeleton connections first (behind keypoints)
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.lineCap = 'round';

  for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
    const startKp = keypoints.find(kp => kp.index === startIdx);
    const endKp = keypoints.find(kp => kp.index === endIdx);

    if (
      startKp && endKp &&
      startKp.confidence >= minConfidence &&
      endKp.confidence >= minConfidence
    ) {
      // Gradient color based on body region
      const isArm = [5, 6, 7, 8, 9, 10].includes(startIdx) || [5, 6, 7, 8, 9, 10].includes(endIdx);
      const isLeg = [11, 12, 13, 14, 15, 16].includes(startIdx) || [11, 12, 13, 14, 15, 16].includes(endIdx);
      const isTorso = [5, 6, 11, 12].includes(startIdx) && [5, 6, 11, 12].includes(endIdx);

      let lineColor = baseColor;
      if (isArm) lineColor = '#FFEAA7';
      else if (isLeg) lineColor = '#F7DC6F';
      else if (isTorso) lineColor = '#98D8C8';

      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = isSelected ? 0.9 : 0.7;

      ctx.beginPath();
      ctx.moveTo(startKp.x, startKp.y);
      ctx.lineTo(endKp.x, endKp.y);
      ctx.stroke();
    }
  }

  // Draw keypoint circles
  for (const kp of visibleKeypoints) {
    const color = KEYPOINT_COLORS[kp.name] || baseColor;
    const radius = isSelected ? 6 : 4;

    // Outer glow for selected
    if (isSelected) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, radius + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main circle
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw keypoint name label for selected annotation
    if (isSelected && kp.confidence >= 0.5) {
      ctx.globalAlpha = 0.8;
      ctx.font = 'bold 9px sans-serif';
      const label = kp.name.replace('_', ' ');
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(kp.x + 8, kp.y - 6, tw + 4, 12);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, kp.x + 10, kp.y + 3);
    }
  }

  ctx.restore();
}

  // Calculate button position - centered above the annotation's top edge
  const buttonPosition = selectedBboxPixels ? {
    left: (selectedBboxPixels.minX + selectedBboxPixels.maxX) / 2,
    top: selectedBboxPixels.minY - 8 // 8px above the top edge
  } : null;

  return (
    <div className="relative shadow-2xl border border-white/10 bg-black flex items-center justify-center overflow-hidden rounded-sm">
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="w-[800px] h-[800px] object-contain"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Drawing mode indicator */}
      {drawingMode !== 'select' && (
        <div className={`absolute top-4 left-4 flex items-center gap-2 ${drawingMode === 'prompt-bbox' ? 'bg-orange-600/90' : 'bg-zinc-900/90'} text-white px-3 py-1.5 rounded-md shadow-lg animate-in fade-in slide-in-from-left-2 duration-200`}>
          <div className={`w-2 h-2 ${drawingMode === 'prompt-bbox' ? 'bg-orange-300' : 'bg-emerald-400'} rounded-full animate-pulse`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {drawingMode === 'point' && '📍 Point Mode'}
            {drawingMode === 'bbox' && '⬜ Box Mode'}
            {drawingMode === 'polygon' && '🔺 Polygon Mode'}
            {drawingMode === 'prompt-bbox' && '🎯 SAM3 Prompt Mode'}
          </span>
        </div>
      )}

      {/* Approve/Delete icons - positioned above selected annotation */}
      {selectedAnnotation && buttonPosition && (
        <div 
          className="absolute flex items-center gap-1 -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-90 duration-150"
          style={{
            left: buttonPosition.left,
            top: buttonPosition.top,
          }}
        >
          {/* Approve button - only show for unsaved (model) annotations */}
          {!selectedAnnotation.isSaved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnnotationApprove(selectedAnnotation.id);
              }}
              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors shadow-lg hover:scale-110 active:scale-95"
              title="Approve"
            >
              <Check size={14} strokeWidth={3} />
            </button>
          )}
          
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnnotationDelete(selectedAnnotation.id);
            }}
            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg hover:scale-110 active:scale-95"
            title="Delete"
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}