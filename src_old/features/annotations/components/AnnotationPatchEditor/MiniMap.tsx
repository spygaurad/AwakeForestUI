'use client';

import React, { useMemo, useRef } from 'react';

interface MiniMapProps {
  tiffUrl: string;
  fullBounds: [number, number, number, number];
  patchBounds: [number, number, number, number];
  onJump: (lon: number, lat: number) => void;
}

export default function MiniMap({ tiffUrl, fullBounds, patchBounds, onJump }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const TILER_BASE = "http://localhost:8011";
  const thumbnailUrl = `${TILER_BASE}/cog/preview.png?url=${encodeURIComponent(tiffUrl)}&max_size=150`;

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !fullBounds) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    const [minLon, minLat, maxLon, maxLat] = fullBounds;
    onJump(minLon + (xPct * (maxLon - minLon)), maxLat - (yPct * (maxLat - minLat)));
  };

  const highlightStyle = useMemo(() => {
    if (!fullBounds || !patchBounds) return {};
    const [fMinL, fMinLat, fMaxL, fMaxLat] = fullBounds;
    const [pMinL, pMinLat, pMaxL, pMaxLat] = patchBounds;

    return {
      left: `${((pMinL - fMinL) / (fMaxL - fMinL)) * 100}%`,
      top: `${((fMaxLat - pMaxLat) / (fMaxLat - fMinLat)) * 100}%`,
      width: `${((pMaxL - pMinL) / (fMaxL - fMinL)) * 100}%`,
      height: `${((pMaxLat - pMinLat) / (fMaxLat - fMinLat)) * 100}%`,
    };
  }, [fullBounds, patchBounds]);

  return (
    <div 
      ref={containerRef} 
      onClick={handleClick} 
      className="w-full h-full relative group/map overflow-hidden cursor-crosshair bg-black/20"
    >
      <img 
        src={thumbnailUrl} 
        className="w-full h-full object-contain opacity-30 group-hover/map:opacity-50 transition-opacity grayscale" 
        alt="Thumbnail" 
      />
      
      {/* High-Visibility Filled Box */}
      <div 
        className="absolute 
          bg-[#695221] 
          border-2 border-[#ffcc66] 
          shadow-[0_0_12px_rgba(255,204,102,0.5)] 
          transition-all duration-300 pointer-events-none
          flex items-center justify-center" 
        style={highlightStyle}
      >
        {/* Optional: Small center dot for precision */}
        <div className="w-1 h-1 bg-[#ffcc66] rounded-full opacity-50" />
      </div>
    </div>
  );
}