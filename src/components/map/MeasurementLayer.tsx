'use client';

import { useEffect, useRef } from 'react';
import { getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import type L from 'leaflet';

export function MeasurementLayer() {
  const measurementPoints = useMapLayersStore((s) => s.measurementPoints);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Remove previous layers
    polylineRef.current?.remove();
    polylineRef.current = null;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (measurementPoints.length === 0) return;

    // Draw polyline if 2+ points
    if (measurementPoints.length >= 2) {
      const polyline = L.polyline(measurementPoints, {
        color: '#c4985c',
        weight: 2,
        dashArray: '6 4',
        opacity: 0.9,
      });
      polyline.addTo(map);
      polylineRef.current = polyline;
    }

    // Draw point markers at each measurement point
    const markers: L.CircleMarker[] = measurementPoints.map((pt, i) => {
      const isFirst = i === 0;
      const isLast = i === measurementPoints.length - 1;
      const marker = L.circleMarker(pt, {
        radius: isFirst || isLast ? 6 : 4,
        color: '#c4985c',
        fillColor: isFirst ? '#1c2119' : '#c4985c',
        fillOpacity: 1,
        weight: 2,
      });
      marker.addTo(map);
      return marker;
    });

    markersRef.current = markers;

    return () => {
      polylineRef.current?.remove();
      polylineRef.current = null;
      markers.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [measurementPoints]);

  return null;
}
