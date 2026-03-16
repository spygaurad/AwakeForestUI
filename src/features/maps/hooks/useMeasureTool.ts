'use client';

import { useEffect, useRef } from 'react';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { getMapInstance } from '@/stores/mapStore';
import type L from 'leaflet';

// Haversine distance in meters
export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function useMeasureTool() {
  const { measurementActive, measurementPoints, addMeasurementPoint, clearMeasurement } =
    useMapLayersStore();
  const listenerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);

  const totalDistance = measurementPoints.reduce((acc, pt, i) => {
    if (i === 0) return 0;
    return acc + haversineM(measurementPoints[i - 1], pt);
  }, 0);

  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    if (!measurementActive) {
      if (listenerRef.current) {
        map.off('click', listenerRef.current);
        listenerRef.current = null;
      }
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      addMeasurementPoint([e.latlng.lat, e.latlng.lng]);
    };

    listenerRef.current = onClick;
    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
      map.getContainer().style.cursor = '';
    };
  }, [measurementActive, addMeasurementPoint]);

  return { measurementPoints, totalDistance, clearMeasurement };
}
