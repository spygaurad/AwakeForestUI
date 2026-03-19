/**
 * MapManager — Imperative singleton bridge between Zustand state and Leaflet.
 *
 * Rules:
 * - This is NOT Zustand state. It's a module-level singleton.
 * - All Leaflet layer instances live here — never in React state or Zustand.
 * - React components call MapManager methods via useMapSync or direct access.
 * - MapManager never triggers React re-renders — it only mutates Leaflet.
 */

import type L from 'leaflet';
import type { LayerConfig, LayerStyle } from './types';
import type { Annotation, TrackedObject, Alert } from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';
import type { GeoJSONFeatureCollection } from '@/lib/api/annotation-sets';
import { useMapLayersStore, markFeatureClick } from '@/stores/mapLayersStore';
import { getAuthToken } from '@/lib/api/client';
import { PRIORITY_COLORS, ALERT_STATUS_COLORS } from './mapColors';
import { computeGeoStats, fmtCoord } from './utils/geoStats';

// ── Singleton ────────────────────────────────────────────────────────────────

let _instance: MapManager | null = null;

export function getMapManager(): MapManager {
  if (!_instance) _instance = new MapManager();
  return _instance;
}

// ── Alert helpers (ported from AlertMarkers.tsx) ─────────────────────────────

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

// ── Geometry helpers ─────────────────────────────────────────────────────────

function extractLatLng(geom: GeoJSONGeometry | null): [number, number] | null {
  if (!geom) return null;
  if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates;
    return [lat, lng];
  }
  if (geom.type === 'Polygon' && geom.coordinates[0]?.length > 0) {
    const ring = geom.coordinates[0];
    const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    return [lat, lng];
  }
  return null;
}

// ── MapManager class ─────────────────────────────────────────────────────────

export class MapManager {
  private map: L.Map | null = null;
  private leafletLayers = new Map<string, L.Layer>();
  /** Raw data for GeoJSON-type layers (annotations, tracking, alerts, footprints) */
  private dataStore = new Map<string, unknown>();
  /** Tracks which layers are currently added to the map (vs hidden) */
  private onMap = new Set<string>();
  /** Reference to Leaflet module (loaded once in init) */
  private L: typeof import('leaflet') | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  init(map: L.Map): void {
    this.map = map;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    this.L = require('leaflet') as typeof import('leaflet');
  }

  destroy(): void {
    // Remove all managed layers
    for (const [id] of this.leafletLayers) {
      this.removeLayer(id);
    }
    this.leafletLayers.clear();
    this.dataStore.clear();
    this.onMap.clear();
    this.map = null;
    this.L = null;
  }

  getMap(): L.Map | null {
    return this.map;
  }

  // ── Layer lifecycle ────────────────────────────────────────────────────────

  /**
   * Add or replace a layer. Called by useMapSync when a new LayerConfig appears.
   * For tile layers, this creates the Leaflet tile layer immediately.
   * For data layers (annotation/tracking/alert), this creates the layer only
   * if data has already been pushed via setLayerData.
   */
  addLayer(config: LayerConfig): void {
    if (!this.map || !this.L) return;

    // Remove existing layer with this id first
    if (this.leafletLayers.has(config.id)) {
      this.removeLayerFromMap(config.id);
    }

    const layer = this.createLayer(config);
    if (!layer) return;

    this.leafletLayers.set(config.id, layer);

    if (config.visible) {
      layer.addTo(this.map);
      this.onMap.add(config.id);
    }
  }

  removeLayer(id: string): void {
    this.removeLayerFromMap(id);
    this.leafletLayers.delete(id);
    this.dataStore.delete(id);
  }

  // ── Layer property updates ─────────────────────────────────────────────────

