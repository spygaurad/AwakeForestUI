'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, Popup, Marker } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

const TITILER_ENDPOINT = 'http://localhost:8011';

function FitBounds({ bounds }: { bounds?: number[] }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length === 4) {
      const leafletBounds: L.LatLngBoundsExpression = [
        [bounds[1], bounds[0]],
        [bounds[3], bounds[2]],
      ];
      map.fitBounds(leafletBounds, { padding: [20, 20] });
    }
  }, [bounds, map]);

  return null;
}

function ClickHandler() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      console.log('Clicked:', { lat, lng });
    };

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map]);

  return position ? (
    <Marker position={position}>
      <Popup>
        <div className="text-xs">
          <strong>Coordinates:</strong><br />
          Lat: {position[0].toFixed(6)}<br />
          Lon: {position[1].toFixed(6)}
        </div>
      </Popup>
    </Marker>
  ) : null;
}

export default function TiTilerViewer({
  cogUrl,
  bounds,
  opacity = 1.0,
}: {
  cogUrl: string;
  bounds?: number[];
  opacity?: number;
}) {
  const tileUrl = `${TITILER_ENDPOINT}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(cogUrl)}`;

  const center: [number, number] = bounds
    ? [(bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2]
    : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      zoomControl
      preferCanvas
    >
      {/* Optional: Base map for reference */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        opacity={0.3}
      />

      {/* COG Tiles from TiTiler */}
      <TileLayer
        url={tileUrl}
        attribution="TiTiler + MinIO"
        tileSize={256}
        opacity={opacity}
        minZoom={0}
        maxZoom={22}
      />

      <FitBounds bounds={bounds} />
      <ClickHandler />
    </MapContainer>
  );
}