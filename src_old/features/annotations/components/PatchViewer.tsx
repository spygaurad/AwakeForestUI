'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Detection {
  center_x: number;
  center_y: number;
  width: number;
  height: number;
  class_name: string;
  confidence: number;
}

interface MaskResult {
  bbox: number[];
  class_name: string;
  confidence: number;
  segmentation?: number[][];
}

interface PatchViewerProps {
  tileUrl: string;
  detections?: Detection[];
  masks?: MaskResult[];
  showDetections?: boolean;
  showMasks?: boolean;
  size?: number;
}

// ─────────────────────────────────────────────────────────────
// Color Utility
// ─────────────────────────────────────────────────────────────

function classToColor(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function PatchViewer({
  tileUrl,
  detections = [],
  masks = [],
  showDetections = true,
  showMasks = true,
  size = 512,
}: PatchViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tile image
  useEffect(() => {
    setLoading(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setImage(img);
      setLoading(false);
    };
    
    img.onerror = () => {
      setError('Failed to load tile');
      setLoading(false);
    };
    
    img.src = tileUrl;
  }, [tileUrl]);

  // Draw base image
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
  }, [image, size]);

  // Draw overlays
  useEffect(() => {
    if (!overlayRef.current) return;
    
    const ctx = overlayRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    // Draw masks
    if (showMasks && masks.length > 0) {
      masks.forEach((mask) => {
        const [x1, y1, x2, y2] = mask.bbox;
        const color = classToColor(mask.class_name);
        
        // Fill
        ctx.fillStyle = color.replace(')', ', 0.2)').replace('hsl', 'hsla');
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        
        // Border (dashed)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.setLineDash([]);
        
        // Label
        drawLabel(ctx, mask.class_name, mask.confidence, x1, y1, color);
      });
    }

    // Draw detections
    if (showDetections && detections.length > 0) {
      detections.forEach((det) => {
        const x = det.center_x - det.width / 2;
        const y = det.center_y - det.height / 2;
        const color = classToColor(det.class_name);
        
        // Fill
        ctx.fillStyle = color.replace(')', ', 0.15)').replace('hsl', 'hsla');
        ctx.fillRect(x, y, det.width, det.height);
        
        // Border (solid)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, det.width, det.height);
        
        // Corner accents
        const cs = Math.min(10, det.width * 0.15);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y);
        ctx.moveTo(x + det.width - cs, y); ctx.lineTo(x + det.width, y); ctx.lineTo(x + det.width, y + cs);
        ctx.moveTo(x + det.width, y + det.height - cs); ctx.lineTo(x + det.width, y + det.height); ctx.lineTo(x + det.width - cs, y + det.height);
        ctx.moveTo(x + cs, y + det.height); ctx.lineTo(x, y + det.height); ctx.lineTo(x, y + det.height - cs);
        ctx.stroke();
        
        // Label
        drawLabel(ctx, det.class_name, det.confidence, x, y, color);
      });
    }
  }, [detections, masks, showDetections, showMasks, size]);

  // Helper to draw labels
  function drawLabel(ctx: CanvasRenderingContext2D, name: string, conf: number, x: number, y: number, color: string) {
    const text = `${name} ${Math.round(conf * 100)}%`;
    ctx.font = 'bold 11px system-ui, sans-serif';
    const tw = ctx.measureText(text).width;
    
    // Background
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y - 20, tw + 10, 18, 3);
    ctx.fill();
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x + 5, y - 6);
  }

  // Summary counts
  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    if (showDetections) {
      detections.forEach(d => counts.set(d.class_name, (counts.get(d.class_name) || 0) + 1));
    }
    if (showMasks) {
      masks.forEach(m => counts.set(m.class_name + ' (mask)', (counts.get(m.class_name + ' (mask)') || 0) + 1));
    }
    return counts;
  }, [detections, masks, showDetections, showMasks]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas Container */}
      <div 
        className="relative bg-slate-900 rounded-lg overflow-hidden"
        style={{ width: size, height: size }}
      >
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Base Canvas */}
        <canvas ref={canvasRef} width={size} height={size} className="block" />

        {/* Overlay Canvas */}
        <canvas 
          ref={overlayRef} 
          width={size} 
          height={size} 
          className="absolute inset-0 pointer-events-none" 
        />
      </div>

      {/* Class Summary */}
      {summary.size > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {Array.from(summary.entries()).map(([cls, count]) => {
            const baseClass = cls.replace(' (mask)', '');
            const color = classToColor(baseClass);
            return (
              <span
                key={cls}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium"
                style={{ 
                  backgroundColor: `${color}20`, 
                  color: color,
                  border: `1px solid ${color}40` 
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {cls}: {count}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}