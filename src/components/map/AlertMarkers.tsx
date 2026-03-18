'use client';

import { useEffect, useRef } from 'react';
import { getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore, markFeatureClick } from '@/stores/mapLayersStore';
import type { Alert } from '@/types/api';
import { ALERT_STATUS_COLORS } from '@/features/maps/mapColors';
import type L from 'leaflet';

export interface AlertMarkersProps {
  alerts: Alert[];
  visible: boolean;
  opacity: number;
}

const SEVERITY_SIZES: Record<string, number> = {
  critical: 14,
  warning: 11,
  info: 8,
};

function makePinSvg(color: string, size: number): string {
  const h = size * 1.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${h}" viewBox="0 0 ${size * 2} ${h}">
    <circle cx="${size}" cy="${size}" r="${size - 1}" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="1.5"/>
    <line x1="${size}" y1="${size * 2 - 1}" x2="${size}" y2="${h}" stroke="${color}" stroke-width="2"/>
  </svg>`;
}

export function AlertMarkers({ alerts, visible, opacity }: AlertMarkersProps) {
  const markersRef = useRef<L.Marker[]>([]);
  const openFeaturePanel = useMapLayersStore.getState().openFeaturePanel;

  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!visible || alerts.length === 0) return;

    const newMarkers: L.Marker[] = [];

    alerts.forEach((alert) => {
      const geom = alert.geometry;
      if (!geom) return;

      let lat: number | null = null;
      let lng: number | null = null;

      if (geom.type === 'Point') {
        [lng, lat] = geom.coordinates as [number, number];
      } else if (geom.type === 'Polygon' && geom.coordinates[0]?.length > 0) {
        const ring = geom.coordinates[0];
        lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
        lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      }

      if (lat === null || lng === null) return;

      const color = ALERT_STATUS_COLORS[alert.status] ?? ALERT_STATUS_COLORS.open;
      const size = SEVERITY_SIZES[alert.severity] ?? 10;
      const svgStr = makePinSvg(color, size);

      const icon = L.divIcon({
        html: svgStr,
        className: '',
        iconSize: [size * 2, size * 1.6],
        iconAnchor: [size, size * 1.6],
        popupAnchor: [0, -size * 1.6],
      });

      const marker = L.marker([lat, lng], { icon, opacity });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        markFeatureClick();
        openFeaturePanel({
          layerType: 'alert',
          featureType: 'alert',
          featureId: alert.id,
          properties: {
            id: alert.id,
            alert_type: alert.alert_type,
            severity: alert.severity,
            status: alert.status,
            title: alert.title,
            tracked_object_id: alert.tracked_object_id,
            created_at: alert.created_at,
          },
          latlng: [e.latlng.lat, e.latlng.lng],
        });
      });

      marker.bindTooltip(`${alert.title} (${alert.severity})`, { sticky: true });
      marker.addTo(map);
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [alerts, visible, opacity, openFeaturePanel]);

  return null;
}
