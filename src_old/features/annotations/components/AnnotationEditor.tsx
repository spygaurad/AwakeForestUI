'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

import type {
  UIAnnotation as UIAnnotationType,
  AnnotationClass as AnnotationClassType,
  HeatmapType,
} from '@/features/annotations/types';
import type { Prediction } from '@/features/predictions/types';
import type { MLModel } from '@/features/ml-models/types';

import { useCreateAnnotation } from '@/features/annotations/hooks/use-create-annotation';
import { useFileAnnotations } from '@/features/annotations/hooks/use-file-annotations';
import {
  toAPIAnnotation,
  toUIAnnotation,
  getAnnotationStats,
} from '@/features/annotations';

import {
  useAnnotations,
  useAnnotationEditor,
  useAnnotationClasses,
  useTiffMetadata,
  useOverlayManager,
} from '@/features/annotations';

import {
  usePredictions,
  useRunInferenceItem,
  useUpdatePrediction,
} from '@/features/predictions';
import { useMLModels } from '@/features/ml-models';

import AnnotationTopbar from './AnnotationTopbar';
import AnnotationInspectorSidebar from './AnnotationInspectorSidebar';
import OverlayControls from './OverlayControls';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';
import { toAnnotationGeometry } from '@/features/annotations/utils/geometry-converter';

import type {DatasetId, DatasetItemId, ProjectId} from '@/types';

const AnnotationViewer = dynamic(() => import('./AnnotationViewer'), {
  ssr: false,
});

interface AnnotationEditorProps {
  projectId: ProjectId;
  datasetId: DatasetId;
  itemId: DatasetItemId;
  tiffUrl: string;
  projectName?: string;
  datasetName?: string;
  onBack: () => void;
}

