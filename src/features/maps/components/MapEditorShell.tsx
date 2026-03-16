'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import { useMapStore } from '@/stores/mapStore';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import type { DrawTool, BasemapId } from '@/stores/mapStore';

import { mapsApi } from '@/lib/api/maps';
import { qk } from '@/lib/query-keys';

import { useMapContext } from '@/features/maps/hooks/useMapContext';
import { useMeasureTool } from '@/features/maps/hooks/useMeasureTool';
import { MAP_Z } from '@/features/maps/mapColors';
import { useIsCompact } from '@/hooks/use-mobile';

import { MapTopNav } from './MapTopNav';
import type { ActiveTool } from './MapTopNav';
import { MapStatusBar } from './MapStatusBar';
import { LeftPanel } from './LeftPanel/LeftPanel';
import { RightPanel } from './RightPanel/RightPanel';
import { LibraryPanel } from './LibraryPanel';
import { ScaleBar } from '@/components/map/ScaleBar';

// ─── Leaflet components — always ssr: false ────────────────────────────────────
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => <div style={{ position: 'absolute', inset: 0, background: '#1c2119' }} />,
});
const AnnotationRenderer = dynamic(
  () => import('@/components/map/AnnotationRenderer').then((m) => ({ default: m.AnnotationRenderer })),
  { ssr: false }
);
const DatasetFootprintLayer = dynamic(
  () => import('@/components/map/DatasetFootprintLayer').then((m) => ({ default: m.DatasetFootprintLayer })),
  { ssr: false }
);
const TrackingLayer = dynamic(
  () => import('@/components/map/TrackingLayer').then((m) => ({ default: m.TrackingLayer })),
  { ssr: false }
);
const AlertMarkers = dynamic(
  () => import('@/components/map/AlertMarkers').then((m) => ({ default: m.AlertMarkers })),
  { ssr: false }
);
const MeasurementLayerDyn = dynamic(
  () => import('@/components/map/MeasurementLayer').then((m) => ({ default: m.MeasurementLayer })),
  { ssr: false }
);

// ─── Layout constants ──────────────────────────────────────────────────────────
const NAV_H = 48;
const STATUS_H = 26;

interface MapEditorShellProps {
  workspaceId: string;
  projectId: string;
  mapId: string;
}

