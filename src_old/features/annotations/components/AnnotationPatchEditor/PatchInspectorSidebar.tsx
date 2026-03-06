'use client';

import { useState, RefObject, useRef, useEffect } from 'react';
import {
  Settings2,
  Send,
  Loader2,
  Sparkles,
  Target,
  AlertCircle,
  Check,
  Trash2,
  Tag,
  Plus,
  X,
  CheckCheck,
  Layers,
  Crosshair,
  Square,
  Save,
  FolderOpen
} from 'lucide-react';
import { adaptPredictionToUIAnnotation } from '../../utils/adapters';
import { UIAnnotation } from '../../types';
import { useLabels } from '../../hooks/use-labels';
import { usePromptTemplates } from '../../hooks/use-prompt-templates';
import { useInferenceModels, InferenceModel } from '../../hooks/use-inference-models';

interface PatchInspectorSidebarProps {
  currentBbox: [number, number, number, number] | null;
  gridIndex: number;
  canvasRef: RefObject<HTMLCanvasElement>;
  onPredictions: (annotations: UIAnnotation[]) => void;
  annotations: UIAnnotation[];
  selectedAnnotationId: string | null;
  onAnnotationSelect: (annotationId: string | null) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onAnnotationApprove: (annotationId: string) => void;
  onAnnotationLabelChange: (annotationId: string, labelId: string) => void;
  onBulkApprove: (labelId: string) => void;
  onBulkAssignLabel: (labelId: string) => void;
  onBulkInference: (model: InferenceModel, prompt?: string) => void;
  isBulkInferenceRunning?: boolean;
  bulkInferenceProgress?: { current: number; total: number; success: number; failed: number; annotationsFound: number };
  projectId?: string;
  promptBboxes: [number, number, number, number][];
  onPromptBboxDelete: (index: number) => void;
  onPromptBboxesClear: () => void;
  onEnablePromptBboxDrawing: () => void;
  isPromptBboxDrawingEnabled: boolean;
  onLoadPromptBboxes: (bboxes: [number, number, number, number][]) => void;
}

