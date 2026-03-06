'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Hash,
  Map as MapIcon,
  Layout,
  MousePointer2,
  Square,
  Pentagon,
  Circle,
  X,
  Loader2
} from 'lucide-react';
import { useTiffMetadata } from '@/features/annotations';
import { UIAnnotation } from '@/features/annotations';
import { useLabels } from '../../hooks/use-labels';
import LoadingScreen from '../LoadingScreen';
import ErrorScreen from '../ErrorScreen';
import PatchView from './PatchView';
import MiniMap from './MiniMap';
import PatchInspectorSidebar, { type InferenceModel } from './PatchInspectorSidebar';

import type { ProjectId, DatasetId, DatasetItemId } from '@/types';

interface AnnotationPatchEditorProps {
  projectId: ProjectId;
  datasetId: DatasetId;
  itemId: DatasetItemId;
  tiffUrl: string;
  projectName?: string;
  datasetName?: string;
  onBack: () => void;
}

export default function AnnotationPatchEditor({ projectId, datasetId, itemId, tiffUrl, projectName, datasetName, onBack }: AnnotationPatchEditorProps) {
  const { data: tiffInfo, isLoading, error } = useTiffMetadata(tiffUrl);

  const [gridIndex, setGridIndex] = useState(0);

  // Target patch size in pixels (matches canvas size for optimal viewing)
  const TARGET_PATCH_SIZE = 800;

  // Calculate grid dimensions dynamically based on TIFF size
  const gridDimensions = useMemo(() => {
    if (!tiffInfo?.width || !tiffInfo?.height) {
      // Fallback to 10x10 grid if dimensions not available
      return { cols: 10, rows: 10, total: 100 };
    }

    // Calculate how many patches fit in each dimension
    const cols = Math.ceil(tiffInfo.width / TARGET_PATCH_SIZE);
    const rows = Math.ceil(tiffInfo.height / TARGET_PATCH_SIZE);

    console.log(`📐 Grid calculated: ${cols}x${rows} (${cols * rows} patches) for ${tiffInfo.width}x${tiffInfo.height}px image`);

    return { cols, rows, total: cols * rows };
  }, [tiffInfo?.width, tiffInfo?.height]);

  const { cols: gridCols, rows: gridRows, total: totalPatches } = gridDimensions;

  // Helper function to calculate patch bounds for any grid index
  const getPatchBounds = (index: number): [number, number, number, number] | null => {
    if (!tiffInfo?.bounds || !tiffInfo?.width || !tiffInfo?.height) return null;
    const [minLon, minLat, maxLon, maxLat] = tiffInfo.bounds;

    const row = Math.floor(index / gridCols);
    const col = index % gridCols;

    // Calculate pixel bounds for this patch
    const pxMinX = col * TARGET_PATCH_SIZE;
    const pxMinY = row * TARGET_PATCH_SIZE;
    const pxMaxX = Math.min((col + 1) * TARGET_PATCH_SIZE, tiffInfo.width);
    const pxMaxY = Math.min((row + 1) * TARGET_PATCH_SIZE, tiffInfo.height);

    // Convert pixel bounds to geographic bounds
    const lonPerPixel = (maxLon - minLon) / tiffInfo.width;
    const latPerPixel = (maxLat - minLat) / tiffInfo.height;

    const geoMinLon = minLon + pxMinX * lonPerPixel;
    const geoMaxLon = minLon + pxMaxX * lonPerPixel;
    const geoMinLat = maxLat - pxMaxY * latPerPixel; // Y is inverted
    const geoMaxLat = maxLat - pxMinY * latPerPixel;

    return [geoMinLon, geoMinLat, geoMaxLon, geoMaxLat];
  };

  // Current patch bounds (memoized for the current gridIndex)
  const currentPatchBounds = useMemo(() => getPatchBounds(gridIndex), [tiffInfo, gridIndex, gridCols]);

  const [manualAnnotations, setManualAnnotations] = useState<UIAnnotation[]>([]);
  const [modelAnnotations, setModelAnnotations] = useState<UIAnnotation[]>([]);

  // NEW: Lifted selection state - tracks the ID of the currently selected annotation
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Drawing mode state
  type DrawingMode = 'select' | 'point' | 'bbox' | 'polygon' | 'prompt-bbox';
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('select');

  // Prompt bboxes for SAM3 bbox endpoint (pixel coordinates)
  const [promptBboxes, setPromptBboxes] = useState<[number, number, number, number][]>([]);

  // Bulk inference state
  const [isBulkInferenceRunning, setIsBulkInferenceRunning] = useState(false);
  const [bulkInferenceProgress, setBulkInferenceProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
    annotationsFound: 0
  });
  const [showBulkProgress, setShowBulkProgress] = useState(true);
  const bulkInferenceAbortRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch labels for coloring annotations
  const { labels } = useLabels({ projectId });

  // Create unique patch identifier: {itemId}-patch-{gridIndex}
  const patchId = useMemo(() => `${itemId}-patch-${gridIndex}`, [itemId, gridIndex]);

  // Load annotations for the current patch when patchId changes
  useEffect(() => {
    // IMPORTANT: Clear annotations immediately when patch changes to avoid showing stale data
    setManualAnnotations([]);
    setModelAnnotations([]);
    setPromptBboxes([]);
    setSelectedAnnotationId(null);

    const loadAnnotations = async () => {
      try {
        const response = await fetch(`/api/annotations?patchId=${encodeURIComponent(patchId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.annotations && Array.isArray(data.annotations)) {
            // Separate manual (saved) and model (unsaved) annotations
            const manual = data.annotations.filter((ann: UIAnnotation) => ann.isSaved);
            const model = data.annotations.filter((ann: UIAnnotation) => !ann.isSaved);
            setManualAnnotations(manual);
            setModelAnnotations(model);
            console.log(`✅ Loaded ${data.annotations.length} annotations for ${patchId}`, {
              manual: manual.length,
              model: model.length,
              annotations: data.annotations.map((a: any) => ({id: a.id, isSaved: a.isSaved, label: a.displayLabel}))
            });
          }
          // Load prompt bboxes
          if (data.promptBboxes && Array.isArray(data.promptBboxes)) {
            setPromptBboxes(data.promptBboxes);
            console.log(`✅ Loaded ${data.promptBboxes.length} prompt bboxes for ${patchId}`);
          }
        }
      } catch (error) {
        console.error('Failed to load annotations:', error);
      }
    };
    loadAnnotations();
  }, [patchId]); // Reload when patch changes

  // Save annotations for the current patch whenever they change (debounced)
  // Saves BOTH: manualAnnotations (approved, isSaved: true) + modelAnnotations (predictions, isSaved: false)
  // Skip auto-save during bulk inference to avoid conflicts
  useEffect(() => {
    // Don't auto-save during bulk inference
    if (isBulkInferenceRunning) {
      return;
    }

    const saveAnnotations = async () => {
      const allAnns = [...manualAnnotations, ...modelAnnotations];

      try {
        const response = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patchId: patchId,
            annotations: allAnns,
            promptBboxes,
            // Store all metadata for easy migration to real DB
            projectId,
            datasetId,
            itemId,
            gridIndex,
            tiffUrl,
            bounds: currentPatchBounds,
            gridCols,
            gridRows
          })
        });

        if (response.ok) {
          console.log(`💾 Saved ${allAnns.length} annotations and ${promptBboxes.length} prompt bboxes for ${patchId}`);
        }
      } catch (error) {
        console.error('Failed to save annotations:', error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveAnnotations, 500);
    return () => clearTimeout(timeoutId);
  }, [manualAnnotations, modelAnnotations, promptBboxes, patchId, projectId, datasetId, itemId, gridIndex, tiffUrl, currentPatchBounds, gridCols, gridRows, isBulkInferenceRunning]);
  
  // Merge annotations and apply selection state
  const allAnnotations = useMemo(() => {
    return [...manualAnnotations, ...modelAnnotations].map(ann => ({
      ...ann,
      isSelected: ann.id === selectedAnnotationId
    }));
  }, [manualAnnotations, modelAnnotations, selectedAnnotationId]);

  // Handler for selecting an annotation (used by both PatchView and Sidebar)
  const handleAnnotationSelect = (annotationId: string | null) => {
    setSelectedAnnotationId(prev => prev === annotationId ? null : annotationId);
  };

  // Handler for deleting an annotation
  const handleAnnotationDelete = (annotationId: string) => {
    setManualAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
    setModelAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
    if (selectedAnnotationId === annotationId) {
      setSelectedAnnotationId(null);
    }
    console.log('Deleted annotation:', annotationId);
  };

  // Handler for approving an annotation (moves from model to manual/saved)
  const handleAnnotationApprove = (annotationId: string) => {
    const annotation = modelAnnotations.find(ann => ann.id === annotationId);
    if (annotation) {
      // Check if annotation has a label
      if (!annotation.labelId) {
        console.warn('Cannot approve annotation without label');
        return;
      }
      // Move from model predictions to manual (approved) annotations
      setModelAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
      setManualAnnotations(prev => [...prev, { ...annotation, isSaved: true }]);
      console.log('Approved annotation:', annotationId);
    }
  };

  // Handler for changing annotation label
  const handleAnnotationLabelChange = (annotationId: string, labelId: string) => {
    // Update in manual annotations
    setManualAnnotations(prev => prev.map(ann =>
      ann.id === annotationId ? { ...ann, labelId } : ann
    ));
    // Update in model annotations
    setModelAnnotations(prev => prev.map(ann =>
      ann.id === annotationId ? { ...ann, labelId } : ann
    ));
    console.log('Updated annotation label:', annotationId, labelId);
  };

  // Handler for bulk assigning label to all unlabeled annotations
  const handleBulkAssignLabel = (labelId: string) => {
    // Update all unlabeled annotations (both manual and model)
    setManualAnnotations(prev => prev.map(ann =>
      !ann.labelId ? { ...ann, labelId } : ann
    ));
    setModelAnnotations(prev => prev.map(ann =>
      !ann.labelId ? { ...ann, labelId } : ann
    ));
    console.log('Bulk assigned label:', labelId);
  };

  // Handler for bulk approving all annotations with a specific label
  const handleBulkApprove = (labelId: string) => {
    // Find all model annotations with this label
    const toApprove = modelAnnotations.filter(ann => ann.labelId === labelId);

    if (toApprove.length === 0) {
      console.log('No annotations with this label to approve');
      return;
    }

    // Move from model to manual
    setModelAnnotations(prev => prev.filter(ann => ann.labelId !== labelId));
    setManualAnnotations(prev => [
      ...prev,
      ...toApprove.map(ann => ({ ...ann, isSaved: true }))
    ]);

    console.log('Bulk approved', toApprove.length, 'annotations with label:', labelId);
  };

  // Handler for creating a new annotation (manual drawing)
  const handleAnnotationCreate = (annotation: UIAnnotation) => {
    // Add to manual annotations (will be auto-saved by the persistence effect)
    setManualAnnotations(prev => [...prev, annotation]);
    console.log('Created manual annotation:', annotation.id);
  };

  // Callback for Generic Predictions
  // Note: This REPLACES modelAnnotations (unapproved) but preserves manualAnnotations (approved)
  const handleNewPredictions = (newAnns: UIAnnotation[]) => {
    setModelAnnotations(newAnns);
    setSelectedAnnotationId(null); // Clear selection on new predictions
    console.log('Updated model predictions:', newAnns.length, 'annotations');
  };

  // Handler for creating a new prompt bbox (SAM3 bbox prompts)
  const handlePromptBboxCreate = (bbox: [number, number, number, number]) => {
    setPromptBboxes(prev => [...prev, bbox]);
    console.log('Created prompt bbox:', bbox);
  };

  // Handler for deleting a prompt bbox by index
  const handlePromptBboxDelete = (index: number) => {
    setPromptBboxes(prev => prev.filter((_, i) => i !== index));
    console.log('Deleted prompt bbox at index:', index);
  };

  // Handler for clearing all prompt bboxes
  const handlePromptBboxesClear = () => {
    setPromptBboxes([]);
    console.log('Cleared all prompt bboxes');
  };

  // Handler for enabling prompt bbox drawing mode
  const handleEnablePromptBboxDrawing = () => {
    setDrawingMode(prev => prev === 'prompt-bbox' ? 'select' : 'prompt-bbox');
  };

  // Handler for loading bboxes from a template
  const handleLoadPromptBboxes = (bboxes: [number, number, number, number][]) => {
    setPromptBboxes(bboxes);
    console.log('Loaded prompt bboxes from template:', bboxes.length);
  };

  // Handler for bulk inference across all patches (runs in background)
  const handleBulkInference = async (model: InferenceModel, prompt?: string) => {
    if (!tiffInfo?.bounds || !tiffInfo?.width || !tiffInfo?.height) {
      alert('TIFF not ready for bulk inference');
      return;
    }

    const confirmed = confirm(
      `Run inference on all ${totalPatches} patches in background?\n\n` +
      `This will process the entire ${gridCols}x${gridRows} grid using ${model.display_name}.\n` +
      `You can continue working while it runs.`
    );

    if (!confirmed) return;

    setIsBulkInferenceRunning(true);
    setShowBulkProgress(true);
    bulkInferenceAbortRef.current = false;
    setBulkInferenceProgress({ current: 0, total: totalPatches, success: 0, failed: 0, annotationsFound: 0 });

    // Store current patch to return to later
    const returnToPatch = gridIndex;

    // Run in background (async, non-blocking)
    (async () => {
      let successCount = 0;
      let errorCount = 0;
      let totalAnnotationsFound = 0;

      try {
        for (let i = 0; i < totalPatches; i++) {
          if (bulkInferenceAbortRef.current) {
            console.log('Bulk inference aborted by user');
            break;
          }

          try {
            // Calculate patch bounds using the helper function
            const patchBounds = getPatchBounds(i);
            if (!patchBounds) {
              throw new Error('Could not calculate patch bounds');
            }

            // Navigate to patch to capture canvas
            setGridIndex(i);
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Canvas not ready');

            const imageBlob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95)
            );

            if (!imageBlob) throw new Error('Failed to capture canvas');

            // Run inference
            const formData = new FormData();
            formData.append('file', imageBlob, `patch_${i}.jpg`);

            const baseUrl = model.endpoint_url;
            const endpointPath = model.endpoint_path;
            const promptType = model.config?.prompt_type as string | undefined;
            const params = new URLSearchParams();

            if (promptType === 'text' && prompt) {
              params.append('text_prompts', prompt);
            } else if (promptType === 'multimodal' && prompt) {
              params.append('text_prompt', prompt);
              params.append('bboxes', JSON.stringify([[0, 0, canvas.width, canvas.height]]));
            } else if (promptType === 'bbox') {
              const pad = 100;
              params.append('bboxes', JSON.stringify([[pad, pad, canvas.width - pad, canvas.height - pad]]));
            }

            const response = await fetch(`${baseUrl}${endpointPath}?${params.toString()}`, {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Model server error (${response.status})`);
            }

            const data = await response.json();

            // Convert to UI annotations (these are model predictions, isSaved: false)
            const { adaptPredictionToUIAnnotation } = await import('../../utils/adapters');
            const newPredictions = adaptPredictionToUIAnnotation(
              data,
              endpointPath,
              patchBounds,
              canvas.width,
              canvas.height
            );

            // Load existing annotations for this patch to preserve approved ones
            const patchId = `${itemId}-patch-${i}`;
            let existingApproved: UIAnnotation[] = [];

            try {
              const existingResponse = await fetch(`/api/annotations?patchId=${encodeURIComponent(patchId)}`);
              if (existingResponse.ok) {
                const existingData = await existingResponse.json();
                // Keep only approved annotations (isSaved: true)
                existingApproved = existingData.annotations?.filter((ann: UIAnnotation) => ann.isSaved) || [];
              }
            } catch (err) {
              console.warn(`Could not load existing annotations for ${patchId}:`, err);
            }

            // Merge: Keep approved annotations + add new model predictions
            const mergedAnnotations = [...existingApproved, ...newPredictions];

            // Save merged annotations for this patch
            // Note: Auto-save is disabled during bulk inference to avoid conflicts
            const saveResponse = await fetch('/api/annotations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patchId,
                annotations: mergedAnnotations,
                projectId,
                datasetId,
                itemId,
                gridIndex: i,
                tiffUrl,
                bounds: patchBounds,
                gridCols,
                gridRows
              })
            });

            if (saveResponse.ok) {
              successCount++;
              totalAnnotationsFound += newPredictions.length;
              console.log(`✅ Patch ${i + 1}/${totalPatches}: Saved ${newPredictions.length} new + ${existingApproved.length} approved = ${mergedAnnotations.length} total`);
            } else {
              const errorBody = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(`Save failed (${saveResponse.status}): ${errorBody.error || 'Unknown error'}`);
            }

          } catch (err: any) {
            errorCount++;
            console.error(`❌ Patch ${i + 1}/${totalPatches} failed:`, err.message);
            // Log full error for debugging
            console.error('Full error details:', err);
          }

          setBulkInferenceProgress({
            current: i + 1,
            total: totalPatches,
            success: successCount,
            failed: errorCount,
            annotationsFound: totalAnnotationsFound
          });
        }

        // Return to original patch
        setGridIndex(returnToPatch);

        // Calculate statistics
        let patchesWithAnnotations = 0;
        let totalAnnotationsAdded = 0;

        for (let i = 0; i < totalPatches; i++) {
          const checkPatchId = `${itemId}-patch-${i}`;
          try {
            const checkResponse = await fetch(`/api/annotations?patchId=${encodeURIComponent(checkPatchId)}`);
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              const annCount = checkData.annotations?.length || 0;
              if (annCount > 0) {
                patchesWithAnnotations++;
                totalAnnotationsAdded += annCount;
              }
            }
          } catch (err) {
            // Ignore errors during stats collection
          }
        }

        // Show completion notification with detailed stats
        alert(
          `Bulk inference complete!\n\n` +
          `✅ Successfully processed: ${successCount}/${totalPatches}\n` +
          `❌ Failed: ${errorCount}/${totalPatches}\n\n` +
          `📊 Results:\n` +
          `• Patches with detections: ${patchesWithAnnotations}/${totalPatches}\n` +
          `• Total annotations: ${totalAnnotationsAdded}\n` +
          `• Empty patches: ${totalPatches - patchesWithAnnotations}`
        );

      } catch (err: any) {
        console.error('Bulk inference error:', err);
        alert(`Bulk inference failed: ${err.message}`);
      } finally {
        setIsBulkInferenceRunning(false);

        // Reload current patch annotations
        const loadAnnotations = async () => {
          try {
            const currentPatchId = `${itemId}-patch-${gridIndex}`;
            const response = await fetch(`/api/annotations?patchId=${encodeURIComponent(currentPatchId)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.annotations && Array.isArray(data.annotations)) {
                const manual = data.annotations.filter((ann: UIAnnotation) => ann.isSaved);
                const model = data.annotations.filter((ann: UIAnnotation) => !ann.isSaved);
                setManualAnnotations(manual);
                setModelAnnotations(model);
              }
            }
          } catch (error) {
            console.error('Failed to reload annotations:', error);
          }
        };
        loadAnnotations();
      }
    })();
  };

  const move = (direction: 'up' | 'down' | 'left' | 'right') => {
    const row = Math.floor(gridIndex / gridCols);
    const col = gridIndex % gridCols;
    switch (direction) {
      case 'up': if (row > 0) setGridIndex(gridIndex - gridCols); break;
      case 'down': if (row < gridRows - 1) setGridIndex(gridIndex + gridCols); break;
      case 'left': if (col > 0) setGridIndex(gridIndex - 1); break;
      case 'right': if (col < gridCols - 1) setGridIndex(gridIndex + 1); break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move('up');
      if (e.key === 'ArrowDown') move('down');
      if (e.key === 'ArrowLeft') move('left');
      if (e.key === 'ArrowRight') move('right');
      if (e.key === 'Escape') setSelectedAnnotationId(null); // Clear selection with Escape
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridIndex]);

  const handleJumpToLocation = (lon: number, lat: number) => {
    if (!tiffInfo?.bounds || !tiffInfo?.width || !tiffInfo?.height) return;
    const [minLon, minLat, maxLon, maxLat] = tiffInfo.bounds;

    // Convert geographic coords to pixel coords
    const px = ((lon - minLon) / (maxLon - minLon)) * tiffInfo.width;
    const py = ((maxLat - lat) / (maxLat - minLat)) * tiffInfo.height;

    // Calculate which patch this pixel falls into
    const col = Math.floor(px / TARGET_PATCH_SIZE);
    const row = Math.floor(py / TARGET_PATCH_SIZE);

    // Clamp to valid range and set grid index
    const clampedCol = Math.max(0, Math.min(gridCols - 1, col));
    const clampedRow = Math.max(0, Math.min(gridRows - 1, row));
    setGridIndex(clampedRow * gridCols + clampedCol);
  };

  if (isLoading) return <LoadingScreen />;
  if (error || !tiffInfo) return <ErrorScreen error={error} onBack={onBack} />;

  console.log('📊 Render state:', {
    patchId,
    manualCount: manualAnnotations.length,
    modelCount: modelAnnotations.length,
    allCount: allAnnotations.length,
    sample: allAnnotations.slice(0, 3).map(a => ({id: a.id, isSaved: a.isSaved, label: a.displayLabel}))
  });

  return (
    <div className="h-full px-2 flex flex-col border rounded-lg bg-white shadow-sm overflow-hidden relative">

      {/* FLOATING BULK INFERENCE PROGRESS WIDGET */}
      {isBulkInferenceRunning && showBulkProgress && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border-2 border-emerald-500 rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Loader2 size={16} className="animate-spin" />
              <span className="font-bold text-sm">Bulk Inference Running</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowBulkProgress(false)}
                className="p-1 hover:bg-emerald-700 rounded text-white transition-colors"
                title="Minimize"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => {
                  if (confirm('Cancel bulk inference?')) {
                    bulkInferenceAbortRef.current = true;
                  }
                }}
                className="p-1 hover:bg-emerald-700 rounded text-white transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">Progress</span>
              <span className="font-mono font-bold text-emerald-700">
                {bulkInferenceProgress.current}/{bulkInferenceProgress.total}
              </span>
            </div>

            <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-300"
                style={{
                  width: `${(bulkInferenceProgress.current / bulkInferenceProgress.total) * 100}%`
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-emerald-600 font-medium">
                ✅ Success: {bulkInferenceProgress.success}
              </div>
              <div className="text-red-600 font-medium">
                ❌ Failed: {bulkInferenceProgress.failed}
              </div>
              <div className="col-span-2 text-blue-600 font-bold text-center bg-blue-50 rounded py-1">
                📊 Annotations: {bulkInferenceProgress.annotationsFound}
              </div>
            </div>

            <p className="text-xs text-zinc-400 italic text-center">
              You can continue working while this runs
            </p>
          </div>
        </div>
      )}

      {/* MINIMIZED PROGRESS INDICATOR */}
      {isBulkInferenceRunning && !showBulkProgress && (
        <button
          onClick={() => setShowBulkProgress(true)}
          className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all"
        >
          <Loader2 size={16} className="animate-spin" />
          <span className="font-bold text-sm">
            {bulkInferenceProgress.current}/{bulkInferenceProgress.total}
          </span>
        </button>
      )}

      <header className="h-14 shrink-0 border-b flex items-center justify-between px-4 bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">
              {projectName || `Project ${projectId}`}
            </span>
            <span className="text-sm font-semibold text-zinc-900 leading-none">
              {datasetName || `Dataset ${datasetId}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-100 px-4 py-1.5 rounded-md">
          <Hash size={14} className="text-zinc-500" />
          <span className="text-xs font-mono font-bold text-zinc-900">PATCH {String(gridIndex + 1).padStart(3, '0')}</span>
          <div className="w-px h-3 bg-zinc-300 mx-1" />
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">{gridCols}x{gridRows} Review Grid</span>
        </div>

        {/* <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"><Settings2 size={18} /></button>
            <button className="bg-zinc-900 text-white text-xs px-4 py-2 rounded-md font-medium hover:bg-zinc-800 transition-colors">Complete Review</button>
        </div> */}
      </header>

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 bg-zinc-50 relative flex items-center justify-center overflow-hidden">
          {currentPatchBounds && (
               <PatchView
                 tiffUrl={tiffUrl}
                 bbox={currentPatchBounds}
                 canvasRef={canvasRef}
                 annotations={allAnnotations}
                 labels={labels}
                 selectedAnnotationId={selectedAnnotationId}
                 onAnnotationSelect={handleAnnotationSelect}
                 onAnnotationDelete={handleAnnotationDelete}
                 onAnnotationApprove={handleAnnotationApprove}
                 onAnnotationCreate={handleAnnotationCreate}
                 drawingMode={drawingMode}
                 promptBboxes={promptBboxes}
                 onPromptBboxCreate={handlePromptBboxCreate}
               />
          )}
        </main>

        <aside className="w-56 shrink-0 border-l border-r bg-zinc-50/50 flex flex-col">
          <div className="flex-1 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]"><Layout size={12} /> Drawing Tools</div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Mode</label>

              <div className="grid grid-cols-2 gap-2">
                {/* Select Mode */}
                <button
                  onClick={() => setDrawingMode('select')}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                    ${drawingMode === 'select'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    }
                  `}
                >
                  <MousePointer2 size={18} />
                  <span className="text-[10px] font-bold">Select</span>
                </button>

                {/* Bbox Mode */}
                <button
                  onClick={() => setDrawingMode('bbox')}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                    ${drawingMode === 'bbox'
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    }
                  `}
                >
                  <Square size={18} />
                  <span className="text-[10px] font-bold">Box</span>
                </button>

              </div>

              {/* Mode hint */}
              <div className="mt-2 p-2 bg-zinc-100 rounded-md">
                <p className="text-[9px] text-zinc-600 leading-relaxed">
                  {drawingMode === 'select' && '👆 Click to select annotations'}
                  {drawingMode === 'point' && '📍 Click to place a point'}
                  {drawingMode === 'bbox' && '⬜ Click and drag to draw a box'}
                  {drawingMode === 'polygon' && '🔺 Click points to draw a polygon'}
                  {drawingMode === 'prompt-bbox' && '🎯 Draw bbox prompt for SAM3'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-zinc-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest"><MapIcon size={12} /> Navigation</div>
                <div className="bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                <p className="text-[9px] text-zinc-500 font-bold tabular-nums">{gridIndex + 1} / {totalPatches}</p>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className="grid grid-cols-3 gap-1 mb-6">
                  {/* Row 1: Up button */}
                  <div></div>
                  <button onClick={() => move('up')} disabled={Math.floor(gridIndex / gridCols) === 0} className="p-2 bg-zinc-50 border border-zinc-200 hover:bg-amber-100 rounded text-amber-900 transition-all disabled:opacity-20 active:scale-95"><ChevronUp size={20} /></button>
                  <div></div>

                  {/* Row 2: Left, Down, Right */}
                  <button onClick={() => move('left')} disabled={gridIndex % gridCols === 0} className="p-2 bg-zinc-50 border border-zinc-200 hover:bg-amber-100 rounded text-amber-900 transition-all disabled:opacity-20 active:scale-95"><ChevronLeft size={20} /></button>
                  <button onClick={() => move('down')} disabled={Math.floor(gridIndex / gridCols) >= gridRows - 1} className="p-2 bg-zinc-50 border border-zinc-200 hover:bg-amber-100 rounded text-amber-900 transition-all disabled:opacity-20 active:scale-95"><ChevronDown size={20} /></button>
                  <button onClick={() => move('right')} disabled={gridIndex % gridCols >= gridCols - 1} className="p-2 bg-zinc-50 border border-zinc-200 hover:bg-amber-100 rounded text-amber-900 transition-all disabled:opacity-20 active:scale-95"><ChevronRight size={20} /></button>
                </div>

                <div className="w-full aspect-square max-w-[200px] rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shadow-inner relative">
                {currentPatchBounds && (
                    <MiniMap tiffUrl={tiffUrl} fullBounds={tiffInfo.bounds as [number, number, number, number]} patchBounds={currentPatchBounds} onJump={handleJumpToLocation} />
                )}
                </div>
                <p className="mt-3 text-[10px] text-zinc-400 font-medium italic">Use arrow keys to navigate</p>
            </div>
          </div>
        </aside>

        <PatchInspectorSidebar
            currentBbox={currentPatchBounds}
            gridIndex={gridIndex}
            canvasRef={canvasRef}
            onPredictions={handleNewPredictions}
            annotations={allAnnotations}
            selectedAnnotationId={selectedAnnotationId}
            onAnnotationSelect={handleAnnotationSelect}
            onAnnotationDelete={handleAnnotationDelete}
            onAnnotationApprove={handleAnnotationApprove}
            onAnnotationLabelChange={handleAnnotationLabelChange}
            onBulkApprove={handleBulkApprove}
            onBulkAssignLabel={handleBulkAssignLabel}
            onBulkInference={handleBulkInference}
            isBulkInferenceRunning={isBulkInferenceRunning}
            bulkInferenceProgress={bulkInferenceProgress}
            projectId={projectId}
            promptBboxes={promptBboxes}
            onPromptBboxDelete={handlePromptBboxDelete}
            onPromptBboxesClear={handlePromptBboxesClear}
            onEnablePromptBboxDrawing={handleEnablePromptBboxDrawing}
            isPromptBboxDrawingEnabled={drawingMode === 'prompt-bbox'}
            onLoadPromptBboxes={handleLoadPromptBboxes}
        />
      </div>
    </div>
  );
}