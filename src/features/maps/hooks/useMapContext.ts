'use client';

/**
 * useMapContext — data layer for the map editor.
 *
 * Unidirectional data flow contract:
 *
 *   TanStack Query (server state)
 *     └─► datasets / annotations / trackedObjects / alerts / annotationSets arrays
 *         └─► initLayer() effects  ──► mapLayersStore.layers  (client layer configs)
 *                                         ├─► LeftPanel (layers list + legend)
 *                                         ├─► RightPanel (style panel reads layer.style)
 *                                         └─► useMapSync → MapManager (Leaflet rendering)
 *
 * Rule: query data NEVER writes back to the server. All mutations go through
 * dedicated useMutation hooks in the panels that triggered them, then invalidate
 * the relevant query keys so TanStack Query re-fetches automatically.
 *
 * mapLayersStore is the sole client-side source of truth for layer visibility,
 * opacity, and style. Components always read from the store, never from local
 * component state, to guarantee all three panels stay in sync automatically.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { EP } from '@/lib/api/endpoints';
import { annotationSetsApi } from '@/lib/api/annotation-sets';
import { qk } from '@/lib/query-keys';
import type { Dataset, Annotation, TrackedObject, Alert } from '@/types/api';
import type { PaginatedResponse } from '@/types/common';
import { useMapLayersStore } from '@/stores/mapLayersStore';

export function useMapContext(projectId: string, orgId: string, mapId?: string) {
  const initLayer = useMapLayersStore((s) => s.initLayer);

  const { data: datasetsData, isLoading: datasetsLoading, isError: datasetsError } = useQuery({
    queryKey: ['map-context', 'datasets', projectId],
    queryFn: () =>
      apiClient
        .get(EP.datasets.list, { searchParams: { project_id: projectId, limit: 100 } })
        .json<PaginatedResponse<Dataset>>(),
    enabled: !!projectId && !!orgId,
    // Poll while any dataset is still ingesting so status stays live
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((d) => d.status === 'ingesting' || d.status === 'pending') ? 5000 : false;
    },
  });

  const { data: annotationsData, isLoading: annotationsLoading, isError: annotationsError } = useQuery({
    queryKey: ['map-context', 'annotations', projectId],
    queryFn: () =>
      apiClient
        .get(EP.annotations.list, { searchParams: { project_id: projectId, limit: 200 } })
        .json<PaginatedResponse<Annotation>>(),
    enabled: !!projectId && !!orgId,
  });

  const { data: trackingData, isLoading: trackingLoading, isError: trackingError } = useQuery({
    queryKey: ['map-context', 'tracking', projectId],
    queryFn: () =>
      apiClient
        .get(EP.trackedObjects.list, { searchParams: { project_id: projectId, limit: 100 } })
        .json<PaginatedResponse<TrackedObject>>(),
    enabled: !!projectId && !!orgId,
  });

  const { data: alertsData, isLoading: alertsLoading, isError: alertsError } = useQuery({
    queryKey: ['map-context', 'alerts', projectId],
    queryFn: () =>
      apiClient
        .get(EP.alerts.list, { searchParams: { project_id: projectId, limit: 100 } })
        .json<PaginatedResponse<Alert>>(),
    enabled: !!projectId && !!orgId,
  });

  // ── Annotation Sets (per-map, Phase 2) ──────────────────────────────────────
  const { data: annotationSetsData, isLoading: annotationSetsLoading, isError: annotationSetsError } = useQuery({
    queryKey: qk.annotationSets.listByMap(mapId ?? ''),
    queryFn: () => annotationSetsApi.listByMap(mapId!),
    enabled: !!mapId && !!orgId,
  });

  const datasets = datasetsData?.items ?? [];
  const annotations = annotationsData?.items ?? [];
  const trackedObjects = trackingData?.items ?? [];
  const alerts = alertsData?.items ?? [];
  const annotationSets = annotationSetsData?.items ?? [];

  const isLoading = datasetsLoading || annotationsLoading || trackingLoading || alertsLoading || annotationSetsLoading;
  const isError = datasetsError || annotationsError || trackingError || alertsError || annotationSetsError;

  // ── Store initialization — query data → mapLayersStore ────────────────────
  // Datasets are NOT auto-initialized here. They enter the layers store only
  // when the user explicitly "adds to map" via LibraryPanel or DatasetInfoPanel,
  // or when backend map layers are restored by MapEditorShell on mount.
  // This ensures the legend only shows layers the user actually added.

  const annotationLabels = [...new Set(annotations.map((a) => a.label))].join(',');
  useEffect(() => {
    annotationLabels.split(',').filter(Boolean).forEach((label) =>
      initLayer(`annotation-${label}`, 'annotation')
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationLabels, initLayer]);

  useEffect(() => {
    if (trackedObjects.length > 0) initLayer('tracking-all', 'tracking');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedObjects.length, initLayer]);

  useEffect(() => {
    if (alerts.length > 0) initLayer('alerts-all', 'alert');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length, initLayer]);

  // ── Annotation sets → layer store ──────────────────────────────────────────
  const annotationSetIds = annotationSets.map((s) => s.id).join(',');
  useEffect(() => {
    annotationSets.forEach((annSet) => {
      const layerId = `annset-${annSet.id}`;
      // Build per-class styles from schema classes
      const classStyles: Record<string, { fillColor: string; strokeColor: string; strokeWidth: number; fillOpacity: number }> = {};
      if (annSet.schema?.classes) {
        for (const cls of annSet.schema.classes) {
          if (cls.style?.definition) {
            classStyles[cls.id] = {
              fillColor: cls.style.definition.fillColor,
              strokeColor: cls.style.definition.strokeColor,
              strokeWidth: cls.style.definition.strokeWidth,
              fillOpacity: cls.style.definition.fillOpacity,
            };
          }
        }
      }
      initLayer(layerId, 'annotation', {
        name: annSet.name,
        sourceType: 'annotation_set',
        annotationSetId: annSet.id,
        classStyles: Object.keys(classStyles).length > 0 ? classStyles : undefined,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationSetIds, initLayer]);

  return { datasets, annotations, trackedObjects, alerts, annotationSets, isLoading, isError };
}
