'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Rectangle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

const TITILER_ENDPOINT =
  process.env.NEXT_PUBLIC_TITILER_URL ?? 'http://localhost:8011';

export type ActiveTool = 'pan' | 'bbox' | 'polygon' | 'point';

export type Annotation = {
  id: string;
  tiff_file: string;
  class_label: string;
  geometry: any; // GeoJSON geometry
  geometry_type: string;
  created_at: string;
};

type PatchAnnotationViewerProps = {
  tiffUrl: string;
  /** [minLon, minLat, maxLon, maxLat] in EPSG:4326 */
  bounds: [number, number, number, number];
  annotations: Annotation[];
  onCreateAnnotation: (geometry: any, geometry_type: string) => void;

  showBaseLayer?: boolean;
  showAnnotations?: boolean;
  showPredictions?: boolean; // stub hook for future
  activeTool: ActiveTool;
};

/** Fit map to given bounds whenever they change */
function FitToBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);

  return null;
}

/** Render existing annotations as a single GeoJSON layer */
function ExistingAnnotationsLayer({ annotations }: { annotations: Annotation[] }) {
  if (!annotations.length) return null;

  const featureCollection = {
    type: 'FeatureCollection',
    features: annotations.map((ann) => ({
      type: 'Feature',
      properties: {
        id: ann.id,
        label: ann.class_label,
        geometry_type: ann.geometry_type,
      },
      geometry: ann.geometry,
    })),
  } as GeoJSON.FeatureCollection;

  return (
    <GeoJSON
      data={featureCollection as any}
      style={() => ({
        color: '#2563eb', // blue-600
        weight: 2,
      })}
      pointToLayer={(_feature, latlng) =>
        // Keep points small so they don't clutter
        new L.CircleMarker(latlng, {
          radius: 4,
          color: '#2563eb',
          weight: 2,
          fillOpacity: 0.9,
        })
      }
    />
  );
}

/**
 * DrawingTools
 * ------------
 * - point: single click creates Point geometry
 * - bbox: click-drag to draw a rectangle -> Polygon geometry
 * - polygon: (not implemented yet, left as TODO)
 * - pan: default leaflet drag/zoom behavior (we just don't intercept events)
 */
function DrawingTools({
  activeTool,
  onCreateAnnotation,
}: {
  activeTool: ActiveTool;
  onCreateAnnotation: (geometry: any, geometry_type: string) => void;
}) {
  const [startLatLng, setStartLatLng] = useState<L.LatLng | null>(null);
  const [endLatLng, setEndLatLng] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      if (activeTool === 'point') {
        const geom = {
          type: 'Point',
          coordinates: [e.latlng.lng, e.latlng.lat],
        };
        onCreateAnnotation(geom, 'Point');
      }
      // polygon mode can be added later (multi-click, double-click to finish)
    },

    mousedown(e) {
      if (activeTool === 'bbox') {
        setStartLatLng(e.latlng);
        setEndLatLng(e.latlng);
      }
    },

    mousemove(e) {
      if (activeTool === 'bbox' && startLatLng) {
        setEndLatLng(e.latlng);
      }
    },

    mouseup(e) {
      if (activeTool === 'bbox' && startLatLng && endLatLng) {
        // compute bbox corners
        const minLat = Math.min(startLatLng.lat, endLatLng.lat);
        const maxLat = Math.max(startLatLng.lat, endLatLng.lat);
        const minLng = Math.min(startLatLng.lng, endLatLng.lng);
        const maxLng = Math.max(startLatLng.lng, endLatLng.lng);

        const polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat],
            ],
          ],
        };

        onCreateAnnotation(polygon, 'Polygon');
        setStartLatLng(null);
        setEndLatLng(null);
      }
    },
  });

  // Render the in-progress rectangle while dragging
  if (activeTool === 'bbox' && startLatLng && endLatLng) {
    const bounds: L.LatLngBoundsExpression = [
      [startLatLng.lat, startLatLng.lng],
      [endLatLng.lat, endLatLng.lng],
    ];
    return (
      <Rectangle
        bounds={bounds}
        pathOptions={{
          color: '#f97316', // orange-ish
          weight: 2,
          fillOpacity: 0.1,
        }}
      />
    );
  }

  return null;
}

export default function PatchAnnotationViewer({
  tiffUrl,
  bounds,
  annotations,
  onCreateAnnotation,
  showBaseLayer = true,
  showAnnotations = true,
  showPredictions = false, // currently unused
  activeTool,
}: PatchAnnotationViewerProps) {
  const [minLon, minLat, maxLon, maxLat] = bounds;

  // Leaflet expects [lat, lon]
  const leafletBounds: L.LatLngBoundsExpression = useMemo(
    () => [
      [minLat, minLon],
      [maxLat, maxLon],
    ],
    [minLat, minLon, maxLat, maxLon]
  );

  const center: L.LatLngExpression = useMemo(
    () => [(minLat + maxLat) / 2, (minLon + maxLon) / 2],
    [minLat, maxLat, minLon, maxLon]
  );

  const tileUrl = `${TITILER_ENDPOINT}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(
    tiffUrl
  )}`;

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      preferCanvas
    >
      {/* Optional OSM base for context */}
      {showBaseLayer && (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
          opacity={0.3}
        />
      )}

      {/* COG Tile Layer over full TIFF */}
      <TileLayer
        url={tileUrl}
        attribution="TiTiler"
        tileSize={256}
        opacity={1.0}
        minZoom={0}
        maxZoom={22}
      />

      {/* Fit map to full TIFF bounds */}
      <FitToBounds bounds={leafletBounds} />

      {/* Existing annotation overlay */}
      {showAnnotations && <ExistingAnnotationsLayer annotations={annotations} />}

      {/* Placeholder for model predictions if you add them later */}
      {showPredictions && null}

      {/* Drawing tools (point + bbox for now) */}
      <DrawingTools activeTool={activeTool} onCreateAnnotation={onCreateAnnotation} />
    </MapContainer>
  );
}
