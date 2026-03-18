'use client';

import { useEffect, useRef } from 'react';
import { getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore, markFeatureClick } from '@/stores/mapLayersStore';
import type { Annotation } from '@/types/api';
import type { LayerStyle } from '@/features/maps/types';
import { computeGeoStats, fmtCoord } from '@/features/maps/utils/geoStats';
import type L from 'leaflet';

export interface AnnotationRendererProps {
  layerKey: string; // e.g. "annotation-tree"
  annotations: Annotation[];
  visible: boolean;
  opacity: number;
  style: LayerStyle;
}

export function AnnotationRenderer({
  layerKey,
  annotations,
  visible,
  opacity,
  style,
}: AnnotationRendererProps) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const openFeaturePanel = useMapLayersStore.getState().openFeaturePanel;

  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Remove old layer
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    if (!visible || annotations.length === 0) return;

    const geoJsonLayer = L.geoJSON(
      annotations.map((a) => ({
        type: 'Feature' as const,
        geometry: a.geometry,
        properties: {
          id: a.id,
          label: a.label,
          confidence: a.confidence,
          source: a.source,
          status: a.status,
          version: a.version,
          created_at: a.created_at,
          // Store current layer style so the panel can show initial values
          _color: style.color,
          _fillColor: style.fillColor,
          _fillOpacity: style.fillOpacity,
          _weight: style.weight,
          _dashArray: style.dashArray ?? '',
        },
      })),
      {
        style: () => ({
          color: style.color,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity * opacity,
          weight: style.weight,
          dashArray: style.dashArray,
        }),
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            radius: style.radius,
            color: style.color,
            fillColor: style.fillColor,
            fillOpacity: style.fillOpacity * opacity,
            weight: style.weight,
          }),
        onEachFeature: (feature, layer) => {
          layer.on('click', (e: L.LeafletMouseEvent) => {
            // Stop propagation so Geoman drawn-layer click handlers don't also fire
            L.DomEvent.stopPropagation(e);
            markFeatureClick();

            // Compute geometry stats for the right panel
            const geomStats = feature.geometry
              ? computeGeoStats(feature.geometry as Parameters<typeof computeGeoStats>[0])
              : { featureType: 'annotation', stats: {} };

            // For point annotations, compute lat/lng from geometry
            const pointCoords =
              feature.geometry?.type === 'Point'
                ? {
                    latitude:  fmtCoord((feature.geometry.coordinates as [number, number])[1], 'lat'),
                    longitude: fmtCoord((feature.geometry.coordinates as [number, number])[0], 'lng'),
                  }
                : {};

            openFeaturePanel({
              layerType: 'annotation',
              featureType: geomStats.featureType,
              featureId: feature.properties?.id ?? layerKey,
              properties: {
                ...feature.properties,
                ...geomStats.stats,
                ...pointCoords,
              },
              latlng: [e.latlng.lat, e.latlng.lng],
              layerRef: layer,
            });

            // Brief popup at click point
            const label = feature.properties?.label ?? 'Annotation';
            L.popup({ closeButton: false, className: 'af-map-popup', offset: [0, -6], maxWidth: 220 })
              .setLatLng(e.latlng)
              .setContent(
                `<div class="af-popup-content">
                  <div class="af-popup-title">${label}</div>
                  <div class="af-popup-sub">See details in panel →</div>
                </div>`
              )
              .openOn(map);
          });
        },
      }
    );

    geoJsonLayer.setStyle({ opacity });
    geoJsonLayer.addTo(map);
    layerRef.current = geoJsonLayer;

    return () => {
      geoJsonLayer.remove();
      layerRef.current = null;
    };
  }, [annotations, visible, opacity, style, layerKey, openFeaturePanel]);

  return null;
}
