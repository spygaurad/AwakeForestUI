import { useState, useCallback } from 'react';
import type { OverlayConfig, OverlayType } from '../types';


const DEFAULT_OVERLAYS: OverlayConfig[] = [
  { id: 'predictions', label: 'ML Predictions', enabled: true, opacity: 0.7 },
  { id: 'heatmap', label: 'Heatmap', enabled: false, opacity: 0.5 },
  { id: 'segmentation', label: 'Segmentation', enabled: false, opacity: 0.6 },
  { id: 'custom', label: 'Custom Layer', enabled: false, opacity: 0.5 },
];

export function useOverlayManager() {
  const [overlays, setOverlays] = useState<OverlayConfig[]>(DEFAULT_OVERLAYS);

  const toggleOverlay = useCallback((overlayId: OverlayType) => {
    setOverlays((prev) =>
      prev.map((overlay) =>
        overlay.id === overlayId
          ? { ...overlay, enabled: !overlay.enabled }
          : overlay
      )
    );
  }, []);

  const setOverlayOpacity = useCallback((overlayId: OverlayType, opacity: number) => {
    setOverlays((prev) =>
      prev.map((overlay) =>
        overlay.id === overlayId ? { ...overlay, opacity } : overlay
      )
    );
  }, []);

  const isOverlayEnabled = useCallback(
    (overlayId: OverlayType) => {
      return overlays.find((o) => o.id === overlayId)?.enabled ?? false;
    },
    [overlays]
  );

  const getOverlayOpacity = useCallback(
    (overlayId: OverlayType) => {
      return overlays.find((o) => o.id === overlayId)?.opacity ?? 1.0;
    },
    [overlays]
  );

  return {
    overlays,
    toggleOverlay,
    setOverlayOpacity,
    isOverlayEnabled,
    getOverlayOpacity,
  };
}
