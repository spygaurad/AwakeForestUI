/**
 * useMapSync — Reactive bridge from Zustand stores to MapManager.
 *
 * Subscribes to mapLayersStore and dispatches imperative calls to MapManager
 * whenever layer configs change. This is the ONLY place that reads store
 * changes and translates them into Leaflet mutations.
 */

import { useEffect, useRef } from 'react';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { getMapManager } from '../MapManager';
import type { LayerConfig } from '../types';

export function useMapSync(): void {
  const prevLayersRef = useRef<Record<string, LayerConfig>>({});

  useEffect(() => {
    const unsub = useMapLayersStore.subscribe(
      (s) => s.layers,
      (current, prev) => {
        const mm = getMapManager();
        if (!mm.getMap()) return;

        const currentIds = new Set(Object.keys(current));
        const prevIds = new Set(Object.keys(prev));

        // ── Added layers ──────────────────────────────────────
        for (const id of currentIds) {
          if (!prevIds.has(id)) {
            mm.addLayer(current[id]);
          }
        }

        // ── Removed layers ────────────────────────────────────
        for (const id of prevIds) {
          if (!currentIds.has(id)) {
            mm.removeLayer(id);
          }
        }

        // ── Changed layers ────────────────────────────────────
        for (const id of currentIds) {
          if (!prevIds.has(id)) continue; // already handled as added
          const curr = current[id];
          const old = prev[id];
          if (curr === old) continue;

          // Visibility changed
          if (curr.visible !== old.visible) {
            mm.setLayerVisible(id, curr.visible);
          }

          // Opacity changed
          if (curr.opacity !== old.opacity) {
            mm.setLayerOpacity(id, curr.opacity);
          }

          // Style changed
          if (curr.style !== old.style) {
            mm.setLayerStyle(id, curr.style, curr);
          }

          // TileUrl changed — need to rebuild the tile layer
          if (curr.tileUrl !== old.tileUrl) {
            mm.rebuildTileLayer(id, curr);
          }

          // TileBounds changed — create/update pointer marker
          if (curr.tileBounds !== old.tileBounds && curr.tileBounds) {
            mm.updateLayerBounds(id, curr.tileBounds, curr);
          }
        }

        prevLayersRef.current = current;
      }
    );

    return unsub;
  }, []);

  // ── Handle zoomToBounds requests ────────────────────────────────────────────
  useEffect(() => {
    const unsub = useMapLayersStore.subscribe(
      (s) => s.zoomToBounds,
      (bounds) => {
        if (!bounds) return;
        const mm = getMapManager();
        mm.fitBounds(bounds);
        // Clear after handling
        useMapLayersStore.getState().clearZoomToBounds();
      }
    );
    return unsub;
  }, []);

  // ── Handle zoom level changes for pointer visibility ────────────────────────
  useEffect(() => {
    const unsub = useMapLayersStore.subscribe(
      (s) => s.currentZoom,
      (zoom) => {
        const mm = getMapManager();
        mm.updatePointersForZoom(zoom);
      }
    );
    return unsub;
  }, []);

  // ── Handle layer focus changes ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = useMapLayersStore.subscribe(
      (s) => s.focusedLayerId,
      (layerId) => {
        if (!layerId) return;
        const mm = getMapManager();
        mm.focusLayer(layerId);
      }
    );
    return unsub;
  }, []);
}
