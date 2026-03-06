'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
// @ts-ignore
import '@geoman-io/leaflet-geoman-free';
// @ts-ignore
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import type {
  AnnotationType as AnnotationTypeEnum,
  TiffProps,
  UIAnnotation as UIAnnotationType,
  AnnotationClass as AnnotationClassType,
  HeatmapType,
} from '@/features/annotations/types';

import type {
  Prediction as PredictionType
} from '@/features/predictions/types';

import { PredictionStatus } from '@/features/predictions/types';

const TITILER_ENDPOINT = process.env.NEXT_PUBLIC_TITILER_URL ?? 'http://localhost:8011';

function GeometryToolbar({
  activeGeometry,
  onGeometryChange,
}: {
  activeGeometry: AnnotationTypeEnum;
  onGeometryChange: (type: AnnotationTypeEnum) => void;
}) {
  const tools = [
    { type: 'point' as AnnotationTypeEnum, label: 'Point', icon: '📍' },
    { type: 'bbox' as AnnotationTypeEnum, label: 'BBox', icon: '⬜' },
    { type: 'polygon' as AnnotationTypeEnum, label: 'Polygon', icon: '▱' },
  ];

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-[1000]">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onGeometryChange(tool.type)}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeGeometry === tool.type
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={tool.label}
          aria-pressed={activeGeometry === tool.type}
          type="button"
        >
          <span className="mr-1">{tool.icon}</span>
          {tool.label}
        </button>
      ))}
    </div>
  );
}

