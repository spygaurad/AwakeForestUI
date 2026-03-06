'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Eye, EyeOff, MapPin, Flame, Upload, Download } from 'lucide-react';

const MultiCogViewer = dynamic(
  () => import('@/components/cogtiffs/MultiCogViewer'),
  { ssr: false }
);

type CogLayer = {
  id: string;
  url: string;
  name: string;
  visible: boolean;
  opacity: number;
};

type CoordinatePoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  color: string;
  width?: number;
  height?: number;
  item_name?: string;
  class_name?: string;
  confidence?: number;
  x?: number;
  y?: number;
  center_x?: number;
  center_y?: number;
};

export default function ViewerPage() {
  const [cogLayers, setCogLayers] = useState<CogLayer[]>([
    {
      id: '1',
      url: 'http://127.0.0.1:9100/geotiffs/CANANDE3_cog.tif',
      name: 'CANANDE3',
      visible: true,
      opacity: 0.8,
    },
  ]);

  const [coordinatePoints, setCoordinatePoints] = useState<CoordinatePoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapRadius, setHeatmapRadius] = useState(25);
  const [heatmapBlur, setHeatmapBlur] = useState(15);

  // New COG form
  const [newCogUrl, setNewCogUrl] = useState('');
  const [newCogName, setNewCogName] = useState('');

  // CSV Import
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',');

      const points: CoordinatePoint[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',');
        const data: any = {};

        headers.forEach((header, index) => {
          data[header.trim()] = values[index];
        });

        const point: CoordinatePoint = {
          id: `csv-${i}-${Date.now()}`,
          lon: parseFloat(data.longitude),
          lat: parseFloat(data.latitude),
          label: data.item_name || data.class_name || `Point ${i}`,
          color: getColorByConfidence(parseFloat(data.confidence)),
          width: parseFloat(data.width),
          height: parseFloat(data.height),
          item_name: data.item_name,
          class_name: data.class_name,
          confidence: parseFloat(data.confidence),
          x: parseFloat(data.x),
          y: parseFloat(data.y),
          center_x: parseFloat(data.center_x),
          center_y: parseFloat(data.center_y),
        };

        if (!isNaN(point.lat) && !isNaN(point.lon)) {
          points.push(point);
        }
      }

      setCoordinatePoints([...coordinatePoints, ...points]);
      console.log(`✅ Imported ${points.length} points from CSV`);
    };

    reader.readAsText(file);
  };

  // Color by confidence
  const getColorByConfidence = (confidence: number): string => {
    if (confidence >= 0.9) return '#00FF00'; // Green - high confidence
    if (confidence >= 0.7) return '#FFFF00'; // Yellow - medium
    if (confidence >= 0.5) return '#FFA500'; // Orange - low
    return '#FF0000'; // Red - very low
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'longitude',
      'latitude',
      'width',
      'height',
      'item_name',
      'class_name',
      'x',
      'y',
      'center_x',
      'center_y',
      'confidence',
    ];

    const csvContent =
      headers.join(',') +
      '\n' +
      coordinatePoints
        .map((p) =>
          [
            p.lon,
            p.lat,
            p.width || '',
            p.height || '',
            p.item_name || '',
            p.class_name || '',
            p.x || '',
            p.y || '',
            p.center_x || '',
            p.center_y || '',
            p.confidence || '',
          ].join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `points-${Date.now()}.csv`;
    a.click();
  };

  // Add COG Layer
  const handleAddCog = () => {
    if (!newCogUrl || !newCogName) return;

    const newLayer: CogLayer = {
      id: Date.now().toString(),
      url: newCogUrl,
      name: newCogName,
      visible: true,
      opacity: 0.8,
    };

    setCogLayers([...cogLayers, newLayer]);
    setNewCogUrl('');
    setNewCogName('');
  };

  const toggleCogVisibility = (id: string) => {
    setCogLayers(
      cogLayers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const updateCogOpacity = (id: string, opacity: number) => {
    setCogLayers(
      cogLayers.map((layer) => (layer.id === id ? { ...layer, opacity } : layer))
    );
  };

  const removeCog = (id: string) => {
    setCogLayers(cogLayers.filter((layer) => layer.id !== id));
  };

  const removeCoordinate = (id: string) => {
    setCoordinatePoints(coordinatePoints.filter((p) => p.id !== id));
  };

  const clearAllPoints = () => {
    if (confirm('Clear all points?')) {
      setCoordinatePoints([]);
    }
  };

  // Convert points to heatmap format [lat, lon, intensity]
  const heatmapData: Array<[number, number, number]> = coordinatePoints.map((p) => [
    p.lat,
    p.lon,
    p.confidence || 1, // Use confidence as intensity
  ]);

  return (
    <div className="h-screen flex">
      {/* Map Area */}
      <div className="flex-1 relative">
        <MultiCogViewer
          cogLayers={cogLayers.filter((l) => l.visible)}
          coordinatePoints={coordinatePoints}
          heatmapPoints={showHeatmap ? heatmapData : []}
          heatmapRadius={heatmapRadius}
          heatmapBlur={heatmapBlur}
        />
      </div>

      {/* Control Sidebar */}
      <div className="w-96 bg-white border-l overflow-y-auto">
        {/* COG Layers Section */}
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-2">COG Layers</h2>
          <p className="text-sm text-gray-600">
            {cogLayers.filter((l) => l.visible).length} visible
          </p>
        </div>

        <div className="p-4 space-y-3 border-b">
          {cogLayers.map((layer) => (
            <div
              key={layer.id}
              className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center cursor-pointer flex-1">
                  <button
                    onClick={() => toggleCogVisibility(layer.id)}
                    className="mr-2"
                  >
                    {layer.visible ? (
                      <Eye className="w-4 h-4 text-blue-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <span className="font-medium text-sm">{layer.name}</span>
                </label>
                <button
                  onClick={() => removeCog(layer.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {layer.visible && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-600 flex justify-between">
                    <span>Opacity</span>
                    <span>{Math.round(layer.opacity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity * 100}
                    onChange={(e) =>
                      updateCogOpacity(layer.id, parseInt(e.target.value) / 100)
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add COG Form */}
        <div className="p-4 border-b bg-blue-50">
          <h3 className="font-bold text-sm mb-3 text-gray-800">Add COG Layer</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Layer Name"
              value={newCogName}
              onChange={(e) => setNewCogName(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="COG URL"
              value={newCogUrl}
              onChange={(e) => setNewCogUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={handleAddCog}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add COG
            </button>
          </div>
        </div>

        {/* Points & Heatmap Section */}
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Detection Points
          </h2>
          <p className="text-sm text-gray-600">{coordinatePoints.length} points</p>
        </div>

        {/* CSV Import/Export */}
        <div className="p-4 border-b bg-green-50">
          <h3 className="font-bold text-sm mb-3 text-gray-800">Import/Export CSV</h3>
          <div className="space-y-2">
            <label className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center justify-center cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportCSV}
              disabled={coordinatePoints.length === 0}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center disabled:bg-gray-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={clearAllPoints}
              disabled={coordinatePoints.length === 0}
              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center justify-center disabled:bg-gray-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Points
            </button>
          </div>
        </div>

        {/* Heatmap Controls */}
        <div className="p-4 border-b bg-orange-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-800 flex items-center">
              <Flame className="w-4 h-4 mr-2" />
              Heatmap
            </h3>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="text-sm px-2 py-1 bg-orange-200 rounded hover:bg-orange-300"
            >
              {showHeatmap ? 'Hide' : 'Show'}
            </button>
          </div>

          {showHeatmap && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 flex justify-between mb-1">
                  <span>Radius</span>
                  <span>{heatmapRadius}px</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 flex justify-between mb-1">
                  <span>Blur</span>
                  <span>{heatmapBlur}px</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={heatmapBlur}
                  onChange={(e) => setHeatmapBlur(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="text-xs text-gray-600 bg-white p-2 rounded">
                <p className="font-bold mb-1">Confidence Legend:</p>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 bg-green-500 mr-2"></div>
                  <span>≥ 0.9 (High)</span>
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 bg-yellow-500 mr-2"></div>
                  <span>0.7 - 0.9 (Medium)</span>
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 bg-orange-500 mr-2"></div>
                  <span>0.5 - 0.7 (Low)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 mr-2"></div>
                  <span>&lt; 0.5 (Very Low)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Points List */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {coordinatePoints.map((point) => (
            <div
              key={point.id}
              className="p-2 bg-gray-50 rounded hover:bg-gray-100 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <div
                    className="w-3 h-3 rounded-full mr-2 mt-1"
                    style={{ backgroundColor: point.color }}
                  />
                  <div className="text-xs flex-1">
                    <p className="font-medium">{point.label}</p>
                    <p className="text-gray-600">
                      {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
                    </p>
                    {point.confidence && (
                      <p className="text-gray-700 font-bold">
                        Confidence: {(point.confidence * 100).toFixed(1)}%
                      </p>
                    )}
                    {point.class_name && (
                      <p className="text-gray-600">Class: {point.class_name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeCoordinate(point.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}