'use client';

import { useEffect, useRef, useState } from 'react';
import React from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Rectangle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const TITILER_ENDPOINT = 'http://localhost:8011';

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

async function fetchCogBounds(url: string): Promise<number[] | null> {
  try {
    const response = await fetch(
      `${TITILER_ENDPOINT}/cog/bounds?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    return data.bounds;
  } catch (error) {
    console.error('Failed to fetch COG bounds:', error);
    return null;
  }
}

function CogTileLayersWithBounds({ layers }: { layers: CogLayer[] }) {
  const map = useMap();
  const [layerBounds, setLayerBounds] = useState<Map<string, L.LatLngBounds>>(new Map());

  useEffect(() => {
    const loadBounds = async () => {
      const boundsMap = new Map<string, L.LatLngBounds>();

      for (const layer of layers) {
        const bounds = await fetchCogBounds(layer.url);
        if (bounds) {
          const leafletBounds = L.latLngBounds(
            [bounds[1], bounds[0]],
            [bounds[3], bounds[2]]
          );
          boundsMap.set(layer.id, leafletBounds);
        }
      }

      setLayerBounds(boundsMap);

      if (boundsMap.size > 0 && layerBounds.size === 0) { // Only fit on first load
        const allBounds = Array.from(boundsMap.values());
        const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds));
        map.fitBounds(combinedBounds, { padding: [50, 50] });
      }
    };

    loadBounds();
  }, [layers, map]);

  return (
    <>
      {layers.map((layer) => {
        const bounds = layerBounds.get(layer.id);

        return (
          <React.Fragment key={layer.id}>
            {bounds && (
              <TileLayer
                url={`${TITILER_ENDPOINT}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(layer.url)}`}
                opacity={layer.opacity}
                tileSize={256}
                minZoom={0}
                maxZoom={22}
                bounds={bounds}
              />
            )}

            {bounds && (
              <Rectangle
                bounds={bounds}
                pathOptions={{
                  color: '#3388ff',
                  weight: 2,
                  fill: false,
                  dashArray: '5, 5',
                }}
              >
                <Tooltip permanent direction="center">
                  {layer.name}
                </Tooltip>
              </Rectangle>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

function HeatmapLayer({
  points,
  radius,
  blur,
}: {
  points: Array<[number, number, number]>;
  radius: number;
  blur: number;
}) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    if (points.length > 0) {
      // @ts-ignore
      heatLayerRef.current = L.heatLayer(points, {
        radius: radius,
        blur: blur,
        maxZoom: 22,
        max: 1.0,
        gradient: {
          0.0: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          0.9: 'orange',
          1.0: 'red',
        },
      }).addTo(map);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [points, radius, blur, map]);

  return null;
}

export default function MultiCogViewer({
  cogLayers,
  coordinatePoints,
  heatmapPoints,
  heatmapRadius = 25,
  heatmapBlur = 15,
}: {
  cogLayers: CogLayer[];
  coordinatePoints: CoordinatePoint[];
  heatmapPoints: Array<[number, number, number]>;
  heatmapRadius?: number;
  heatmapBlur?: number;
}) {
  const center: [number, number] = [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={2}
      style={{ width: '100%', height: '100%' }}
      zoomControl
      preferCanvas
      worldCopyJump={true}
      maxBounds={undefined}
      maxBoundsViscosity={0}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        opacity={0.5}
        noWrap={false}
      />

      <CogTileLayersWithBounds layers={cogLayers} />

      {/* Coordinate Points with Hover Details */}
      {coordinatePoints.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.lat, point.lon]}
          radius={3}
          pathOptions={{
            fillColor: point.color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <div className="text-xs">
              <p className="font-bold text-sm mb-1">{point.label}</p>
              <p>
                <strong>Class:</strong> {point.class_name || 'N/A'}
              </p>
              {point.confidence !== undefined && (
                <p>
                  <strong>Confidence:</strong> {(point.confidence * 100).toFixed(1)}%
                </p>
              )}
              <p>
                <strong>Lat/Lon:</strong> {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
              </p>
              {point.width && point.height && (
                <p>
                  <strong>Size:</strong> {point.width.toFixed(0)} × {point.height.toFixed(0)}px
                </p>
              )}
              {point.x !== undefined && point.y !== undefined && (
                <p>
                  <strong>Pixel:</strong> ({point.x}, {point.y})
                </p>
              )}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      <HeatmapLayer points={heatmapPoints} radius={heatmapRadius} blur={heatmapBlur} />
    </MapContainer>
  );
}