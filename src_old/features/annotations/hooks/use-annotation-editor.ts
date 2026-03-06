'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  UIAnnotation,
  AnnotationType,
  AnnotationGeometry,
  createUIAnnotation,
  getAnnotationStats,
} from '@/features/annotations';

export function useAnnotationEditor(initialAnnotations: UIAnnotation[] = []) {
  const [annotations, setAnnotations] = useState<UIAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeGeometry, setActiveGeometry] = useState<AnnotationType>('bbox');
  const [counters, setCounters] = useState({ bbox: 0, point: 0, polygon: 0 });

  // Sync with loaded annotations
  useEffect(() => {
    if (initialAnnotations.length > 0) {
      setAnnotations(initialAnnotations);
      
      // Update counters from existing annotations
      const stats = getAnnotationStats(initialAnnotations);
      setCounters({
        bbox: stats.byType.bbox,
        point: stats.byType.point,
        polygon: stats.byType.polygon,
      });
    }
  }, [initialAnnotations]);

  const addAnnotation = useCallback(
    (geometry: AnnotationGeometry, type: AnnotationType) => {
      const newCounter = counters[type] + 1;
      setCounters((prev) => ({ ...prev, [type]: newCounter }));

      const displayLabel =
        type === 'bbox'
          ? `B${newCounter}`
          : type === 'point'
          ? `P${newCounter}`
          : `Poly${newCounter}`;

      const newAnnotation = createUIAnnotation(geometry, type, displayLabel);
      setAnnotations((prev) => [...prev, newAnnotation]);
      setSelectedId(newAnnotation.id);
    },
    [counters]
  );

  const updateAnnotationClass = useCallback((id: string, classId: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, classLabel: classId } : ann))
    );
  }, []);

  const deleteAnnotation = useCallback(
    (id: string) => {
      setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [selectedId]
  );

  const markAsSaved = useCallback((tempId: string, savedId: string) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === tempId ? { ...ann, id: savedId, isSaved: true } : ann
      )
    );
  }, []);

  const getUnsavedAnnotations = useCallback(() => {
    return annotations.filter((ann) => !ann.isSaved && ann.classLabel);
  }, [annotations]);

  return {
    annotations,
    selectedId,
    setSelectedId,
    activeGeometry,
    setActiveGeometry,
    addAnnotation,
    updateAnnotationClass,
    deleteAnnotation,
    markAsSaved,
    getUnsavedAnnotations,
  };
}