export default function AnnotationEditor({
  projectId,
  datasetId,
  itemId,
  tiffUrl,
  projectName,
  datasetName,
  onBack,
}: AnnotationEditorProps) {
  // Load annotations from local file storage instead of database
  const {
    annotations: fileAnnotations,
    isLoading: fileAnnotationsLoading,
    error: fileAnnotationsError,
    stats: fileStats,
    refetch: refetchFileAnnotations
  } = useFileAnnotations({
    itemId,
    autoRefresh: false, // Disable auto-refresh to prevent constant reloading
    refreshInterval: 30000 // If enabled, would refresh every 30 seconds
  });

  const { data: tiffInfo, isLoading: tiffLoading, error: tiffError } = useTiffMetadata(tiffUrl);
  const { classes, addClass } = useAnnotationClasses();

  // Use file annotations directly (they're already in UIAnnotation format)
  const existingAnnotations = fileAnnotations;

  const editor = useAnnotationEditor(existingAnnotations);
  const createMutation = useCreateAnnotation();

  const {
    data: predictions = [],
    refetch: refetchPredictions,
  } = usePredictions({ dataset_item_id: itemId });

  const runInferenceItemMutation = useRunInferenceItem();
  const updatePredictionMutation = useUpdatePrediction();
  const { data: availableModels = [] } = useMLModels();

  const overlayManager = useOverlayManager();
  const [selectedPredictionId, setSelectedPredictionId] = useState<string | null>(null);

  // Heatmap visualization state
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('density');
  const [heatmapConfidenceThreshold, setHeatmapConfidenceThreshold] = useState(0);

  // Save handler
  const handleSaveAll = async () => {
    const unsaved = editor.getUnsavedAnnotations();
    if (unsaved.length === 0) {
      alert('No new annotations to save');
      return;
    }
    try {
      for (const ann of unsaved) {
        const classObj = classes.find((c) => c.id === ann.classLabel);
        const apiPayload = toAPIAnnotation(
          ann,
          datasetId,
          itemId,
          projectId
        );
        if (classObj?.color) {
          apiPayload.properties = {
            ...apiPayload.properties,
            color: classObj.color,
          };
        }
        const savedAnn = await createMutation.mutateAsync(apiPayload);
        editor.markAsSaved(ann.id, savedAnn.id);
      }
      alert(`Saved ${unsaved.length} annotation(s) successfully!`);
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Failed to save annotations: ' + err.message);
    }
  };

  // Inference handler (item-scoped)
  const handleRunInferenceOnItem = async (params: {
    modelId: string;
    projectId: ProjectId;
    confThreshold: number;
    iouThreshold: number;
    tileSize: number;
    stride: number;
  }) => {
    try {
      await runInferenceItemMutation.mutateAsync({
        dataset_item_id: itemId,
        project_id: params.projectId,
        ml_model_id: params.modelId,
        conf_threshold: params.confThreshold,
        iou_threshold: params.iouThreshold,
        tile_size: params.tileSize,
        stride: params.stride,
      });
      await refetchPredictions();

      if (!overlayManager.isOverlayEnabled('predictions')) {
        overlayManager.toggleOverlay('predictions');
      }
    } catch (error) {
      console.error('Inference error:', error);
      alert('Failed to run inference');
    }
  };

  // Prediction accept
  const handleAcceptPrediction = async (predictionId: string) => {
    const pred = predictions.find((p) => p.id === predictionId);
    if (!pred) return;
    try {
      const strictGeometry = toAnnotationGeometry(pred.geometry);
      editor.addAnnotation(strictGeometry, 'bbox');
      await updatePredictionMutation.mutateAsync({
        id: predictionId,
        status: 'ACCEPTED',
      });
      await refetchPredictions();
    } catch (error) {
      console.error('Accept prediction error:', error);
      alert('Failed to accept prediction');
    }
  };

  // Prediction reject
  const handleRejectPrediction = async (predictionId: string) => {
    try {
      await updatePredictionMutation.mutateAsync({
        id: predictionId,
        status: 'REJECTED',
      });
      await refetchPredictions();
    } catch (error) {
      console.error('Reject prediction error:', error);
      alert('Failed to reject prediction');
    }
  };

  const isLoading = fileAnnotationsLoading || tiffLoading;

  if (isLoading) return <LoadingScreen />;
  if (tiffError || !tiffInfo?.bounds)
    return <ErrorScreen error={tiffError} onBack={onBack} />;

  const stats = getAnnotationStats(editor.annotations);
  const hasUnsavedChanges = editor.annotations.some((ann) => !ann.isSaved && ann.classLabel);

  return (
    <div className="h-full px-2 flex flex-col border rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Error Banner */}
      {fileAnnotationsError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-sm font-medium">
              ⚠️ Failed to load file annotations: {fileAnnotationsError}
            </span>
          </div>
          <button
            onClick={() => refetchFileAnnotations()}
            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <AnnotationTopbar
        projectName={projectName || `Project ${projectId}`}
        datasetName={datasetName || `Dataset ${datasetId}`}
        fileName={tiffUrl.split('/').pop() || ''}
        stats={{ ...stats, predictions: predictions.length }}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={createMutation.isPending}
        onBack={onBack}
        onSave={handleSaveAll}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 min-h-0 bg-white relative">
          <AnnotationViewer
            tiffUrl={tiffUrl}
            bounds={tiffInfo.bounds}
            annotations={editor.annotations}
            predictions={predictions}
            annotationClasses={classes}
            activeGeometry={editor.activeGeometry}
            selectedAnnotationId={editor.selectedId}
            selectedPredictionId={selectedPredictionId}
            predictionOpacity={overlayManager.getOverlayOpacity('predictions')}
            heatmapMode={heatmapMode}
            heatmapType={heatmapType}
            heatmapOpacity={overlayManager.getOverlayOpacity('heatmap')}
            heatmapConfidenceThreshold={heatmapConfidenceThreshold}
            onAnnotationCreated={editor.addAnnotation}
            onAnnotationSelected={editor.setSelectedId}
            onPredictionSelected={setSelectedPredictionId}
            onGeometryChange={editor.setActiveGeometry}
          />

          <OverlayControls
            overlays={overlayManager.overlays}
            onToggleOverlay={(id: string) => overlayManager.toggleOverlay(id as any)}
            onOpacityChange={(id: string, opacity: number) =>
              overlayManager.setOverlayOpacity(id as any, opacity)
            }
          />
        </div>

        <aside className="w-96 shrink-0 border-l bg-white overflow-hidden flex flex-col">
          <AnnotationInspectorSidebar
            annotations={editor.annotations}
            predictions={predictions}
            annotationClasses={classes}
            projectId={projectId}
            availableModels={availableModels}
            selectedAnnotationId={editor.selectedId}
            selectedPredictionId={selectedPredictionId}
            isInferenceRunning={runInferenceItemMutation.isPending}
            fileStats={fileStats}
            heatmapMode={heatmapMode}
            heatmapType={heatmapType}
            heatmapConfidenceThreshold={heatmapConfidenceThreshold}
            onHeatmapModeChange={setHeatmapMode}
            onHeatmapTypeChange={setHeatmapType}
            onHeatmapConfidenceThresholdChange={setHeatmapConfidenceThreshold}
            onSelectAnnotation={editor.setSelectedId}
            onSelectPrediction={setSelectedPredictionId}
            onUpdateClass={editor.updateAnnotationClass}
            onDeleteAnnotation={editor.deleteAnnotation}
            onAddClass={addClass}
            onAcceptPrediction={handleAcceptPrediction}
            onRejectPrediction={handleRejectPrediction}
            onRunInference={handleRunInferenceOnItem}
          />
        </aside>
      </div>
    </div>
  );
}