// Re-export InferenceModel for consumers that need the type
export type { InferenceModel };

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 55%)`;
}

export default function PatchInspectorSidebar({
  currentBbox,
  gridIndex,
  canvasRef,
  onPredictions,
  annotations,
  selectedAnnotationId,
  onAnnotationSelect,
  onAnnotationDelete,
  onAnnotationApprove,
  onAnnotationLabelChange,
  onBulkApprove,
  onBulkAssignLabel,
  onBulkInference,
  isBulkInferenceRunning = false,
  projectId,
  promptBboxes,
  onPromptBboxDelete,
  onPromptBboxesClear,
  onEnablePromptBboxDrawing,
  isPromptBboxDrawingEnabled,
  onLoadPromptBboxes
}: PatchInspectorSidebarProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available inference models
  const { models: inferenceModels, isLoading: modelsLoading, standardModels, sam3Models, customModels } = useInferenceModels();

  // Get the currently selected model
  const selectedModel = inferenceModels.find(m => m.id === selectedModelId);

  // Set default model when models are loaded
  useEffect(() => {
    if (inferenceModels.length > 0 && !selectedModelId) {
      // Default to first standard model or first available model
      const defaultModel = standardModels[0] || inferenceModels[0];
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
      }
    }
  }, [inferenceModels, selectedModelId, standardModels]);

  const { labels, isLoading: labelsLoading, createLabel, getLabelById } = useLabels({ projectId });
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(generateRandomColor());

  const [showBulkOps, setShowBulkOps] = useState(false);
  const [bulkLabelId, setBulkLabelId] = useState('');

  // Prompt template management
  const { templates, isLoading: templatesLoading, createTemplate, deleteTemplate } = usePromptTemplates({ projectId });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const selectedItemRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (selectedAnnotationId && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedAnnotationId]);

  const runInference = async () => {
    const canvas = canvasRef.current;

    if (!canvas || !currentBbox) {
      setError("Canvas not ready");
      return;
    }

    if (!selectedModel) {
      setError("No model selected");
      return;
    }

    // For SAM3 bbox model, require at least one prompt bbox
    const promptType = selectedModel.config?.prompt_type as string | undefined;
    if (promptType === 'bbox' && promptBboxes.length === 0) {
      setError("Draw at least one bbox prompt on the canvas");
      return;
    }

    setIsLoading(true);
    setResults(null);
    setError(null);

    try {
      const imageBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95)
      );

      if (!imageBlob) throw new Error("Failed to capture image");

      const formData = new FormData();
      formData.append('file', imageBlob, `patch_${gridIndex}.jpg`);

      const baseUrl = selectedModel.endpoint_url;
      const endpointPath = selectedModel.endpoint_path;
      const params = new URLSearchParams();

      // Handle different prompt types based on model config
      if (promptType === 'text') {
        params.append('text_prompts', prompt);
      } else if (promptType === 'multimodal') {
        params.append('text_prompt', prompt);
        params.append('bboxes', JSON.stringify([[0, 0, canvas.width, canvas.height]]));
      } else if (promptType === 'bbox') {
        // Use user-drawn prompt bboxes instead of hardcoded bbox
        params.append('bboxes', JSON.stringify(promptBboxes));
      }

      const response = await fetch(`${baseUrl}${endpointPath}?${params.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Model error (${response.status})`);

      const data = await response.json();
      setResults(data);

      const uiAnnotations = adaptPredictionToUIAnnotation(
        data,
        endpointPath,
        currentBbox,
        canvas.width,
        canvas.height
      );

      onPredictions(uiAnnotations);

    } catch (err: any) {
      setError(err.message || "Inference failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    const label = await createLabel(newLabelName.trim(), newLabelColor);
    if (label) {
      setNewLabelName('');
      setNewLabelColor(generateRandomColor());
      setShowLabelForm(false);
    }
  };

  const handleApprove = (annotationId: string) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation?.labelId) {
      alert('Assign a label first');
      return;
    }
    onAnnotationApprove(annotationId);
  };

  const handleBulkAssignLabel = () => {
    if (!bulkLabelId) {
      alert('Select a label first');
      return;
    }
    onBulkAssignLabel(bulkLabelId);
    setShowBulkOps(false);
  };

  const handleBulkApprove = () => {
    if (!bulkLabelId) {
      alert('Select a label first');
      return;
    }
    onBulkApprove(bulkLabelId);
    setShowBulkOps(false);
  };

  const unlabeledCount = annotations.filter(a => !a.labelId && !a.isSaved).length;
  const labeledUnsavedCount = annotations.filter(a => a.labelId && !a.isSaved).length;

  // Handler for saving current bboxes as a template
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (promptBboxes.length === 0) {
      alert('Draw at least one bbox before saving');
      return;
    }

    const result = await createTemplate(newTemplateName.trim(), promptBboxes);
    if (result) {
      setNewTemplateName('');
      setShowSaveTemplate(false);
      setSelectedTemplateId(result.id);
    }
  };

  // Handler for loading a template
  const handleLoadTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        onLoadPromptBboxes(template.bboxes);
      }
    }
  };

  // Handler for deleting a template
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Delete this template?')) {
      await deleteTemplate(templateId);
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
    }
  };

  return (
    <aside className="w-96 shrink-0 border-l bg-white flex flex-col overflow-hidden shadow-xl">
      {/* FIXED HEADER */}
      <div className="px-4 py-2.5 border-b bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={14} className="text-zinc-500" />
          <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-700">Controls</h2>
        </div>
        <div className="text-[10px] font-mono text-zinc-400 bg-zinc-200/50 px-2 py-0.5 rounded">:8010</div>
      </div>

      {/* FIXED CONTROLS SECTION */}
      <div className="shrink-0 p-4 space-y-3 border-b bg-white">
        {/* LABELS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-purple-700">
              <Tag size={13} />
              <span className="text-xs font-bold uppercase">Labels</span>
            </div>
            <button
              onClick={() => setShowLabelForm(!showLabelForm)}
              className="p-1 hover:bg-purple-100 rounded text-purple-600 transition-colors"
              title={showLabelForm ? 'Cancel' : 'Add Label'}
            >
              {showLabelForm ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>

          {showLabelForm && (
            <div className="space-y-2 p-2 bg-purple-50 rounded border border-purple-200">
              <input
                type="text"
                placeholder="Label name (e.g., Building)"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full border border-purple-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-400"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-10 h-8 rounded border border-purple-300 cursor-pointer"
                />
                <button
                  onClick={handleCreateLabel}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 rounded font-medium transition-colors"
                >
                  Create Label
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {labelsLoading ? (
              <p className="text-xs text-zinc-400">Loading...</p>
            ) : labels.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No labels yet</p>
            ) : (
              labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded border border-purple-200"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-xs font-medium text-zinc-700">
                    {label.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BULK OPERATIONS */}
        {annotations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-blue-700">
                <Layers size={13} />
                <span className="text-xs font-bold uppercase">Bulk Actions</span>
              </div>
              <button
                onClick={() => setShowBulkOps(!showBulkOps)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {showBulkOps ? 'Hide' : 'Show'}
              </button>
            </div>

            {showBulkOps && (
              <div className="space-y-2 p-2 bg-blue-50 rounded border border-blue-200">
                <select
                  value={bulkLabelId}
                  onChange={(e) => setBulkLabelId(e.target.value)}
                  className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select label...</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleBulkAssignLabel}
                    disabled={!bulkLabelId || unlabeledCount === 0}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors"
                  >
                    <Tag size={12} />
                    Assign ({unlabeledCount})
                  </button>
                  <button
                    onClick={handleBulkApprove}
                    disabled={!bulkLabelId || labeledUnsavedCount === 0}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Approve ({labeledUnsavedCount})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODEL SELECTION */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700 uppercase">Model</label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            disabled={modelsLoading}
          >
            {modelsLoading ? (
              <option value="">Loading models...</option>
            ) : inferenceModels.length === 0 ? (
              <option value="">No models available</option>
            ) : (
              <>
                {standardModels.length > 0 && (
                  <optgroup label="Standard Models">
                    {standardModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {sam3Models.length > 0 && (
                  <optgroup label="SAM3 Experimental">
                    {sam3Models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {customModels.length > 0 && (
                  <optgroup label="Custom Models">
                    {customModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </>
            )}
          </select>
        </div>

        {/* PROMPT - Show for models that require text prompt */}
        {Boolean(selectedModel?.config?.requires_prompt) && (selectedModel?.config?.prompt_type as string) !== 'bbox' && (
          <div className="space-y-2 p-2 bg-blue-50 rounded border border-blue-200">
            <label className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1">
               <Sparkles size={11} /> Prompt
            </label>
            <input
              type="text"
              placeholder="e.g. 'building', 'tree canopy'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border border-blue-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* SAM3 BBOX PROMPTS - Show for models that require bbox prompt */}
        {(selectedModel?.config?.prompt_type as string) === 'bbox' && (
          <div className="space-y-2 p-2 bg-orange-50 rounded border border-orange-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-700 uppercase flex items-center gap-1">
                <Crosshair size={11} /> Bbox Prompts
              </label>
              <span className="text-[10px] font-mono text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">
                {promptBboxes.length}
              </span>
            </div>

            {/* Template Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-orange-600 flex items-center gap-1">
                <FolderOpen size={10} /> Load Template
              </label>
              <div className="flex gap-1">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleLoadTemplate(e.target.value)}
                  className="flex-1 text-xs border border-orange-300 rounded px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select a template...</option>
                  {templatesLoading ? (
                    <option disabled>Loading...</option>
                  ) : (
                    templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.bboxes.length} bbox{t.bboxes.length !== 1 ? 'es' : ''})
                      </option>
                    ))
                  )}
                </select>
                {selectedTemplateId && (
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplateId)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Draw/Clear/Save buttons */}
            <div className="flex gap-1">
              <button
                onClick={onEnablePromptBboxDrawing}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  isPromptBboxDrawingEnabled
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                <Square size={11} />
                {isPromptBboxDrawingEnabled ? 'Drawing...' : 'Draw'}
              </button>
              <button
                onClick={onPromptBboxesClear}
                disabled={promptBboxes.length === 0}
                className="px-2 py-1.5 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                disabled={promptBboxes.length === 0}
                className="px-2 py-1.5 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors flex items-center gap-1"
                title="Save as template"
              >
                <Save size={11} />
              </button>
            </div>

            {/* Save Template Form */}
            {showSaveTemplate && (
              <div className="space-y-1.5 p-2 bg-white rounded border border-orange-300">
                <label className="text-[10px] font-medium text-orange-700">Save as Template</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="e.g., palm_features"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="flex-1 text-xs border border-orange-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-orange-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                  />
                  <button
                    onClick={handleSaveTemplate}
                    className="px-2 py-1 rounded text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveTemplate(false);
                      setNewTemplateName('');
                    }}
                    className="p-1 text-orange-500 hover:text-orange-700 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* List of drawn bboxes */}
            {promptBboxes.length > 0 && (
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {promptBboxes.map((bbox, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-2 py-0.5 bg-white rounded border border-orange-200"
                  >
                    <span className="text-[9px] font-mono text-orange-700">
                      #{index + 1}: [{bbox[0]},{bbox[1]}]→[{bbox[2]},{bbox[3]}]
                    </span>
                    <button
                      onClick={() => onPromptBboxDelete(index)}
                      className="p-0.5 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hint */}
            <p className="text-[9px] text-orange-600 italic">
              {promptBboxes.length === 0
                ? 'Draw bboxes or load a template to guide SAM3'
                : `${promptBboxes.length} prompt${promptBboxes.length > 1 ? 's' : ''} ready`
              }
            </p>
          </div>
        )}

        {/* RUN BUTTONS */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={runInference}
            disabled={isLoading || !currentBbox || !selectedModel || isBulkInferenceRunning || ((selectedModel?.config?.prompt_type as string) === 'bbox' && promptBboxes.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white rounded py-2.5 flex items-center justify-center gap-1.5 font-semibold text-xs shadow-sm active:scale-[0.98] disabled:cursor-not-allowed transition-all"
            title={(selectedModel?.config?.prompt_type as string) === 'bbox' && promptBboxes.length === 0 ? 'Draw bbox prompts first' : ''}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <><Send size={12} /> Predict</>
            )}
          </button>
          <button
            onClick={() => selectedModel && onBulkInference(selectedModel, prompt)}
            disabled={isLoading || !selectedModel || isBulkInferenceRunning}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded py-2.5 flex items-center justify-center gap-1.5 font-semibold text-xs shadow-sm active:scale-[0.98] disabled:cursor-not-allowed transition-all"
          >
            {isBulkInferenceRunning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <><Layers size={12} /> All Patches</>
            )}
          </button>
        </div>

        {/* BULK INFERENCE STATUS */}
        {isBulkInferenceRunning && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
            <p className="text-xs text-emerald-700 text-center font-medium">
              Running in background...
            </p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-red-600">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* SCROLLABLE DETECTIONS TABLE */}
      <div className="flex-1 flex flex-col min-h-0">
        {annotations.length > 0 ? (
          <>
            {/* Table Header - Fixed */}
            <div className="shrink-0 px-4 py-2 bg-zinc-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Target size={14} />
                  <span className="text-xs font-bold uppercase">Detections</span>
                </div>
                <span className="text-xs font-mono text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded">
                  {annotations.length}
                </span>
              </div>
            </div>

            {/* Table Body - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr className="text-left text-zinc-600">
                    <th className="py-2 px-4 font-semibold w-8">•</th>
                    <th className="py-2 px-2 font-semibold">Name</th>
                    <th className="py-2 px-2 font-semibold">Label</th>
                    <th className="py-2 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {annotations.map((ann) => {
                    const isSelected = ann.id === selectedAnnotationId;
                    const label = ann.labelId ? getLabelById(ann.labelId) : null;
                    const hasLabel = !!label;

                    return (
                      <tr
                        key={ann.id}
                        ref={isSelected ? selectedItemRef : null}
                        onClick={() => onAnnotationSelect(ann.id)}
                        className={`
                          border-b cursor-pointer transition-colors
                          ${isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-zinc-50'
                          }
                        `}
                      >
                        {/* Status Indicator */}
                        <td className="py-2 px-4">
                          <div
                            className={`w-2 h-2 rounded-full
                              ${isSelected ? 'bg-blue-500' : ann.isSaved ? 'bg-emerald-500' : 'bg-amber-400'}
                            `}
                          />
                        </td>

                        {/* Name & Confidence */}
                        <td className="py-2 px-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-800 truncate max-w-[100px]">
                              {ann.displayLabel}
                            </span>
                            {ann.properties?.confidence != null && (
                              <span className="text-[10px] text-zinc-500">
                                {((ann.properties.confidence as number) * 100).toFixed(0)}% conf
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Label Selector */}
                        <td className="py-2 px-2">
                          <select
                            value={ann.labelId || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              onAnnotationLabelChange(ann.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`
                              w-full text-[11px] border rounded px-1.5 py-1 outline-none
                              ${hasLabel
                                ? 'border-purple-300 bg-purple-50 text-purple-900'
                                : 'border-red-300 bg-red-50 text-red-700'
                              }
                            `}
                          >
                            <option value="" disabled>
                              {hasLabel ? label.name : 'No label'}
                            </option>
                            {labels.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-4">
                          <div className="flex gap-1 justify-end">
                            {!ann.isSaved && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(ann.id);
                                }}
                                disabled={!hasLabel}
                                className={`
                                  p-1 rounded transition-colors
                                  ${hasLabel
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                  }
                                `}
                                title={hasLabel ? 'Approve' : 'Assign label first'}
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAnnotationDelete(ann.id);
                              }}
                              className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Stats */}
            <div className="shrink-0 px-4 py-2 bg-zinc-50 border-t">
              <p className="text-[10px] text-zinc-500 text-center">
                {unlabeledCount > 0 && <span className="text-red-600 font-medium">{unlabeledCount} unlabeled</span>}
                {unlabeledCount > 0 && labeledUnsavedCount > 0 && <span className="mx-1">•</span>}
                {labeledUnsavedCount > 0 && <span className="text-amber-600 font-medium">{labeledUnsavedCount} ready</span>}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {results ? (
              <div className="text-center py-8">
                <Target size={32} className="mx-auto mb-2 text-zinc-300" />
                <p className="text-sm text-zinc-400">No detections found</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">Run inference to see detections</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
