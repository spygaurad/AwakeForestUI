'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import { useMapStore, getMapInstance } from '@/stores/mapStore';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import type { DrawTool, BasemapId } from '@/stores/mapStore';

import { mapsApi } from '@/lib/api/maps';
import { datasetsApi } from '@/lib/api/datasets';
import { qk } from '@/lib/query-keys';

import { useMapContext } from '@/features/maps/hooks/useMapContext';
import { useMeasureTool } from '@/features/maps/hooks/useMeasureTool';
import { useMapSync } from '@/features/maps/hooks/useMapSync';
import { getMapManager } from '@/features/maps/MapManager';
import type { DatasetFootprintData } from '@/features/maps/MapManager';
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
const MeasurementLayerDyn = dynamic(
  () => import('@/components/map/MeasurementLayer').then((m) => ({ default: m.MeasurementLayer })),
  { ssr: false }
);

// ─── Auto-save interval (ms) — 8 seconds as per integration guide §7 ──────────
const AUTO_SAVE_DELAY = 8000;

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
  const { datasets, annotations, trackedObjects, alerts, annotationSets } = useMapContext(projectId, orgId ?? '', mapId);

  // ── MapManager sync — bridges Zustand → Leaflet ────────────
  useMapSync();

  // ── Measurement ────────────────────────────────────────────
  const { totalDistance } = useMeasureTool();
  const measurementActive = useMapLayersStore((s) => s.measurementActive);
  const toggleMeasurement = useMapLayersStore((s) => s.toggleMeasurement);
  const layers = useMapLayersStore((s) => s.layers);
  const initLayer = useMapLayersStore((s) => s.initLayer);
  const removeLayer = useMapLayersStore((s) => s.removeLayer);
  const setBackendLayerId = useMapLayersStore((s) => s.setBackendLayerId);
  const setLayerTileConfig = useMapLayersStore((s) => s.setLayerTileConfig);
  const setLayerVisible = useMapLayersStore((s) => s.setLayerVisible);
  const setLayerOpacity = useMapLayersStore((s) => s.setLayerOpacity);

  // ── Restore view_state from map data ──────────────────────
  const viewStateRestoredRef = useRef(false);

  useEffect(() => {
    if (!mapData?.view_state || viewStateRestoredRef.current) return;
    const map = getMapInstance();
    if (!map) return;

    const { center, zoom } = mapData.view_state;
    // view_state.center is [lng, lat] — Leaflet wants [lat, lng]
    if (center && center.length === 2) {
      map.setView([center[1], center[0]], zoom ?? 3);
      viewStateRestoredRef.current = true;
    }
  }, [mapData]);

  // Also try restoring when the map instance becomes ready
  const mapReady = useMapStore((s) => s.mapReady);
  useEffect(() => {
    if (!mapData?.view_state || viewStateRestoredRef.current || !mapReady) return;
    const map = getMapInstance();
    if (!map) return;

    const { center, zoom } = mapData.view_state;
    if (center && center.length === 2) {
      map.setView([center[1], center[0]], zoom ?? 3);
      viewStateRestoredRef.current = true;
    }
  }, [mapData, mapReady]);

  // ── Restore backend map layers on mount ────────────────────
  // GET /maps/{mapId} returns layers[] — use them to reinstate layers
  useEffect(() => {
    if (!mapData?.layers?.length) return;

    mapData.layers
      .sort((a, b) => a.z_index - b.z_index)
      .forEach((bl) => {
        const layerId = bl.dataset_id ?? bl.stac_item_id ?? bl.id;
        if (!layerId) return;

        // Store the backend layer ID for PATCH/DELETE
        setBackendLayerId(layerId, bl.id);

        // Init with proper source type and z_index
        initLayer(layerId, 'dataset', {
          sourceType: bl.source_type,
          zIndex: bl.z_index,
          tileServiceUrl: bl.tile_service_url ?? undefined,
          stacItemId: bl.stac_item_id ?? undefined,
        });

        // Honour saved visibility / opacity
        if (!bl.visible) setLayerVisible(layerId, false);
        if (bl.opacity !== 1) setLayerOpacity(layerId, bl.opacity);

        // Fetch tiles based on source_type
        if (bl.source_type === 'dataset' && bl.dataset_id) {
          datasetsApi.getTileJson(bl.dataset_id).then((tj) => {
            if (tj.tiles[0]) {
              setLayerTileConfig(layerId, {
                tileUrl: tj.tiles[0],
                tileBounds: tj.bounds,
                tileMinZoom: tj.minzoom,
                tileMaxZoom: tj.maxzoom,
              });
            }
          }).catch(() => {});
        } else if (bl.source_type === 'stac_item' && bl.stac_item_id && bl.dataset_id) {
          // For single item layers, we need dataset_id + item UUID
          // The stac_item_id in the layer refers to the STAC item ID string
          // We'd need a reverse lookup — for now, skip tile loading and let
          // the user re-select via the items panel
        } else if (bl.source_type === 'tile_service' && bl.tile_service_url) {
          setLayerTileConfig(layerId, { tileUrl: bl.tile_service_url });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData?.layers]);

  // ── Persist visibility changes to the backend (immediate) ──
  useEffect(() => {
    const unsub = useMapLayersStore.subscribe(
      (s) => s.layers,
      (current, prev) => {
        const backendIds = useMapLayersStore.getState().backendLayerIds;
        Object.entries(current).forEach(([id, layer]) => {
          const prevLayer = prev[id];
          const backendId = backendIds[id];
          if (!prevLayer || !backendId) return;
          // Only immediate-save visibility (per integration guide §6)
          if (layer.visible !== prevLayer.visible) {
            datasetsApi.updateMapLayer(mapId, backendId, {
              visible: layer.visible,
            }).catch(() => {});
          }
        });
      }
    );
    return unsub;
  }, [mapId]);

  // ── 8-second auto-save for camera + continuous layer changes ──
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');

  const flushAutoSave = useCallback(async () => {
    const map = getMapInstance();
    if (!map) return;

    // 4E: Skip auto-save when offline — will retry on next interaction
    if (!getMapManager().online) {
      setAutoSaveStatus('idle');
      return;
    }

    setAutoSaveStatus('saving');

    const center = map.getCenter();
    const layerState = useMapLayersStore.getState();
    const backendIds = layerState.backendLayerIds;

    // Collect opacity changes for layers with backend IDs
    const layerUpdates = Object.entries(layerState.layers)
      .filter(([id]) => backendIds[id])
      .map(([id, l]) => ({
        id: backendIds[id],
        opacity: l.opacity,
      }));

    try {
      await mapsApi.autoSave(mapId, {
        view_state: {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
        },
        layers: layerUpdates.length > 0 ? layerUpdates : undefined,
      });
      useMapLayersStore.getState().clearAutoSaveDirty();
    } catch {
      // Silent failure — will retry on next interaction
    } finally {
      setAutoSaveStatus('idle');
    }
  }, [mapId]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('pending');
    autoSaveTimerRef.current = setTimeout(flushAutoSave, AUTO_SAVE_DELAY);
  }, [flushAutoSave]);

  // Attach auto-save to map movement events
  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    const handler = () => scheduleAutoSave();
    map.on('moveend zoomend', handler);
    return () => { map.off('moveend zoomend', handler); };
  }, [mapReady, scheduleAutoSave]);

  // Also trigger auto-save when opacity/style changes (via dirty flag)
  useEffect(() => {
    const unsub = useMapLayersStore.subscribe(
      (s) => s.autoSaveDirty,
      (dirty) => {
        if (dirty) scheduleAutoSave();
      }
    );
    return unsub;
  }, [scheduleAutoSave]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        flushAutoSave();
      }
    };
  }, [flushAutoSave]);

  // ── Remove dataset layer from map ──────────────────────────
  const handleRemoveDataset = useCallback((datasetId: string) => {
    const backendId = useMapLayersStore.getState().backendLayerIds[datasetId];
    removeLayer(datasetId); // also removes from backendLayerIds
    if (backendId) {
      datasetsApi.deleteMapLayer(mapId, backendId).catch(() => {});
    }
  }, [mapId, removeLayer]);

  // ── Auto-fetch TileJSON when a dataset on this map becomes ready ──
  const tileJsonAttemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentLayers = useMapLayersStore.getState().layers;
    datasets.forEach((d) => {
      if (d.status !== 'ready' || d.dataset_type !== 'raster' || !d.stac_collection_id) return;
      if (!currentLayers[d.id]) return;

      const layer = currentLayers[d.id];
      if (layer?.tileUrl) return;
      if (tileJsonAttemptedRef.current.has(d.id)) return;

      tileJsonAttemptedRef.current.add(d.id);

      datasetsApi.getTileJson(d.id)
        .then((tj) => {
          if (!tj.tiles[0]) return;
          
          // Check if TileJSON bounds are defaults (world bounds or center-of-earth)
          const isWorldBounds = tj.bounds 
            && tj.bounds[0] === -180 
            && tj.bounds[1] <= -85 
            && tj.bounds[2] === 180 
            && tj.bounds[3] >= 85;
          const isCenterEarth = tj.bounds
            && Math.abs(tj.bounds[0]) < 0.0001 
            && Math.abs(tj.bounds[1]) < 0.0001 
            && Math.abs(tj.bounds[2]) < 0.0001 
            && Math.abs(tj.bounds[3]) < 0.0001;
          
          // Use dataset geometry bounds if TileJSON has default bounds
          let tileBounds = tj.bounds;
          if ((isWorldBounds || isCenterEarth) && d.geometry) {
            // Compute bounds from geometry via MapManager
            const geomBounds = getMapManager().computeBoundsFromGeometry(d.geometry);
            if (geomBounds) {
              tileBounds = geomBounds;
            }
          }
          
          setLayerTileConfig(d.id, {
            tileUrl: tj.tiles[0],
            tileBounds,
            tileMinZoom: tj.minzoom,
            tileMaxZoom: tj.maxzoom,
          });
          // Fly to dataset extent on first tile load
          if (tileBounds) {
            getMapManager().fitBounds(tileBounds);
          }
        })
        .catch(() => {
          tileJsonAttemptedRef.current.delete(d.id);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasets, setLayerTileConfig]);

  // ── Push feature data to MapManager ─────────────────────────
  // Annotations: grouped by label, each group is a layer
  useEffect(() => {
    if (!mapReady) return;
    const mm = getMapManager();
    const byLabel = annotations.reduce<Record<string, typeof annotations>>((acc, a) => {
      if (!acc[a.label]) acc[a.label] = [];
      acc[a.label].push(a);
      return acc;
    }, {});
    Object.entries(byLabel).forEach(([label, items]) => {
      mm.setLayerData(`annotation-${label}`, items);
    });
  }, [annotations, mapReady]);

  // Tracking objects
  useEffect(() => {
    if (!mapReady) return;
    getMapManager().setLayerData('tracking-all', trackedObjects);
  }, [trackedObjects, mapReady]);

  // Alerts
  useEffect(() => {
    if (!mapReady) return;
    getMapManager().setLayerData('alerts-all', alerts);
  }, [alerts, mapReady]);

  // Annotation sets — fetch GeoJSON features and push to MapManager
  const annSetFetchedRef = useRef<Set<string>>(new Set());

  // Helper: fetch annotation set features and push to MapManager
  const fetchAnnSetFeatures = useCallback((annSetId: string, layerId: string) => {
    const mm = getMapManager();

    // Set loading state
    useMapLayersStore.setState((s) => ({
      layers: s.layers[layerId]
        ? { ...s.layers, [layerId]: { ...s.layers[layerId], loading: true } }
        : s.layers,
    }));

    import('@/lib/api/annotation-sets').then(({ annotationSetsApi }) => {
      annotationSetsApi.getFeatures(annSetId)
        .then((fc) => {
          mm.setLayerData(layerId, fc);
          useMapLayersStore.setState((s) => ({
            layers: s.layers[layerId]
              ? { ...s.layers, [layerId]: { ...s.layers[layerId], loading: false, error: false } }
              : s.layers,
          }));
        })
        .catch(() => {
          annSetFetchedRef.current.delete(annSetId);
          useMapLayersStore.setState((s) => ({
            layers: s.layers[layerId]
              ? { ...s.layers, [layerId]: { ...s.layers[layerId], loading: false } }
              : s.layers,
          }));
        });
    });
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const mm = getMapManager();
    annotationSets.forEach((annSet) => {
      const layerId = `annset-${annSet.id}`;
      if (!layers[layerId]) return;
      if (annSetFetchedRef.current.has(annSet.id)) return;
      annSetFetchedRef.current.add(annSet.id);

      fetchAnnSetFeatures(annSet.id, layerId);

      // 4C: Register viewport callback for debounced reload on pan/zoom
      mm.registerViewportCallback(layerId, () => {
        fetchAnnSetFeatures(annSet.id, layerId);
      });
    });
  }, [annotationSets, layers, mapReady, fetchAnnSetFeatures]);

  // Dataset footprints (for datasets on the map that don't have tileUrl yet)
  useEffect(() => {
    if (!mapReady) return;
    const mm = getMapManager();
    datasets.forEach((d) => {
      const layer = layers[d.id];
      if (!layer) return;
      // Only push footprint data if there's no tile URL (footprint is the fallback)
      if (!layer.tileUrl && d.geometry) {
        const footprintData: DatasetFootprintData = {
          id: d.id,
          name: d.name,
          status: d.status,
          geometry: d.geometry,
        };
        mm.setLayerData(d.id, footprintData);
      }
    });
  }, [datasets, layers, mapReady]);

  // ── Only show datasets that are actually on this map ───────
  const activeDatasets = datasets.filter((d) => !!layers[d.id]);

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

  // On compact viewports, collapse LeftPanel when RightPanel opens
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

  // ── Layer reorder handler ─────────────────────────────────
  const handleLayerMove = useCallback((layerId: string, direction: 'up' | 'down') => {
    const result = useMapLayersStore.getState().moveLayer(layerId, direction);
    if (!result) return;

    // Build the new layer_ids array ordered by z_index (bottom-to-top for the API)
    const state = useMapLayersStore.getState();
    const backendIds = state.backendLayerIds;
    const sortedBackendIds = Object.entries(state.layers)
      .filter(([id]) => backendIds[id])
      .sort(([, a], [, b]) => a.zIndex - b.zIndex)
      .map(([id]) => backendIds[id]);

    if (sortedBackendIds.length > 1) {
      mapsApi.reorderLayers(mapId, sortedBackendIds).then((reordered) => {
        // Apply the server-assigned z_index values back to the store
        const newOrder: Record<string, number> = {};
        reordered.forEach((rl) => {
          // Find the frontend ID from the backend ID
          const frontendId = Object.entries(backendIds).find(([, bid]) => bid === rl.id)?.[0];
          if (frontendId) newOrder[frontendId] = rl.z_index;
        });
        if (Object.keys(newOrder).length > 0) {
          useMapLayersStore.getState().applyReorder(newOrder);
        }
      }).catch(() => {});
    }
  }, [mapId]);

  return (
    // Root — fills the viewport as a flex column: TopNav → Map area → StatusBar
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
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Map canvas — all feature layers are managed by MapManager via useMapSync */}
        <div style={{ position: 'absolute', inset: 0, zIndex: MAP_Z.canvas }}>
          <LeafletMap />
          {measurementActive && <MeasurementLayerDyn />}
        </div>

        {/* ── Scale bar ── */}
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

        {/* ── Panels ─── */}
        <LeftPanel
          open={layersOpen}
          onToggle={() => setLayersOpen((v) => !v)}
          topOffset={0}
          bottomOffset={0}
          projectId={projectId}
          mapId={mapId}
          datasets={activeDatasets}
          annotations={annotations}
          trackedObjects={trackedObjects}
          alerts={alerts}
          annotationSets={annotationSets}
          onRemoveDataset={handleRemoveDataset}
          onLayerMove={handleLayerMove}
        />

        <RightPanel topOffset={0} bottomOffset={0} mapId={mapId} projectId={projectId} />

        <LibraryPanel
          open={libraryOpen}
          topOffset={0}
          bottomOffset={0}
          projectId={projectId}
          mapId={mapId}
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
        autoSaveStatus={autoSaveStatus}
      />
    </div>
  );
}
