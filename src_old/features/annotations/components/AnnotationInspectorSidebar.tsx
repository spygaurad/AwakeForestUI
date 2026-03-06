'use client';

import clsx from 'clsx';
import { Trash2, CheckCircle, XCircle, Play, Settings } from 'lucide-react';
import { useState } from 'react';
import { PredictionStatus } from '@/features/predictions/types';

import type {
  UIAnnotation as UIAnnotationType,
  AnnotationClass as AnnotationClassType,
} from '@/features/annotations/types';
import type { Prediction } from '@/features/predictions/types';
import type { MLModel } from '@/features/ml-models/types';
import type {DatasetId, DatasetItemId, ProjectId} from '@/types';
import type { HeatmapType } from '@/features/annotations/types';

export interface AnnotationInspectorSidebarProps {
  annotations: UIAnnotationType[];
  predictions?: Prediction[];
  annotationClasses: AnnotationClassType[];
  availableModels?: MLModel[];
  projectId: ProjectId;
  selectedAnnotationId: string | null;
  selectedPredictionId?: string | null;
  isInferenceRunning?: boolean;
  fileStats?: {
    totalPatches: number;
    patchesWithData: number;
    totalAnnotations: number;
    approvedCount: number;
    pendingCount: number;
    byLabel: Record<string, number>;
  };
  onSelectAnnotation: (id: string | null) => void;
  onSelectPrediction?: (id: string | null) => void;
  onUpdateClass: (id: string, classId: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddClass: (name: string, color: string) => void;
  onAcceptPrediction?: (id: string) => void;
  onRejectPrediction?: (id: string) => void;
  onRunInference?: (params: {
    modelId: string;
    projectId: ProjectId;
    confThreshold: number;
    iouThreshold: number;
    tileSize: number;
    stride: number;
  }) => void;
  // Heatmap controls
  heatmapMode?: boolean;
  heatmapType?: HeatmapType;
  heatmapConfidenceThreshold?: number;
  onHeatmapModeChange?: (enabled: boolean) => void;
  onHeatmapTypeChange?: (type: HeatmapType) => void;
  onHeatmapConfidenceThresholdChange?: (threshold: number) => void;
}

export default function AnnotationInspectorSidebar({
  annotations,
  predictions = [],
  annotationClasses,
  availableModels = [],
  selectedAnnotationId,
  selectedPredictionId,
  projectId,
  isInferenceRunning = false,
  fileStats,
  onSelectAnnotation,
  onSelectPrediction,
  onUpdateClass,
  onDeleteAnnotation,
  onAddClass,
  onAcceptPrediction,
  onRejectPrediction,
  onRunInference,
  heatmapMode = false,
  heatmapType = 'density',
  heatmapConfidenceThreshold = 0,
  onHeatmapModeChange,
  onHeatmapTypeChange,
  onHeatmapConfidenceThresholdChange,
}: AnnotationInspectorSidebarProps) {
  const [mainTab, setMainTab] = useState<'visualization' | 'annotations'>('annotations');
  const [subTab, setSubTab] = useState<'annotations' | 'predictions'>('annotations');
  const [minConfidence, setMinConfidence] = useState(0.5);

  // Inference configuration state
  const [showInferenceConfig, setShowInferenceConfig] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [iouThreshold, setIouThreshold] = useState(0.7);
  const [tileSize, setTileSize] = useState(800);
  const [stride, setStride] = useState(400);

  // Filter predictions by confidence and pending status
  const filteredPredictions = predictions.filter(p => 
    p.confidence_score >= minConfidence && p.status === PredictionStatus.Pending
  );

  const handleRunInference = () => {
    if (!selectedModelId) {
      alert('Please select a model');
      return;
    }

    onRunInference?.({
      modelId: selectedModelId,
      projectId: projectId,
      confThreshold,
      iouThreshold,
      tileSize,
      stride,
    });

    setShowInferenceConfig(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Main Tab Switcher */}
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setMainTab('visualization')}
          className={clsx(
            'flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            mainTab === 'visualization'
              ? 'border-blue-500 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Visualization
        </button>
        <button
          onClick={() => setMainTab('annotations')}
          className={clsx(
            'flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
            mainTab === 'annotations'
              ? 'border-blue-500 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Annotations
        </button>
      </div>

      {/* Visualization Tab Content */}
      {mainTab === 'visualization' && (
        <div className="flex-1 overflow-y-auto">
          {/* Display Mode Section */}
          <div className="p-4 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
              Display Mode
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => onHeatmapModeChange?.(false)}
                className={clsx(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                  !heatmapMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Normal
              </button>
              <button
                onClick={() => onHeatmapModeChange?.(true)}
                className={clsx(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                  heatmapMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Heatmap
              </button>
            </div>
          </div>

          {/* Heatmap Options (only shown when heatmap mode is active) */}
          {heatmapMode && (
            <div className="p-4 border-b space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Heatmap Type</label>
                <select
                  value={heatmapType}
                  onChange={(e) => onHeatmapTypeChange?.(e.target.value as HeatmapType)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
                >
                  <option value="density">Status (Approved / Pending)</option>
                  <option value="confidence">Confidence Scores</option>
                </select>
              </div>

              {/* Confidence Threshold Slider - only for confidence mode */}
              {heatmapType === 'confidence' && (
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                    <span>Min Confidence Threshold</span>
                    <span className="font-mono text-blue-600">{(heatmapConfidenceThreshold * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={heatmapConfidenceThreshold}
                    onChange={(e) => onHeatmapConfidenceThresholdChange?.(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Annotations below this threshold will be hidden from the heatmap
                  </p>
                </div>
              )}

              {/* Heatmap Legend */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-bold text-gray-700 mb-2">
                  {heatmapType === 'confidence' ? 'Confidence Scale' : 'Annotation Status'}
                </div>

                {heatmapType === 'confidence' ? (
                  <>
                    {/* Confidence gradient legend */}
                    <div className="flex items-center gap-1">
                      <div
                        className="flex-1 h-4 rounded"
                        style={{
                          background: 'linear-gradient(to right, blue 0%, lime 40%, yellow 70%, red 100%)'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1.5 font-medium">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500">
                      Higher confidence = warmer colors (red)
                    </div>
                  </>
                ) : (
                  <>
                    {/* Annotation Status legend */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0b327aff' }} />
                        <span className="text-xs text-gray-700 font-medium">Approved</span>
                        <span className="text-[10px] text-gray-500 ml-auto">Verified annotations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                        <span className="text-xs text-gray-700 font-medium">Pending</span>
                        <span className="text-[10px] text-gray-500 ml-auto">Awaiting review</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="text-[10px] text-gray-500">
                        Shows annotation approval status across the image
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Stats Summary in Visualization Tab */}
          {fileStats && (
            <div className="p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
                Annotation Summary
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-[10px] text-blue-600 uppercase font-semibold">Total</div>
                  <div className="text-xl font-bold text-blue-700">{fileStats.totalAnnotations}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <div className="text-[10px] text-emerald-600 uppercase font-semibold">Approved</div>
                  <div className="text-xl font-bold text-emerald-700">{fileStats.approvedCount}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="text-[10px] text-amber-600 uppercase font-semibold">Pending</div>
                  <div className="text-xl font-bold text-amber-700">{fileStats.pendingCount}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-[10px] text-gray-600 uppercase font-semibold">Patches</div>
                  <div className="text-lg font-bold text-gray-700">
                    {fileStats.patchesWithData}/{fileStats.totalPatches}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Annotations Tab Content */}
      {mainTab === 'annotations' && (
        <>
          {/* Sub-Tab Switcher */}
          <div className="flex border-b">
            <button
              onClick={() => setSubTab('annotations')}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                subTab === 'annotations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Annotations ({annotations.length})
            </button>
            <button
              onClick={() => setSubTab('predictions')}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                subTab === 'predictions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Predictions ({filteredPredictions.length})
            </button>
          </div>

          {/* Annotations Sub-Tab */}
          {subTab === 'annotations' && (
        <>
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm text-gray-700">All Annotations</h2>
            <p className="text-xs text-gray-500 mt-0.5">From file storage • Click refresh to update</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {annotations.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <div>No annotations found</div>
                <div className="text-xs mt-2">Run bulk inference to generate predictions</div>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr className="text-left text-gray-600">
                    <th className="py-2 px-2 font-semibold w-6">•</th>
                    <th className="py-2 px-2 font-semibold">Label</th>
                    <th className="py-2 px-2 font-semibold">Type</th>
                    <th className="py-2 px-2 font-semibold">Conf</th>
                    <th className="py-2 px-2 font-semibold">Model</th>
                    <th className="py-2 px-2 font-semibold text-center w-12">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {annotations.map((ann) => {
                    const isSelected = ann.id === selectedAnnotationId;
                    const classObj = annotationClasses.find((c) => c.id === ann.classLabel || c.id === ann.labelId);
                    const color = classObj?.color || (ann.properties?.color as string) || '#D1D5DB';
                    const isApproved = ann.isSaved;
                    const confidence = ann.properties?.confidence as number | undefined;
                    const modelSource = ann.properties?.model_source as string | undefined;

                    // Determine annotation type based on model output
                    const getAnnotationType = () => {
                      // Check if it has segmentation mask
                      if (ann.segmentationRLE || modelSource?.includes('segment')) {
                        return 'Segmentation';
                      }
                      // Check if it's from a detection model
                      if (modelSource?.includes('predict') || modelSource?.includes('yolo')) {
                        return 'Detection';
                      }
                      // If it has confidence, it's from a model
                      if (confidence !== undefined) {
                        return ann.annotationType === 'polygon' ? 'Segmentation' : 'Detection';
                      }
                      // Otherwise it's manual
                      return 'Manual';
                    };

                    const annotationType = getAnnotationType();

                    return (
                      <tr
                        key={ann.id}
                        onClick={() => onSelectAnnotation(ann.id)}
                        className={clsx(
                          'border-b cursor-pointer group transition-colors',
                          isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        )}
                      >
                        {/* Status Dot */}
                        <td className="py-2 px-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isApproved ? '#0b327aff' : '#f59e0b' }}
                            title={isApproved ? 'Approved' : 'Pending'}
                          />
                        </td>

                        {/* Label */}
                        <td className="py-2 px-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 truncate max-w-[120px]">
                              {ann.displayLabel}
                            </span>
                            {!isApproved && (
                              <span className="text-[9px] text-amber-600 uppercase font-semibold">
                                pending
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-2 px-2">
                          <span className={clsx(
                            "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase",
                            annotationType === 'Segmentation' && "bg-purple-100 text-purple-700",
                            annotationType === 'Detection' && "bg-blue-100 text-blue-700",
                            annotationType === 'Manual' && "bg-gray-100 text-gray-600"
                          )}>
                            {annotationType}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="py-2 px-2">
                          {confidence !== undefined ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-mono text-gray-700">
                                {(confidence * 100).toFixed(0)}%
                              </span>
                              <div className="w-full h-1 bg-gray-200 rounded overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: `${confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Model */}
                        <td className="py-2 px-2">
                          {modelSource ? (
                            <span className="text-[9px] font-mono text-blue-600 truncate max-w-[80px] block">
                              {modelSource.split('/').pop()}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[9px]">manual</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteAnnotation(ann.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1 rounded transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Predictions Tab */}
      {subTab === 'predictions' && (
        <>
          {/* Inference Configuration Panel */}
          {showInferenceConfig ? (
            <div className="p-3 border-b space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Run Inference</h3>
                <button
                  onClick={() => setShowInferenceConfig(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ML Model</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1.5"
                >
                  <option value="">Select a model...</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.display_name} v{model.version}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence Threshold */}
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                  <span>Confidence Threshold</span>
                  <span className="font-mono">{confThreshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* IOU Threshold */}
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                  <span>IOU Threshold</span>
                  <span className="font-mono">{iouThreshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Advanced Settings */}
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Advanced Settings
                </summary>
                <div className="mt-2 space-y-2 pl-4">
                  {/* Tile Size */}
                  <div>
                    <label className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Tile Size</span>
                      <span className="font-mono">{tileSize}px</span>
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="2048"
                      step="256"
                      value={tileSize}
                      onChange={(e) => setTileSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Stride */}
                  <div>
                    <label className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Stride</span>
                      <span className="font-mono">{stride}px</span>
                    </label>
                    <input
                      type="range"
                      min="128"
                      max="1024"
                      step="128"
                      value={stride}
                      onChange={(e) => setStride(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </details>

              {/* Run Button */}
              <button
                onClick={handleRunInference}
                disabled={!selectedModelId || isInferenceRunning}
                className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isInferenceRunning ? 'Running...' : 'Run Inference'}
              </button>
            </div>
          ) : (
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">ML Predictions</h2>
                <button
                  onClick={() => setShowInferenceConfig(true)}
                  disabled={isInferenceRunning}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Run Inference
                </button>
              </div>

              {/* Confidence filter for predictions */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Min Confidence:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-10">{(minConfidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Predictions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredPredictions.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                {isInferenceRunning ? (
                  <>
                    <div className="animate-pulse">Processing...</div>
                    <div className="text-xs mt-2">Predictions will appear here</div>
                  </>
                ) : (
                  <>
                    No predictions found.
                    <br />
                    Click "Run Inference" to generate predictions.
                  </>
                )}
              </div>
            ) : (
              filteredPredictions.map((pred) => {
                const isSelected = pred.id === selectedPredictionId;
                const classObj = annotationClasses.find((c) => c.name === pred.class_label);
                const color = classObj?.color || '#3b82f6';
                const confidencePercent = (pred.confidence_score * 100).toFixed(1);

                return (
                  <div
                    key={pred.id}
                    onClick={() => onSelectPrediction?.(pred.id)}
                    className={clsx(
                      'p-2 rounded border cursor-pointer group',
                      'border-l-[6px]',
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    )}
                    style={{ borderLeftColor: color }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col overflow-hidden flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{pred.class_label}</span>
                          <span className="text-xs font-mono text-gray-500">{confidencePercent}%</span>
                        </div>

                        {/* Confidence bar */}
                        <div className="mt-1 h-1 bg-gray-200 rounded overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${confidencePercent}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcceptPrediction?.(pred.id);
                        }}
                        className="flex-1 text-xs py-1 px-2 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Accept
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectPrediction?.(pred.id);
                        }}
                        className="flex-1 text-xs py-1 px-2 rounded bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

          {/* Add Class - Inside Annotations Tab */}
          <div className="border-t p-3 mt-auto">
            <button
              onClick={() => {
                const name = prompt('Class Name?');
                const color = prompt('Color hex? (#ff0000)') || '#000000';
                if (name) onAddClass(name, color);
              }}
              className="w-full text-xs py-1.5 border rounded bg-gray-50 hover:bg-gray-100"
            >
              + Add Class
            </button>
          </div>
        </>
      )}
    </div>
  );
}
