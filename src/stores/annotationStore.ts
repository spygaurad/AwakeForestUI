import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AnnotationSet, AnnotationClass } from '@/types/api';
import type { GeoJSONGeometry } from '@/types/geo';

interface PendingAnnotation {
  geometry: GeoJSONGeometry | null;
  classId: string | null;
  properties: Record<string, unknown> | null;
}

interface AnnotationState {
  // Active annotation set being edited
  activeSetId: string | null;
  activeSet: AnnotationSet | null;

  // Active schema classes for styling
  schemaClasses: Record<string, AnnotationClass>;

  // Drawing state
  pendingAnnotation: PendingAnnotation;
  isDrawing: boolean;

  // Loading/error states
  isLoadingSchema: boolean;
  isSavingAnnotation: boolean;
  error: string | null;

  // Actions
  setActiveSet: (setId: string | null, set?: AnnotationSet) => void;
  setSchemaClasses: (classes: Record<string, AnnotationClass>) => void;
  updateClassStyle: (classId: string, updatedClass: AnnotationClass) => void;

  // Pending annotation management
  setPendingAnnotation: (annotation: Partial<PendingAnnotation>) => void;
  clearPendingAnnotation: () => void;
  setIsDrawing: (isDrawing: boolean) => void;

  // Loading states
  setIsLoadingSchema: (isLoading: boolean) => void;
  setIsSavingAnnotation: (isSaving: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAnnotationStore = create<AnnotationState>()(
  subscribeWithSelector((set) => ({
    activeSetId: null,
    activeSet: null,
    schemaClasses: {},
    pendingAnnotation: {
      geometry: null,
      classId: null,
      properties: null,
    },
    isDrawing: false,
    isLoadingSchema: false,
    isSavingAnnotation: false,
    error: null,

    setActiveSet: (setId, annotationSet) =>
      set({
        activeSetId: setId,
        activeSet: annotationSet ?? null,
      }),

    setSchemaClasses: (schemaClasses) => set({ schemaClasses }),

    updateClassStyle: (classId, updatedClass) =>
      set((state) => ({
        schemaClasses: {
          ...state.schemaClasses,
          [classId]: updatedClass,
        },
      })),

    setPendingAnnotation: (annotation) =>
      set((state) => ({
        pendingAnnotation: {
          ...state.pendingAnnotation,
          ...annotation,
        },
      })),

    clearPendingAnnotation: () =>
      set({
        pendingAnnotation: {
          geometry: null,
          classId: null,
          properties: null,
        },
        isDrawing: false,
      }),

    setIsDrawing: (isDrawing) => set({ isDrawing }),

    setIsLoadingSchema: (isLoadingSchema) => set({ isLoadingSchema }),

    setIsSavingAnnotation: (isSavingAnnotation) => set({ isSavingAnnotation }),

    setError: (error) => set({ error }),
  })),
);
