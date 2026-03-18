'use client';

import { useEffect, useRef } from 'react';
import { useMapStore, getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { getAuthToken } from '@/lib/api/client';
import type { Dataset } from '@/types/api';
import type { LayerConfig, LayerStyle } from '@/features/maps/types';
import type L from 'leaflet';

export interface DatasetFootprintLayerProps {
  dataset: Dataset;
  visible: boolean;
  opacity: number;
  style: LayerStyle;
  layerConfig?: LayerConfig;
}

export function DatasetFootprintLayer({
  dataset,
  visible,
  opacity,
  style,
  layerConfig,
}: DatasetFootprintLayerProps) {
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const footprintLayerRef = useRef<L.GeoJSON | null>(null);
  const openFeaturePanel = useMapLayersStore.getState().openFeaturePanel;
  // Subscribe to Leaflet map readiness. getMapInstance() is a module-level var
  // (not reactive), so effects that call it must re-run when it transitions
  // null→map. Without this dep, the tile layer is never created when TileJSON
  // resolves before the dynamic-import of LeafletMap finishes loading.
  const mapReady = useMapStore((s) => s.mapReady);

  const tileUrl = layerConfig?.tileUrl;

  // ── COG tile layer (authenticated) ────────────────────────────────────────
  // L.tileLayer uses <img> elements which cannot send Authorization headers.
  // We subclass TileLayer and override createTile to use fetch + blob URLs,
  // injecting the Clerk JWT so the backend tile proxy accepts the request.
  useEffect(() => {
    const map = getMapInstance();
    if (!map || !tileUrl) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    if (!visible) return;

    type TileLayerCtor = new (url: string, opts?: L.TileLayerOptions) => L.TileLayer;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AuthTileLayer = (L.TileLayer as any).extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const img = L.DomUtil.create('img', 'leaflet-tile') as HTMLImageElement;
        img.alt = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const url = (this as any).getTileUrl(coords) as string;

        // getAuthToken() uses a 30 s in-memory cache (client.ts) so all concurrent
        // tile requests within a viewport burst share a single Clerk getToken() call
        // rather than each firing their own.
        getAuthToken()
          .then((token) =>
            fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
          )
          .then((r) => {
            if (!r.ok) throw new Error(`Tile ${r.status}`);
            return r.blob();
          })
          .then((blob) => {
            const objUrl = URL.createObjectURL(blob);
            img.onload = () => { URL.revokeObjectURL(objUrl); done(undefined, img); };
            img.onerror = () => { URL.revokeObjectURL(objUrl); done(new Error('tile load'), img); };
            img.src = objUrl;
          })
          .catch((e) => done(e as Error, img));

        return img;
      },
    }) as TileLayerCtor;

    const tileLayer = new AuthTileLayer(tileUrl, {
      opacity,
      minZoom: layerConfig?.tileMinZoom ?? 0,
      maxZoom: layerConfig?.tileMaxZoom ?? 24,
      tileSize: 256,
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      tileLayer.remove();
      tileLayerRef.current = null;
    };
  }, [tileUrl, visible, opacity, layerConfig?.tileMinZoom, layerConfig?.tileMaxZoom, mapReady]);

  // ── Footprint polygon (shown when no tile URL available) ───────────────────
  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // If we have a tile layer, don't also show the footprint
    if (tileUrl) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    if (footprintLayerRef.current) {
      footprintLayerRef.current.remove();
      footprintLayerRef.current = null;
    }

    if (!visible || !dataset.geometry) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureData: any = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: dataset.geometry,
          properties: {
            id: dataset.id,
            name: dataset.name,
            status: dataset.status,
          },
        },
      ],
    };

    const layer = L.geoJSON(featureData, {
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
    });

    layer.addTo(map);
    footprintLayerRef.current = layer;

    return () => {
      layer.remove();
      footprintLayerRef.current = null;
    };
  }, [dataset, visible, opacity, style, openFeaturePanel, tileUrl, mapReady]);

  return null;
}
