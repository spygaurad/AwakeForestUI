'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import { useMapStore, setMapInstance } from '@/stores/mapStore';
import type { GeoJSONGeometry } from '@/types/geo';

// Fix Leaflet default marker icon paths broken by webpack asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASEMAPS: Record<string, { url: string; attribution: string; maxNativeZoom: number }> = {
  // CartoDB Voyager — English-first labels, clean cartographic style
  osm: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '© <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 19,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '© <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '© <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
  },
};

// Geoman draw mode names keyed by our DrawTool type
const GEOMAN_MODE: Record<string, string> = {
  point: 'Marker',
  polyline: 'Line',
  polygon: 'Polygon',
  rectangle: 'Rectangle',
  circle: 'Circle',
};

// Web Mercator valid latitude range
const MAP_BOUNDS = L.latLngBounds(L.latLng(-85.051129, -Infinity), L.latLng(85.051129, Infinity));
const MIN_ZOOM = 2;

export default function LeafletMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    // Guard: skip on React Strict Mode double-effect
    if (!container || mapRef.current) return;

    const { center, zoom } = useMapStore.getState();

    const map = L.map(container, {
      center,
      zoom,
      minZoom: MIN_ZOOM,
      zoomControl: true,
      preferCanvas: true,
      worldCopyJump: true,
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 1.0,
    });
    mapRef.current = map;
    setMapInstance(map);

    // ── Tile layer ─────────────────────────────────────────
    const initialBasemapId = useMapStore.getState().activeBasemapId ?? 'osm';
    const initialBm = BASEMAPS[initialBasemapId] ?? BASEMAPS.osm;
    tileLayerRef.current = L.tileLayer(initialBm.url, {
      attribution: initialBm.attribution,
      maxNativeZoom: initialBm.maxNativeZoom,
      maxZoom: 22,
    }).addTo(map);

    // ── Geoman config — no native toolbar (toolbar lives in MapTopBar) ──
    if (map.pm) {
      map.pm.setGlobalOptions({ snappable: true, snapDistance: 20 });
      map.pm.setPathOptions({
        color: '#8c6d2c',
        fillColor: '#8c6d2c',
        fillOpacity: 0.15,
        weight: 2,
      });
    }

    // ── Map events → store ──────────────────────────────────
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      useMapStore.getState().setCursorLatLng([e.latlng.lat, e.latlng.lng]);
    });
    map.on('mouseout', () => {
      useMapStore.getState().setCursorLatLng(null);
    });
    map.on('zoomend', () => {
      const c = map.getCenter();
      useMapStore.getState().setCenter([c.lat, c.lng], map.getZoom());
    });
    map.on('moveend', () => {
      const c = map.getCenter();
      useMapStore.getState().setCenter([c.lat, c.lng]);
    });
    map.on('pm:create', (e: L.LeafletEvent & { layer: L.Layer }) => {
      const layer = e.layer as L.Layer & { toGeoJSON(): { geometry: GeoJSONGeometry } };
      if (layer.toGeoJSON) {
        useMapStore.getState().setDrawnGeometry(layer.toGeoJSON().geometry);
      }
      // Auto-return to select mode after placing a shape
      useMapStore.getState().setActiveDrawTool(null);
    });
    map.on('pm:remove', () => {
      useMapStore.getState().setDrawnGeometry(null);
    });

    // ── Invalidate size when container resizes ──────────────
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(container);

    // ── Reactive basemap swap ───────────────────────────────
    const unsubBasemap = useMapStore.subscribe((state, prev) => {
      if (state.activeBasemapId === prev.activeBasemapId) return;
      if (!mapRef.current) return;
      tileLayerRef.current?.remove();
      const bm = BASEMAPS[state.activeBasemapId ?? 'osm'] ?? BASEMAPS.osm;
      tileLayerRef.current = L.tileLayer(bm.url, {
        attribution: bm.attribution,
        maxNativeZoom: bm.maxNativeZoom,
        maxZoom: 22,
      }).addTo(mapRef.current);
    });

    // ── Reactive draw tool — calls Geoman on tool change ────
    const unsubDrawTool = useMapStore.subscribe((state, prev) => {
      if (state.activeDrawTool === prev.activeDrawTool) return;
      const m = mapRef.current;
      if (!m?.pm) return;

      // Disable current draw/edit mode first
      m.pm.disableDraw();
      m.pm.disableGlobalEditMode();
      m.pm.disableGlobalRemovalMode();

      const geomanMode = state.activeDrawTool
        ? GEOMAN_MODE[state.activeDrawTool]
        : null;
      if (geomanMode) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        m.pm.enableDraw(geomanMode as any);
      }
    });

    return () => {
      ro.disconnect();
      unsubBasemap();
      unsubDrawTool();
      setMapInstance(null);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