  setLayerVisible(id: string, visible: boolean): void {
    if (!this.map) return;
    const layer = this.leafletLayers.get(id);
    if (!layer) return;

    if (visible && !this.onMap.has(id)) {
      layer.addTo(this.map);
      this.onMap.add(id);
    } else if (!visible && this.onMap.has(id)) {
      this.map.removeLayer(layer);
      this.onMap.delete(id);
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.leafletLayers.get(id);
    if (!layer) return;

    // TileLayer has setOpacity
    if ('setOpacity' in layer && typeof (layer as L.TileLayer).setOpacity === 'function') {
      (layer as L.TileLayer).setOpacity(opacity);
      return;
    }

    // GeoJSON / LayerGroup — update style on children
    if ('eachLayer' in layer && typeof (layer as L.LayerGroup).eachLayer === 'function') {
      (layer as L.LayerGroup).eachLayer((child) => {
        if ('setStyle' in child && typeof (child as L.Path).setStyle === 'function') {
          (child as L.Path).setStyle({ opacity, fillOpacity: undefined });
        }
        if ('setOpacity' in child && typeof (child as L.Marker).setOpacity === 'function') {
          (child as L.Marker).setOpacity(opacity);
        }
      });
    }
  }

  setLayerStyle(id: string, style: LayerStyle, config?: LayerConfig): void {
    const layer = this.leafletLayers.get(id);
    if (!layer) return;

    const opacity = config?.opacity ?? 1;

    // GeoJSON layers — update style
    if ('setStyle' in layer && typeof (layer as L.GeoJSON).setStyle === 'function') {
      (layer as L.GeoJSON).setStyle({
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity * opacity,
        weight: style.weight,
        dashArray: style.dashArray,
      });
    }
  }

  // ── Data layer updates ─────────────────────────────────────────────────────

  /**
   * Push feature data for a layer. Used for annotation, tracking, alert,
   * and dataset footprint layers. Rebuilds the Leaflet layer with new data.
   */
  setLayerData(id: string, data: unknown): void {
    this.dataStore.set(id, data);

    // Only rebuild if we have a config for this layer
    const config = useMapLayersStore.getState().layers[id];
    if (!config) return;

    this.rebuildDataLayer(id, config);
  }

  /**
   * Rebuild a tile layer when tileUrl or tile config changes.
   */
  rebuildTileLayer(id: string, config: LayerConfig): void {
    if (!this.map || !this.L) return;

    this.removeLayerFromMap(id);
    const layer = this.createTileLayer(config);
    if (!layer) return;

    this.leafletLayers.set(id, layer);
    if (config.visible) {
      layer.addTo(this.map);
      this.onMap.add(id);
    }
  }

  // ── View controls ──────────────────────────────────────────────────────────

  fitBounds(bounds: [number, number, number, number], options?: L.FitBoundsOptions): void {
    if (!this.map) return;
    const [west, south, east, north] = bounds;
    this.map.fitBounds(
      [[south, west], [north, east]],
      { padding: [40, 40], maxZoom: 16, ...options }
    );
  }

  flyTo(center: [number, number], zoom?: number): void {
    if (!this.map) return;
    this.map.flyTo(center, zoom ?? this.map.getZoom());
  }

  // ── Has layer check ────────────────────────────────────────────────────────

  hasLayer(id: string): boolean {
    return this.leafletLayers.has(id);
  }

  // ── Internal: layer creation ───────────────────────────────────────────────

  private createLayer(config: LayerConfig): L.Layer | null {
    // Tile-based layers
    if (config.tileUrl) {
      return this.createTileLayer(config);
    }

    // Data-backed layers — check if data has been pushed
    const data = this.dataStore.get(config.id);
    if (!data) return null;

    return this.createDataLayer(config, data);
  }

  private createTileLayer(config: LayerConfig): L.TileLayer | null {
    if (!this.L || !config.tileUrl) return null;

    const needsAuth = config.sourceType === 'dataset' || config.sourceType === 'stac_item';

    if (needsAuth) {
      return this.createAuthTileLayer(config.tileUrl, config);
    }

    return this.L.tileLayer(config.tileUrl, {
      opacity: config.opacity,
      minZoom: config.tileMinZoom ?? 0,
      maxZoom: config.tileMaxZoom ?? 24,
      tileSize: 256,
    });
  }

  private createAuthTileLayer(url: string, config: LayerConfig): L.TileLayer {
    const L = this.L!;

    type TileLayerCtor = new (url: string, opts?: L.TileLayerOptions) => L.TileLayer;

    // Subclass TileLayer to inject Clerk JWT via fetch + blob URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AuthTileLayer = (L.TileLayer as any).extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const img = L.DomUtil.create('img', 'leaflet-tile') as HTMLImageElement;
        img.alt = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tileUrl = (this as any).getTileUrl(coords) as string;

        getAuthToken()
          .then((token) =>
            fetch(tileUrl, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
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

    return new AuthTileLayer(url, {
      opacity: config.opacity,
      minZoom: config.tileMinZoom ?? 0,
      maxZoom: config.tileMaxZoom ?? 24,
      tileSize: 256,
    });
  }

  private createDataLayer(config: LayerConfig, data: unknown): L.Layer | null {
    // Annotation set layers receive GeoJSON FeatureCollection directly
    if (config.sourceType === 'annotation_set') {
      return this.createAnnotationSetLayer(config, data as GeoJSONFeatureCollection);
    }

    switch (config.type) {
      case 'annotation':
        return this.createAnnotationLayer(config, data as Annotation[]);
      case 'tracking':
        return this.createTrackingLayer(config, data as TrackedObject[]);
      case 'alert':
        return this.createAlertLayer(config, data as Alert[]);
      case 'dataset':
        // Dataset without tileUrl → footprint polygon
        return this.createFootprintLayer(config, data as DatasetFootprintData);
      default:
        return null;
    }
  }

  private createAnnotationLayer(config: LayerConfig, annotations: Annotation[]): L.GeoJSON | null {
    if (!this.L || annotations.length === 0) return null;
    const L = this.L;
    const { style, opacity } = config;

    const features = annotations.map((a) => ({
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
        _color: style.color,
        _fillColor: style.fillColor,
        _fillOpacity: style.fillOpacity,
        _weight: style.weight,
        _dashArray: style.dashArray ?? '',
      },
    }));

    const geoJsonLayer = L.geoJSON(features, {
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
          L.DomEvent.stopPropagation(e);
          markFeatureClick();

          const geomStats = feature.geometry
            ? computeGeoStats(feature.geometry as Parameters<typeof computeGeoStats>[0])
            : { featureType: 'annotation', stats: {} };

          const pointCoords =
            feature.geometry?.type === 'Point'
              ? {
                  latitude: fmtCoord((feature.geometry.coordinates as [number, number])[1], 'lat'),
                  longitude: fmtCoord((feature.geometry.coordinates as [number, number])[0], 'lng'),
                }
              : {};

          useMapLayersStore.getState().openFeaturePanel({
            layerType: 'annotation',
            featureType: geomStats.featureType,
            featureId: feature.properties?.id ?? config.id,
            properties: {
              ...feature.properties,
              ...geomStats.stats,
              ...pointCoords,
            },
            latlng: [e.latlng.lat, e.latlng.lng],
            layerRef: layer,
          });

          const label = feature.properties?.label ?? 'Annotation';
          L.popup({ closeButton: false, className: 'af-map-popup', offset: [0, -6], maxWidth: 220 })
            .setLatLng(e.latlng)
            .setContent(
              `<div class="af-popup-content">
                <div class="af-popup-title">${label}</div>
                <div class="af-popup-sub">See details in panel →</div>
              </div>`
            )
            .openOn(this.map!);
        });
      },
    });

