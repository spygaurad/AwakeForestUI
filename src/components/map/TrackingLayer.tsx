'use client';

import { useEffect, useRef } from 'react';
import { getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore, markFeatureClick } from '@/stores/mapLayersStore';
import type { TrackedObject } from '@/types/api';
import type { LayerStyle } from '@/features/maps/types';
import { PRIORITY_COLORS } from '@/features/maps/mapColors';
import type L from 'leaflet';

export interface TrackingLayerProps {
  trackedObjects: TrackedObject[];
  visible: boolean;
  opacity: number;
  style: LayerStyle;
}

export function TrackingLayer({
  trackedObjects,
  visible,
  opacity,
  style,
}: TrackingLayerProps) {
  const markersRef = useRef<L.CircleMarker[]>([]);
  const openFeaturePanel = useMapLayersStore.getState().openFeaturePanel;

  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!visible || trackedObjects.length === 0) return;

    const newMarkers: L.CircleMarker[] = [];

    trackedObjects.forEach((obj) => {
      // Use latest_geometry if available
      const geom = obj.latest_geometry;
      if (!geom) return;

      let lat: number | null = null;
      let lng: number | null = null;

      if (geom.type === 'Point') {
        [lng, lat] = geom.coordinates as [number, number];
      } else if (geom.type === 'Polygon' && geom.coordinates[0]?.length > 0) {
        // Use centroid approximation from first ring
        const ring = geom.coordinates[0];
        const sumLat = ring.reduce((s, c) => s + c[1], 0);
        const sumLng = ring.reduce((s, c) => s + c[0], 0);
        lat = sumLat / ring.length;
        lng = sumLng / ring.length;
      }

      if (lat === null || lng === null) return;

      // Color by priority — falls back to layer style.color for 'medium' and unknowns
      const markerColor = PRIORITY_COLORS[obj.priority] ?? style.color;

      const marker = L.circleMarker([lat, lng], {
        radius: style.radius,
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: style.fillOpacity * opacity,
        weight: style.weight,
        opacity,
      });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        markFeatureClick();
        openFeaturePanel({
          layerType: 'tracking',
          featureType: 'tracking',
          featureId: obj.id,
          properties: {
            id: obj.id,
            object_type: obj.object_type,
            status: obj.status,
            priority: obj.priority,
            severity: obj.severity,
            confidence_score: obj.confidence_score,
            observation_count: obj.observation_count,
            first_observed_at: obj.first_observed_at,
            last_observed_at: obj.last_observed_at,
          },
          latlng: [e.latlng.lat, e.latlng.lng],
        });
        // Show brief popup at click point
        L.popup({ closeButton: false, className: 'af-map-popup', offset: [0, -10], maxWidth: 220 })
          .setLatLng(e.latlng)
          .setContent(
            `<div class="af-popup-content">
              <div class="af-popup-title">${obj.object_type}</div>
              <div class="af-popup-sub">${obj.priority} priority · ${obj.status}</div>
            </div>`
          )
          .openOn(map);
      });

      marker.bindTooltip(`${obj.object_type} — ${obj.priority}`, { sticky: true });
      marker.addTo(map);
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [trackedObjects, visible, opacity, style, openFeaturePanel]);

  return null;
}
