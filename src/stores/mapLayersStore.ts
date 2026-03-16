import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LayerConfig, LayerStyle, SelectedFeature, RightPanelMode, LayerType, PendingAnnotation } from '@/features/maps/types';

// ── Feature-click tracking (module-level) ──────────────────────────────────────
// Used by map click handler to distinguish empty-map clicks from feature clicks.
let _featureClickTime = 0;
export function markFeatureClick() { _featureClickTime = Date.now(); }
export function wasFeatureJustClicked() { return Date.now() - _featureClickTime < 100; }
import {
  DEFAULT_ANNOTATION_STYLE,
  DEFAULT_DATASET_STYLE,
  DEFAULT_TRACKING_STYLE,
  DEFAULT_ALERT_STYLE,
} from '@/features/maps/types';

const DEFAULT_STYLES: Record<LayerType, LayerStyle> = {
  annotation: DEFAULT_ANNOTATION_STYLE,
  dataset: DEFAULT_DATASET_STYLE,
  tracking: DEFAULT_TRACKING_STYLE,
  alert: DEFAULT_ALERT_STYLE,
};

interface MapLayersState {
  layers: Record<string, LayerConfig>; // keyed by id
  rightPanelMode: RightPanelMode;
  selectedLayerId: string | null;
  selectedFeature: SelectedFeature | null;
  measurementActive: boolean;
  measurementPoints: [number, number][];

  // pending annotation (drawn but not yet saved)
  pendingAnnotation: PendingAnnotation | null;
  openAnnotationPanel: () => void;
  setPendingAnnotationField: (patch: Partial<Omit<PendingAnnotation, 'attributes' | 'style'>>) => void;
  setPendingAnnotationStyle: (patch: Partial<LayerStyle>) => void;
  addPendingAnnotationAttribute: () => void;
  updatePendingAnnotationAttribute: (idx: number, key: string, value: string) => void;
  removePendingAnnotationAttribute: (idx: number) => void;
  clearPendingAnnotation: () => void;

  // layer config actions
  initLayer: (id: string, type: LayerType) => void;
  setLayerVisible: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerStyle: (id: string, patch: Partial<LayerStyle>) => void;
  getLayer: (id: string) => LayerConfig | undefined;

  // right panel
  openFeaturePanel: (feature: SelectedFeature) => void;
  openStylePanel: (layerId: string) => void;
  openMeasurementPanel: () => void;
  showAnnotationPanel: () => void; // re-show panel without resetting pendingAnnotation
  closeRightPanel: () => void;

  // measurement
  toggleMeasurement: () => void;
  addMeasurementPoint: (pt: [number, number]) => void;
  clearMeasurement: () => void;
  clearMeasurementPoints: () => void; // clear points but keep measuring active
}

export const useMapLayersStore = create<MapLayersState>()(
  subscribeWithSelector((set, get) => ({
    layers: {},
    rightPanelMode: 'none',
    selectedLayerId: null,
    selectedFeature: null,
    measurementActive: false,
    measurementPoints: [],
    pendingAnnotation: null,

    initLayer: (id, type) =>
      set((s) => {
        if (s.layers[id]) return s;
        return {
          layers: {
            ...s.layers,
            [id]: { id, type, visible: true, opacity: 1, style: { ...DEFAULT_STYLES[type] } },
          },
        };
      }),

    setLayerVisible: (id, visible) =>
      set((s) => ({
        layers: { ...s.layers, [id]: { ...s.layers[id], visible } },
      })),

    setLayerOpacity: (id, opacity) =>
      set((s) => ({
        layers: { ...s.layers, [id]: { ...s.layers[id], opacity } },
      })),

    setLayerStyle: (id, patch) =>
      set((s) => ({
        layers: {
          ...s.layers,
          [id]: { ...s.layers[id], style: { ...s.layers[id]?.style, ...patch } },
        },
      })),

    getLayer: (id) => get().layers[id],

    openAnnotationPanel: () =>
      set({
        rightPanelMode: 'new-annotation',
        selectedFeature: null,
        selectedLayerId: null,
        pendingAnnotation: {
          label: '',
          description: '',
          style: { ...DEFAULT_STYLES.annotation },
          attributes: [],
        },
      }),

    setPendingAnnotationField: (patch) =>
      set((s) =>
        s.pendingAnnotation
          ? { pendingAnnotation: { ...s.pendingAnnotation, ...patch } }
          : s
      ),

    setPendingAnnotationStyle: (patch) =>
      set((s) =>
        s.pendingAnnotation
          ? {
              pendingAnnotation: {
                ...s.pendingAnnotation,
                style: { ...s.pendingAnnotation.style, ...patch },
              },
            }
          : s
      ),

    addPendingAnnotationAttribute: () =>
      set((s) =>
        s.pendingAnnotation
          ? {
              pendingAnnotation: {
                ...s.pendingAnnotation,
                attributes: [...s.pendingAnnotation.attributes, { key: '', value: '' }],
              },
            }
          : s
      ),

    updatePendingAnnotationAttribute: (idx, key, value) =>
      set((s) => {
        if (!s.pendingAnnotation) return s;
        const attrs = [...s.pendingAnnotation.attributes];
        attrs[idx] = { key, value };
        return { pendingAnnotation: { ...s.pendingAnnotation, attributes: attrs } };
      }),

    removePendingAnnotationAttribute: (idx) =>
      set((s) => {
        if (!s.pendingAnnotation) return s;
        return {
          pendingAnnotation: {
            ...s.pendingAnnotation,
            attributes: s.pendingAnnotation.attributes.filter((_, i) => i !== idx),
          },
        };
      }),

    clearPendingAnnotation: () =>
      set({ pendingAnnotation: null, rightPanelMode: 'none' }),

    openFeaturePanel: (feature) =>
      set({ rightPanelMode: 'feature', selectedFeature: feature, selectedLayerId: null }),

    openStylePanel: (layerId) =>
      set({ rightPanelMode: 'style', selectedLayerId: layerId, selectedFeature: null }),

    openMeasurementPanel: () =>
      set({ rightPanelMode: 'measurement', selectedFeature: null, selectedLayerId: null }),

    showAnnotationPanel: () =>
      set((s) => s.pendingAnnotation ? { rightPanelMode: 'new-annotation' } : s),

    closeRightPanel: () =>
      set({ rightPanelMode: 'none', selectedLayerId: null, selectedFeature: null }),

    toggleMeasurement: () =>
      set((s) => {
        const newActive = !s.measurementActive;
        return {
          measurementActive: newActive,
          measurementPoints: [],
          // Automatically open/close measurement panel
          rightPanelMode: newActive
            ? 'measurement'
            : s.rightPanelMode === 'measurement' ? 'none' : s.rightPanelMode,
        };
      }),

    addMeasurementPoint: (pt) =>
      set((s) => ({ measurementPoints: [...s.measurementPoints, pt] })),

    clearMeasurement: () =>
      set((s) => ({
        measurementPoints: [],
        measurementActive: false,
        rightPanelMode: s.rightPanelMode === 'measurement' ? 'none' : s.rightPanelMode,
      })),

    clearMeasurementPoints: () => set({ measurementPoints: [] }),
  }))
);