    geoJsonLayer.setStyle({ opacity });
    return geoJsonLayer;
  }

  /**
   * Create a GeoJSON layer for an annotation set.
   * Features are styled per class_id using config.classStyles.
   */
  private createAnnotationSetLayer(config: LayerConfig, fc: GeoJSONFeatureCollection): L.GeoJSON | null {
    if (!this.L || !fc || fc.features.length === 0) return null;
    const L = this.L;
    const { style, opacity, classStyles } = config;

    const resolveStyle = (classId?: string) => {
      const cs = classId && classStyles?.[classId];
      if (cs) {
        return {
          color: cs.strokeColor,
          fillColor: cs.fillColor,
          fillOpacity: cs.fillOpacity * opacity,
          weight: cs.strokeWidth,
        };
      }
      // Fallback to layer default style
      return {
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity * opacity,
        weight: style.weight,
      };
    };

    const geoJsonLayer = L.geoJSON(fc as unknown as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const classId = feature?.properties?.class_id;
        return resolveStyle(classId);
      },
      pointToLayer: (feature, latlng) => {
        const classId = feature?.properties?.class_id;
        const s = resolveStyle(classId);
        return L.circleMarker(latlng, {
          radius: style.radius,
          ...s,
        });
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          markFeatureClick();

          const geomStats = feature.geometry
            ? computeGeoStats(feature.geometry as Parameters<typeof computeGeoStats>[0])
            : { featureType: 'annotation', stats: {} };

          const pointCoords =
            feature.geometry?.type === 'Point'
              ? {
                  latitude: fmtCoord((feature.geometry.coordinates as [number, number])[1], 'lat'),
                  longitude: fmtCoord((feature.geometry.coordinates as [number, number])[0], 'lng'),
                }
              : {};

          useMapLayersStore.getState().openFeaturePanel({
            layerType: 'annotation',
            featureType: geomStats.featureType,
            featureId: feature.properties?.id ?? feature.id ?? config.id,
            properties: {
              ...feature.properties,
              ...geomStats.stats,
              ...pointCoords,
            },
            latlng: [e.latlng.lat, e.latlng.lng],
            layerRef: layer,
          });

          const label = feature.properties?.class_name ?? feature.properties?.label ?? 'Annotation';
          L.popup({ closeButton: false, className: 'af-map-popup', offset: [0, -6], maxWidth: 220 })
            .setLatLng(e.latlng)
            .setContent(
              `<div class="af-popup-content">
                <div class="af-popup-title">${label}</div>
                ${feature.properties?.confidence != null ? `<div class="af-popup-sub">Confidence: ${(feature.properties.confidence * 100).toFixed(0)}%</div>` : ''}
                <div class="af-popup-sub">See details in panel &rarr;</div>
              </div>`
            )
            .openOn(this.map!);
        });
      },
    });

    return geoJsonLayer;
  }

  private createTrackingLayer(config: LayerConfig, objects: TrackedObject[]): L.LayerGroup | null {
    if (!this.L || objects.length === 0) return null;
    const L = this.L;
    const { style, opacity } = config;
    const group = L.layerGroup();

    objects.forEach((obj) => {
      const pos = extractLatLng(obj.latest_geometry);
      if (!pos) return;

      const markerColor = PRIORITY_COLORS[obj.priority] ?? style.color;

      const marker = L.circleMarker(pos, {
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
        useMapLayersStore.getState().openFeaturePanel({
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
        L.popup({ closeButton: false, className: 'af-map-popup', offset: [0, -10], maxWidth: 220 })
          .setLatLng(e.latlng)
          .setContent(
            `<div class="af-popup-content">
              <div class="af-popup-title">${obj.object_type}</div>
              <div class="af-popup-sub">${obj.priority} priority · ${obj.status}</div>
            </div>`
          )
          .openOn(this.map!);
      });

      marker.bindTooltip(`${obj.object_type} — ${obj.priority}`, { sticky: true });
      group.addLayer(marker);
    });

    return group;
  }

  private createAlertLayer(config: LayerConfig, alerts: Alert[]): L.LayerGroup | null {
    if (!this.L || alerts.length === 0) return null;
    const L = this.L;
    const { opacity } = config;
    const group = L.layerGroup();

    alerts.forEach((alert) => {
      const pos = extractLatLng(alert.geometry);
      if (!pos) return;

      const color = ALERT_STATUS_COLORS[alert.status] ?? ALERT_STATUS_COLORS.open;
      const size = SEVERITY_SIZES[alert.severity] ?? 10;

      const icon = L.divIcon({
        html: makePinSvg(color, size),
        className: '',
        iconSize: [size * 2, size * 1.6],
        iconAnchor: [size, size * 1.6],
        popupAnchor: [0, -size * 1.6],
      });

      const marker = L.marker(pos, { icon, opacity });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        markFeatureClick();
        useMapLayersStore.getState().openFeaturePanel({
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
      group.addLayer(marker);
    });

    return group;
  }

  private createFootprintLayer(config: LayerConfig, data: DatasetFootprintData): L.GeoJSON | null {
    if (!this.L || !data.geometry) return null;
    const L = this.L;
    const { style, opacity } = config;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureCollection: any = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: data.geometry,
        properties: { id: data.id, name: data.name, status: data.status },
      }],
    };

    return L.geoJSON(featureCollection, {
      style: () => ({
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity * opacity,
        weight: style.weight,
        dashArray: '4 4',
        opacity,
      }),
      onEachFeature: (feature, layer) => {
        layer.on('click', (e: L.LeafletMouseEvent) => {
          useMapLayersStore.getState().openFeaturePanel({
            layerType: 'dataset',
            featureType: 'dataset',
            featureId: feature.properties?.id ?? data.id,
            properties: feature.properties ?? {},
            latlng: [e.latlng.lat, e.latlng.lng],
          });
        });
        layer.bindTooltip(data.name, {
          sticky: true,
          className: 'leaflet-tooltip-dark',
        });
      },
    });
  }

  // ── Internal: rebuild data layer ───────────────────────────────────────────

  private rebuildDataLayer(id: string, config: LayerConfig): void {
    if (!this.map || !this.L) return;

    const wasVisible = this.onMap.has(id);
    this.removeLayerFromMap(id);

    const data = this.dataStore.get(id);
    if (!data) return;

    // If config has tileUrl, tile layer takes priority (no footprint needed)
    if (config.tileUrl && config.type === 'dataset') {
      // Data was pushed but we have tiles — skip footprint
      return;
    }

    const layer = this.createDataLayer(config, data);
    if (!layer) return;

    this.leafletLayers.set(id, layer);
    if (wasVisible && config.visible) {
      layer.addTo(this.map);
      this.onMap.add(id);
    }
  }

  // ── Internal: cleanup ──────────────────────────────────────────────────────

  private removeLayerFromMap(id: string): void {
    const layer = this.leafletLayers.get(id);
    if (layer) {
      layer.remove();
      this.onMap.delete(id);
    }
  }
}

// ── Data shape for dataset footprint layers ──────────────────────────────────

export interface DatasetFootprintData {
  id: string;
  name: string;
  status: string;
  geometry: GeoJSONGeometry | null;
}
