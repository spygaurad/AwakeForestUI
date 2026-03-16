'use client';

import { useEffect, useRef } from 'react';
import { getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import type { Dataset } from '@/types/api';
import type { LayerStyle } from '@/features/maps/types';
import type L from 'leaflet';

export interface DatasetFootprintLayerProps {
  dataset: Dataset;
  visible: boolean;
  opacity: number;
  style: LayerStyle;
}

export function DatasetFootprintLayer({
  dataset,
  visible,
  opacity,
  style,
}: DatasetFootprintLayerProps) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const openFeaturePanel = useMapLayersStore.getState().openFeaturePanel;

  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    if (!visible || !dataset.spatial_extent) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureData: any = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: dataset.spatial_extent,
          properties: {
            id: dataset.id,
            name: dataset.name,
            status: dataset.status,
            item_count: dataset.item_count,
          },
        },
      ],
    };

    const layer = L.geoJSON(
      featureData,
      {
        style: () => ({
          color: style.color,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity * opacity,
          weight: style.weight,
          dashArray: '4 4',
          opacity,
        }),
        onEachFeature: (feature, featureLayer) => {
          featureLayer.on('click', (e: L.LeafletMouseEvent) => {
            openFeaturePanel({
              layerType: 'dataset',
              featureType: 'dataset',
              featureId: feature.properties?.id ?? dataset.id,
              properties: feature.properties ?? {},
              latlng: [e.latlng.lat, e.latlng.lng],
            });
          });
          featureLayer.bindTooltip(dataset.name, {
            sticky: true,
            className: 'leaflet-tooltip-dark',
          });
        },
      }
    );

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [dataset, visible, opacity, style, openFeaturePanel]);

  return null;
}