function MapController({
  bounds,
  annotations,
  predictions = [],
  annotationClasses,
  activeGeometry,
  selectedAnnotationId,
  selectedPredictionId,
  onAnnotationCreated,
  onAnnotationSelected,
  onPredictionSelected,
  predictionOpacity = 0.7,
  heatmapMode = false,
  heatmapType = 'density',
  heatmapOpacity = 0.5,
  heatmapConfidenceThreshold = 0,
}: Omit<TiffProps, 'tiffUrl' | 'onGeometryChange'> & {
  predictions?: PredictionType[];
  selectedPredictionId?: string | null;
  onPredictionSelected?: (id: string | null) => void;
  predictionOpacity?: number;
  heatmapMode?: boolean;
  heatmapType?: HeatmapType;
  heatmapOpacity?: number;
  heatmapConfidenceThreshold?: number;
}) {
  const map = useMap();
  const layersRef = useRef<Map<string, L.Layer>>(new Map());
  const heatmapLayerRef = useRef<L.Layer | null>(null);

  const onAnnotationCreatedRef = useRef(onAnnotationCreated);
  const onAnnotationSelectedRef = useRef(onAnnotationSelected);
  const onPredictionSelectedRef = useRef(onPredictionSelected);

  useEffect(() => {
    onAnnotationCreatedRef.current = onAnnotationCreated;
    onAnnotationSelectedRef.current = onAnnotationSelected;
    onPredictionSelectedRef.current = onPredictionSelected;
  }, [onAnnotationCreated, onAnnotationSelected, onPredictionSelected]);

  useEffect(() => {
    const leafletBounds: L.LatLngBoundsExpression = [
      [bounds[1], bounds[0]],
      [bounds[3], bounds[2]],
    ];
    map.fitBounds(leafletBounds, { padding: [50, 50] });
  }, [bounds, map]);

  // Zoom to selected annotation
  useEffect(() => {
    if (!selectedAnnotationId) return;

    const annotation = annotations.find(ann => ann.id === selectedAnnotationId);
    if (!annotation) return;

    try {
      // Get bounds from geometry
      let annotationBounds: L.LatLngBoundsExpression | null = null;

      if (annotation.geometry.type === 'Point') {
        // For points, create a small bounds around the point
        const [lng, lat] = annotation.geometry.coordinates as [number, number];
        const offset = 0.0001; // Small offset for zoom
        annotationBounds = [
          [lat - offset, lng - offset],
          [lat + offset, lng + offset],
        ];
      } else if (annotation.geometry.type === 'Polygon') {
        // For polygons, use the bounding box
        const coords = annotation.geometry.coordinates[0];
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        annotationBounds = [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ];
      }

      if (annotationBounds) {
        map.flyToBounds(annotationBounds, {
          padding: [100, 100],
          duration: 0.5,
          maxZoom: 18,
        });
      }
    } catch (err) {
      console.error('Failed to zoom to annotation:', err);
    }
  }, [selectedAnnotationId, annotations, map]);

  useEffect(() => {
    // @ts-ignore
    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      snapMiddle: true,
      allowSelfIntersection: false,
      continueDrawing: false,
      editable: true,
      draggable: false,
    });
  }, [map]);

  useEffect(() => {
    // @ts-ignore
    map.pm.addControls({
      position: 'topleft',
      drawMarker: activeGeometry === 'point',
      drawRectangle: activeGeometry === 'bbox',
      drawPolygon: activeGeometry === 'polygon',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    // @ts-ignore
    map.pm.Toolbar.setBlockPosition('topleft');

    return () => {
      // @ts-ignore
      map.pm.removeControls();
    };
  }, [map, activeGeometry]);

  useEffect(() => {
    const onCreate = (e: any) => {
      const layer = e.layer;
      const geoJson = layer.toGeoJSON();
      const geometry = geoJson.geometry;

      let annotationType: AnnotationTypeEnum = 'bbox';
      if (e.shape === 'Marker') annotationType = 'point';
      else if (e.shape === 'Rectangle') annotationType = 'bbox';
      else if (e.shape === 'Polygon') annotationType = 'polygon';

      onAnnotationCreatedRef.current(geometry, annotationType);
      map.removeLayer(layer);
    };

    // @ts-ignore
    map.on('pm:create', onCreate);

    return () => {
      // @ts-ignore
      map.off('pm:create', onCreate);
    };
  }, [map]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // @ts-ignore
        map.pm.disableDraw();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [map]);

  useEffect(() => {
    // Clear existing layers
    layersRef.current.forEach((layer) => {
      if (layer instanceof L.Layer) {
        layer.off();
      }
      try {
        map.removeLayer(layer);
      } catch {}
    });
    layersRef.current.clear();

    // Clear existing heatmap layer
    if (heatmapLayerRef.current) {
      try {
        map.removeLayer(heatmapLayerRef.current);
      } catch {}
      heatmapLayerRef.current = null;
    }

    // Render Predictions below annotations
    predictions.forEach((pred) => {
      try {
        if (pred.status !== PredictionStatus.Pending) return;

        const classObj = annotationClasses.find((c) => c.name === pred.class_label);
        const color = classObj?.color || '#3b82f6';
        const isSelected = pred.id === selectedPredictionId;

        const geoJsonLayer = L.geoJSON(pred.geometry, {
          pointToLayer: (_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: isSelected ? 8 : 6,
              fillColor: color,
              color: isSelected ? '#000' : '#fff',
              weight: isSelected ? 3 : 2,
              
              fillOpacity: predictionOpacity - 0.3,
              dashArray: '5, 5',
            }),
          style: {
            color: isSelected ? '#000' : color,
            weight: isSelected ? 3 : 2,
            fillColor: color,
            // fillOpacity: 0.2,
            dashArray: '5, 5',
            fillOpacity: predictionOpacity - 0.5,
            opacity: predictionOpacity,
            // opacity: 0.7,
          },
        });

        geoJsonLayer.addTo(map);

        const label = L.marker(geoJsonLayer.getBounds().getCenter(), {
          icon: L.divIcon({
            className: 'prediction-label',
            html: `<div style="
              background: ${color};
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              border: 1px dashed white;
              opacity: 0.8;
            ">${pred.class_label} ${(pred.confidence_score * 100).toFixed(0)}%</div>`,
            iconSize: [0, 0],
          }),
          interactive: false,
        });

        label.addTo(map);

        geoJsonLayer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onPredictionSelectedRef.current?.(pred.id);
        });
        geoJsonLayer.on('mouseover', () => {
          map.getContainer().style.cursor = 'pointer';
        });
        geoJsonLayer.on('mouseout', () => {
          map.getContainer().style.cursor = '';
        });

        layersRef.current.set(`pred-${pred.id}`, geoJsonLayer);
        layersRef.current.set(`pred-${pred.id}-label`, label);
      } catch (err) {
        console.error('Failed to render prediction:', err);
      }
    });

    // Render Annotations or Heatmap
    if (heatmapMode) {
      if (heatmapType === 'confidence') {
        // Confidence mode - single heatmap with confidence-based intensity
        const heatmapPoints: [number, number, number][] = [];

        annotations.forEach((ann) => {
          if (ann.isVisible === false) return;

          // Filter by confidence threshold
          const confidence = (ann.properties?.confidence as number) ?? 0;
          if (confidence < heatmapConfidenceThreshold) return;

          try {
            let lat: number;
            let lng: number;

            if (ann.geometry.type === 'Point') {
              [lng, lat] = ann.geometry.coordinates as [number, number];
            } else if (ann.geometry.type === 'Polygon') {
              const coords = ann.geometry.coordinates[0] as [number, number][];
              lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
              lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            } else {
              return;
            }

            heatmapPoints.push([lat, lng, confidence]);
          } catch (err) {
            console.error('Failed to process annotation for heatmap:', err);
          }
        });

        if (heatmapPoints.length > 0) {
          // @ts-ignore - leaflet.heat adds this method
          const heatLayer = L.heatLayer(heatmapPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 18,
            max: 1.0,
            gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' },
          });

          heatLayer.addTo(map);
          const canvas = (heatLayer as any)._canvas;
          if (canvas) {
            canvas.style.opacity = String(heatmapOpacity);
          }
          heatmapLayerRef.current = heatLayer;
        }
      } else {
        // Status mode - separate heatmaps for approved (green) and pending (amber)
        const approvedPoints: [number, number, number][] = [];
        const pendingPoints: [number, number, number][] = [];

        annotations.forEach((ann) => {
          if (ann.isVisible === false) return;

          try {
            let lat: number;
            let lng: number;

            if (ann.geometry.type === 'Point') {
              [lng, lat] = ann.geometry.coordinates as [number, number];
            } else if (ann.geometry.type === 'Polygon') {
              const coords = ann.geometry.coordinates[0] as [number, number][];
              lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
              lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            } else {
              return;
            }

            if (ann.isSaved) {
              approvedPoints.push([lat, lng, 1.0]);
            } else {
              pendingPoints.push([lat, lng, 1.0]);
            }
          } catch (err) {
            console.error('Failed to process annotation for heatmap:', err);
          }
        });

        // Create approved heatmap (green)
        if (approvedPoints.length > 0) {
          // @ts-ignore
          const approvedHeatLayer = L.heatLayer(approvedPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 18,
            max: 1.0,
            // gradient: { 0.4: '#86efac', 0.6: '#22c55e', 0.8: '#16a34a', 1.0: '#15803d' },
            gradient: {
                  0.4: '#93c5fd', // light blue
                  0.6: '#3b82f6', // blue
                  0.8: '#2563eb', // darker blue
                  1.0: '#1e40af'  // deep blue
                }
          });
          approvedHeatLayer.addTo(map);
          const canvas = (approvedHeatLayer as any)._canvas;
          if (canvas) {
            canvas.style.opacity = String(heatmapOpacity);
          }
          layersRef.current.set('heatmap-approved', approvedHeatLayer);
        }

        // Create pending heatmap (amber/orange)
        if (pendingPoints.length > 0) {
          // @ts-ignore
          const pendingHeatLayer = L.heatLayer(pendingPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 18,
            max: 1.0,
            gradient: { 0.4: '#fde68a', 0.6: '#fbbf24', 0.8: '#f59e0b', 1.0: '#d97706' },
          });
          pendingHeatLayer.addTo(map);
          const canvas = (pendingHeatLayer as any)._canvas;
          if (canvas) {
            canvas.style.opacity = String(heatmapOpacity);
          }
          layersRef.current.set('heatmap-pending', pendingHeatLayer);
        }
      }
    } else {
      // Normal mode - render individual annotations
      annotations.forEach((ann) => {
        try {
          if (ann.isVisible === false) return;

          const classObj = annotationClasses.find((c) => c.id === ann.classLabel);
          const color = classObj?.color || '#3b82f6';
          const isSelected = ann.id === selectedAnnotationId;
          const isUnsaved = !ann.isSaved;

          const geoJsonLayer = L.geoJSON(ann.geometry, {
            pointToLayer: (_feature, latlng) =>
              L.circleMarker(latlng, {
                radius: isSelected ? 8 : 6,
                fillColor: color,
                color: isSelected ? '#000' : isUnsaved ? '#f97316' : '#fff',
                weight: isSelected ? 3 : 2,
                fillOpacity: isSelected ? 1.0 : 0.8,
                dashArray: isUnsaved ? '5, 5' : undefined,
              }),
            style: {
              color: isSelected ? '#000' : isUnsaved ? '#f97316' : color,
              weight: isSelected ? 3 : 2,
              fillColor: color,
              fillOpacity: isSelected ? 0.5 : 0.3,
              dashArray: isUnsaved ? '5, 5' : undefined,
            },
          });

          geoJsonLayer.addTo(map);

          const center =
            ann.annotationType === 'point'
              ? L.latLng((ann.geometry.coordinates as [number, number])[1], (ann.geometry.coordinates as [number, number])[0])
              : geoJsonLayer.getBounds().getCenter();

          const label = L.marker(center, {
            icon: L.divIcon({
              className: 'annotation-label',
              html: `<div style="
                background: ${isUnsaved ? '#f97316' : color};
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ${isUnsaved ? 'border: 1px dashed white;' : ''}
                ${isSelected ? 'transform: scale(1.1);' : ''}
              ">${ann.displayLabel}${isUnsaved ? ' ⚠️' : ''}</div>`,
              iconSize: [0, 0],
            }),
            interactive: false,
          });

          label.addTo(map);

          geoJsonLayer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onAnnotationSelectedRef.current(ann.id);
          });
          geoJsonLayer.on('mouseover', () => {
            geoJsonLayer.setStyle({ weight: isSelected ? 3 : 2.5, fillOpacity: 0.6 });
            map.getContainer().style.cursor = 'pointer';
          });
          geoJsonLayer.on('mouseout', () => {
            geoJsonLayer.setStyle({
              weight: isSelected ? 3 : 2,
              fillOpacity: isSelected ? 0.5 : 0.3,
            });
            map.getContainer().style.cursor = '';
          });

          layersRef.current.set(ann.id, geoJsonLayer);
          layersRef.current.set(`${ann.id}-label`, label);
        } catch (err) {
          console.error('Failed to render annotation:', err);
        }
      });
    }

    return () => {
      layersRef.current.forEach((layer) => {
        if (layer instanceof L.Layer) {
          layer.off();
        }
        try {
          map.removeLayer(layer);
        } catch {}
      });
      layersRef.current.clear();

      // Clean up heatmap layer
      if (heatmapLayerRef.current) {
        try {
          map.removeLayer(heatmapLayerRef.current);
        } catch {}
        heatmapLayerRef.current = null;
      }

      map.getContainer().style.cursor = '';
    };
  }, [annotations, predictions, annotationClasses, selectedAnnotationId, selectedPredictionId, map, heatmapMode, heatmapType, heatmapOpacity, heatmapConfidenceThreshold]);

  return null;
}

export default function AnnotationViewer(props: TiffProps & {
  predictions?: PredictionType[];
  selectedPredictionId?: string | null;
  onPredictionSelected?: (id: string | null) => void;
  predictionOpacity?: number;
  heatmapMode?: boolean;
  heatmapType?: HeatmapType;
  heatmapOpacity?: number;
  heatmapConfidenceThreshold?: number;
}) {
  const tileUrl = `${TITILER_ENDPOINT}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(
    props.tiffUrl
  )}`;

  const center: [number, number] = [
    (props.bounds[1] + props.bounds[3]) / 2,
    (props.bounds[0] + props.bounds[2]) / 2,
  ];

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={16}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
          opacity={0.3}
        />

        <TileLayer
          url={tileUrl}
          attribution="TiTiler"
          tileSize={256}
          opacity={1.0}
          minZoom={0}
          maxZoom={22}
        />

        <MapController {...props} />
      </MapContainer>
    </div>
  );
}
