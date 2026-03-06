'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const TiTilerViewer = dynamic(
  () => import('@/components/cogtiffs/TiTilerViewer'),
  { ssr: false }
);

const TITILER_ENDPOINT = 'http://localhost:8011';
const COG_URL = 's3://geotiffs/orthomosaic/CANANDE3_cog.tif';

export default function TestCogPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${TITILER_ENDPOINT}/cog/info?url=${encodeURIComponent(COG_URL)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('✅ COG Info:', data);
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ Error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading CANANDE3...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-900 text-white p-8">
        <div>
          <h1 className="text-2xl font-bold mb-4">❌ Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Info Bar */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center z-10 shadow-lg">
        <div>
          <h1 className="text-xl font-bold">CANANDE3 - TiTiler Streaming</h1>
          <p className="text-sm text-gray-400">Cloud Optimized GeoTIFF</p>
        </div>
        {info && (
          <div className="text-right text-sm space-y-1">
            <p><strong>Size:</strong> {info.width.toLocaleString()} × {info.height.toLocaleString()} px</p>
            <p><strong>Bands:</strong> {info.count} (RGB)</p>
            <p><strong>Zoom:</strong> {info.minzoom} - {info.maxzoom}</p>
            <p className="text-xs text-gray-400">
              Bounds: [{info.bounds[0].toFixed(5)}, {info.bounds[1].toFixed(5)}, 
              {info.bounds[2].toFixed(5)}, {info.bounds[3].toFixed(5)}]
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        <TiTilerViewer cogUrl={COG_URL} bounds={info?.bounds} />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-xs z-10">
        <h3 className="font-bold mb-2">Controls</h3>
        <ul className="text-sm space-y-1">
          <li>🖱️ Scroll to zoom</li>
          <li>🤏 Drag to pan</li>
          <li>📍 Click for coordinates</li>
        </ul>
      </div>
    </div>
  );
}