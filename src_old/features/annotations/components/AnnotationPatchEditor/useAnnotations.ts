'use client';

import { useState, useCallback, useRef } from 'react';
import type { Annotation, AnnotationTool, BoxAnnotation, PointAnnotation, PolygonAnnotation } from './types';
import { ANNOTATION_COLORS, generateId } from './types';

interface UseAnnotationsReturn {
  // State
  annotations: Annotation[];
  selectedIds: string[];
  activeTool: AnnotationTool;
  activeColor: string;
  activeLabel: string;
  canUndo: boolean;
  
  // Tool actions
  setActiveTool: (tool: AnnotationTool) => void;
  setActiveColor: (color: string) => void;
  setActiveLabel: (label: string) => void;
  
  // Annotation actions
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  deleteSelected: () => void;
  clearAll: () => void;
  
  // Selection
  selectAnnotation: (id: string, multi?: boolean) => void;
  setSelection: (ids: string[]) => void;
  
  // Visibility & Lock
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  
  // History
  undo: () => void;
  
  // Model results integration
  loadModelResults: (results: any[]) => void;
  clearModelResults: () => void;
}

export function useAnnotations(): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [activeLabel, setActiveLabel] = useState<string>('');
  
  // History for undo
  const historyRef = useRef<Annotation[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushHistory = useCallback(() => {
    historyRef.current.push([...annotations]);
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    setCanUndo(true);
  }, [annotations]);

  const addAnnotation = useCallback((annotation: Annotation) => {
    pushHistory();
    setAnnotations(prev => [...prev, annotation]);
  }, [pushHistory]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, ...updates } as Annotation : ann
      )
    );
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    pushHistory();
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  }, [pushHistory]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    pushHistory();
    setAnnotations(prev => prev.filter(ann => !selectedIds.includes(ann.id)));
    setSelectedIds([]);
  }, [selectedIds, pushHistory]);

  const clearAll = useCallback(() => {
    if (annotations.length === 0) return;
    pushHistory();
    setAnnotations([]);
    setSelectedIds([]);
  }, [annotations.length, pushHistory]);

  const selectAnnotation = useCallback((id: string, multi?: boolean) => {
    if (multi) {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(sid => sid !== id)
          : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setAnnotations(prev =>
      prev.map(ann =>
        ann.id === id ? { ...ann, visible: !ann.visible } : ann
      )
    );
  }, []);

  const toggleLock = useCallback((id: string) => {
    setAnnotations(prev =>
      prev.map(ann =>
        ann.id === id ? { ...ann, locked: !ann.locked } : ann
      )
    );
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prevState = historyRef.current.pop();
    if (prevState) {
      setAnnotations(prevState);
      setSelectedIds([]);
    }
    setCanUndo(historyRef.current.length > 0);
  }, []);

  // Convert model results to annotations
  const loadModelResults = useCallback((results: any[]) => {
    pushHistory();
    
    const newAnnotations: Annotation[] = results.map((det, index) => {
      const color = ANNOTATION_COLORS[index % ANNOTATION_COLORS.length];
      
      // Handle different result formats from your FastAPI
      if (det.bbox || det.box) {
        const box = det.bbox || det.box;
        // Assume box format is [x1, y1, x2, y2] or {x, y, width, height}
        let x: number, y: number, width: number, height: number;
        
        if (Array.isArray(box)) {
          [x, y] = box;
          width = box[2] - box[0];
          height = box[3] - box[1];
        } else {
          x = box.x;
          y = box.y;
          width = box.width;
          height = box.height;
        }

        return {
          id: generateId(),
          type: 'box',
          box: { x, y, width, height },
          color,
          label: det.class_name || det.label || 'detection',
          confidence: det.confidence || det.score,
          source: 'model',
          visible: true,
          locked: false,
          createdAt: Date.now(),
        } as BoxAnnotation;
      }

      // Handle point detections
      if (det.point || det.center) {
        const point = det.point || det.center;
        return {
          id: generateId(),
          type: 'point',
          point: { x: point.x || point[0], y: point.y || point[1] },
          color,
          label: det.class_name || det.label || 'point',
          confidence: det.confidence || det.score,
          source: 'model',
          visible: true,
          locked: false,
          createdAt: Date.now(),
        } as PointAnnotation;
      }

      // Handle polygon/segmentation results
      if (det.polygon || det.segmentation || det.contour) {
        const points = det.polygon || det.segmentation || det.contour;
        // Convert various formats to Point[]
        const normalizedPoints: { x: number; y: number }[] = Array.isArray(points[0])
          ? points.map((p: number[]) => ({ x: p[0], y: p[1] }))
          : points;

        return {
          id: generateId(),
          type: 'polygon',
          points: normalizedPoints,
          closed: true,
          color,
          label: det.class_name || det.label || 'segment',
          confidence: det.confidence || det.score,
          source: 'model',
          visible: true,
          locked: false,
          createdAt: Date.now(),
        } as PolygonAnnotation;
      }

      // Fallback for unknown format
      return null;
    }).filter(Boolean) as Annotation[];

    setAnnotations(prev => [...prev, ...newAnnotations]);
  }, [pushHistory]);

  const clearModelResults = useCallback(() => {
    pushHistory();
    setAnnotations(prev => prev.filter(ann => ann.source !== 'model'));
    setSelectedIds(prev => {
      const modelIds = annotations.filter(a => a.source === 'model').map(a => a.id);
      return prev.filter(id => !modelIds.includes(id));
    });
  }, [annotations, pushHistory]);

  return {
    annotations,
    selectedIds,
    activeTool,
    activeColor,
    activeLabel,
    canUndo,
    setActiveTool,
    setActiveColor,
    setActiveLabel,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    deleteSelected,
    clearAll,
    selectAnnotation,
    setSelection,
    toggleVisibility,
    toggleLock,
    undo,
    loadModelResults,
    clearModelResults,
  };
}