export function MapEditorShell({ workspaceId, projectId, mapId }: MapEditorShellProps) {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  // ── Server state ───────────────────────────────────────────
  const { data: mapData } = useQuery({
    queryKey: qk.maps.detail(mapId),
    queryFn: () => mapsApi.get(mapId),
    enabled: !!mapId,
  });

  const updateMapMutation = useMutation({
    mutationFn: (name: string) => mapsApi.update(mapId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.maps.detail(mapId) });
      toast.success('Map name saved');
    },
    onError: () => toast.error('Failed to save map name'),
  });

  // ── Feature data ───────────────────────────────────────────
  const { datasets, annotations, trackedObjects, alerts } = useMapContext(projectId, orgId ?? '');

  // ── Measurement ────────────────────────────────────────────
  const { totalDistance, clearMeasurement } = useMeasureTool();
  const measurementActive = useMapLayersStore((s) => s.measurementActive);
  const toggleMeasurement = useMapLayersStore((s) => s.toggleMeasurement);
  const layers = useMapLayersStore((s) => s.layers);

  // ── Map store ──────────────────────────────────────────────
  const cursorLatLng = useMapStore((s) => s.cursorLatLng);
  const zoom = useMapStore((s) => s.zoom);
  const activeBasemapId = useMapStore((s) => s.activeBasemapId);
  const drawnGeometry = useMapStore((s) => s.drawnGeometry);

  // When a shape is drawn via Geoman, open the annotation attribute panel
  useEffect(() => {
    if (drawnGeometry) {
      useMapLayersStore.getState().openAnnotationPanel();
    }
  }, [drawnGeometry]);

  const isCompact = useIsCompact();
  const rightPanelMode = useMapLayersStore((s) => s.rightPanelMode);

  // ── Local UI state ─────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<ActiveTool>('pan');
  const [layersOpen, setLayersOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [mapName, setMapName] = useState('');

  useEffect(() => {
    if (!editingName && mapData?.name) setMapName(mapData.name);
  }, [mapData?.name, editingName]);

  // On compact viewports, the RightPanel and LeftPanel both occupy the bottom
  // sheet position — collapse LeftPanel whenever RightPanel opens so they
  // never stack on top of each other.
  useEffect(() => {
    if (isCompact && rightPanelMode !== 'none') {
      setLayersOpen(false);
    }
  }, [isCompact, rightPanelMode]);

  // Sync activeTool when measurement is stopped from the right panel Done button
  useEffect(() => {
    if (!measurementActive && activeTool === 'measure') {
      setActiveTool('pan');
    }
  }, [measurementActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tool handling ──────────────────────────────────────────
  const handleToolChange = useCallback(
    (tool: ActiveTool) => {
      if (tool === 'measure') {
        toggleMeasurement();
        setActiveTool('measure');
        return;
      }
      setActiveTool(tool);
      if (measurementActive) useMapLayersStore.getState().clearMeasurement();

      const drawTools: DrawTool[] = ['point', 'polyline', 'polygon', 'rectangle', 'circle'];
      if (drawTools.includes(tool as DrawTool)) {
        useMapStore.getState().setActiveDrawTool(tool as DrawTool);
      } else {
        useMapStore.getState().setActiveDrawTool(null);
      }
    },
    [measurementActive, toggleMeasurement]
  );

  const handleMeasurementToggle = useCallback(() => {
    toggleMeasurement();
    setActiveTool(measurementActive ? 'pan' : 'measure');
  }, [measurementActive, toggleMeasurement]);

  const handleBasemapSelect = useCallback((id: BasemapId) => {
    useMapStore.getState().setActiveBasemapId(id);
  }, []);

  const handleSaveName = useCallback(
    (name: string) => {
      setEditingName(false);
      const trimmed = name.trim();
      if (trimmed && trimmed !== mapData?.name) {
        updateMapMutation.mutate(trimmed);
        setMapName(trimmed);
      }
    },
    [mapData?.name, updateMapMutation]
  );

  // Group annotations by label
  const annotationsByLabel = annotations.reduce<Record<string, typeof annotations>>((acc, a) => {
    if (!acc[a.label]) acc[a.label] = [];
    acc[a.label].push(a);
    return acc;
  }, {});

  return (
    // Root — fills the viewport as a flex column: TopNav → Map area → StatusBar
    // zIndex: 50 ensures this covers the workspace sidebar layout
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#1a1e17', zIndex: MAP_Z.root }}>

      {/* ── TopNav — fixed height, not overlapping the map ─── */}
      <MapTopNav
        workspaceId={workspaceId}
        projectId={projectId}
        mapName={mapName}
        editingName={editingName}
        onStartEdit={() => setEditingName(true)}
        onSaveName={handleSaveName}
        onCancelEdit={() => setEditingName(false)}
        activeTool={activeTool}
        onToolChange={handleToolChange}
        libraryOpen={libraryOpen}
        onLibraryToggle={() => {
          setLibraryOpen((v) => !v);
          if (!libraryOpen) useMapLayersStore.getState().closeRightPanel();
        }}
        basemapOpen={basemapOpen}
        onBasemapToggle={() => setBasemapOpen((v) => !v)}
        activeBasemapId={activeBasemapId}
        onBasemapSelect={handleBasemapSelect}
        measurementActive={measurementActive}
        onMeasurementToggle={handleMeasurementToggle}
      />

      {/* ── Map area — fills remaining space between nav and status bar ── */}
      {/* overflow:hidden clips translated-off-screen panels so they're invisible when closed */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Map canvas — MAP_Z.canvas creates a stacking context isolating Leaflet's
            internal z-indices (200–800) from our UI panels (MAP_Z.panel+) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: MAP_Z.canvas }}>
          <LeafletMap />

          {/* Annotation renderers */}
          {Object.entries(annotationsByLabel).map(([label, items]) => {
            const layerId = `annotation-${label}`;
            const layer = layers[layerId];
            return layer ? (
              <AnnotationRenderer
                key={layerId}
                layerKey={layerId}
                annotations={items}
                visible={layer.visible}
                opacity={layer.opacity}
                style={layer.style}
              />
            ) : null;
          })}

          {datasets.map((dataset) => {
            const layer = layers[dataset.id];
            return layer ? (
              <DatasetFootprintLayer
                key={dataset.id}
                dataset={dataset}
                visible={layer.visible}
                opacity={layer.opacity}
                style={layer.style}
              />
            ) : null;
          })}

          {(() => {
            const tl = layers['tracking-all'];
            return tl ? (
              <TrackingLayer
                trackedObjects={trackedObjects}
                visible={tl.visible}
                opacity={tl.opacity}
                style={tl.style}
              />
            ) : null;
          })()}

          {(() => {
            const al = layers['alerts-all'];
            return al ? (
              <AlertMarkers alerts={alerts} visible={al.visible} opacity={al.opacity} />
            ) : null;
          })()}

          {measurementActive && <MeasurementLayerDyn />}
        </div>

        {/* ── Scale bar — outside Leaflet stacking context, always on top ── */}
        {/* Positioned at bottom-left of the map area, above all other UI */}
        <div style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          zIndex: MAP_Z.scale,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <ScaleBar />
        </div>

        {/* ── Panels — absolutely positioned inside map area ─── */}
        <LeftPanel
          open={layersOpen}
          onToggle={() => setLayersOpen((v) => !v)}
          topOffset={0}
          bottomOffset={0}
          projectId={projectId}
          datasets={datasets}
          annotations={annotations}
          trackedObjects={trackedObjects}
          alerts={alerts}
        />

        <RightPanel topOffset={0} bottomOffset={0} />

        <LibraryPanel
          open={libraryOpen}
          topOffset={0}
          bottomOffset={0}
          projectId={projectId}
          datasets={datasets}
          onClose={() => setLibraryOpen(false)}
        />

      </div>

      {/* ── StatusBar — fixed height at bottom ─────────────── */}
      <MapStatusBar
        cursorLatLng={cursorLatLng}
        zoom={zoom}
        measurementActive={measurementActive}
        totalDistanceM={totalDistance}
      />
    </div>
  );
}
