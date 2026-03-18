'use client';

import { useEffect, useRef } from 'react';
import type { GeoJSONGeometry } from '@/types/geo';

interface FootprintMiniMapProps {
  spatialExtent: GeoJSONGeometry | null;
}

export default function FootprintMiniMap({ spatialExtent }: FootprintMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Lazy-load Leaflet (browser only)
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Create a static, non-interactive mini-map
      const map = L.map(containerRef.current, {
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        zoomControl: false,
        attributionControl: false,
        touchZoom: false,
        keyboard: false,
        boxZoom: false,
      });

      mapRef.current = map;

      // Muted dark basemap tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      if (spatialExtent) {
        const layer = L.geoJSON(spatialExtent as GeoJSON.GeoJsonObject, {
          style: {
            color: '#c4985c',
            weight: 2,
            fillColor: 'rgba(196,152,92,0.18)',
            fillOpacity: 1,
          },
        }).addTo(map);

        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        }
      } else {
        // No spatial extent: show world view
        map.setView([20, 0], 1);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update footprint when spatialExtent changes without recreating the map
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Remove existing GeoJSON layers
      map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) map.removeLayer(layer);
      });

      if (spatialExtent) {
        const layer = L.geoJSON(spatialExtent as GeoJSON.GeoJsonObject, {
          style: {
            color: '#c4985c',
            weight: 2,
            fillColor: 'rgba(196,152,92,0.18)',
            fillOpacity: 1,
          },
        }).addTo(map);

        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        }
      }
    });
  }, [spatialExtent]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: '4/3',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#1a1e17',
      }}
    />
  );
}
