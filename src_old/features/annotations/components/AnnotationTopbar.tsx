import { ArrowLeft, Save, Play, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface AnnotationTopbarProps {
  projectName: string;
  datasetName: string;
  fileName: string;
  stats: { 
    labeled: number; 
    total: number; 
    unsaved: number;
    predictions?: number; // NEW
  };
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  jobStatus?: { status: string; progress: number } | null; // NEW
  onBack: () => void;
  onSave: () => void;
  onRunInference?: () => void; // NEW
}

export default function AnnotationTopbar({
  projectName,
  datasetName,
  fileName,
  stats,
  hasUnsavedChanges,
  isSaving,
  jobStatus, // NEW
  onBack,
  onSave,
  onRunInference, // NEW
}: AnnotationTopbarProps) {
  const isJobRunning = jobStatus?.status === 'RUNNING';

  return (
    <div className="h-14 flex items-center justify-between border-b bg-white px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col">
          <h1 className="text-sm font-semibold">{projectName}</h1>
          <p className="text-xs text-gray-500">
            {datasetName} • {fileName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Stats */}
        <span className="text-xs text-gray-600">
          {stats.labeled} / {stats.total} labeled
        </span>

        {stats.predictions !== undefined && stats.predictions > 0 && (
          <span className="text-xs text-blue-600 font-medium">
            {stats.predictions} predictions
          </span>
        )}

        {hasUnsavedChanges && (
          <span className="text-xs text-orange-600 font-medium">
            {stats.unsaved} unsaved
          </span>
        )}

        {/* Job Status */}
        {isJobRunning && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing... {jobStatus.progress}%</span>
          </div>
        )}

        {/* Run Inference Button */}
        {onRunInference && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRunInference}
            disabled={isJobRunning}
          >
            <Play className="w-4 h-4 mr-2" />
            Run Inference
          </Button>
        )}

        {/* Save Button */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save All'}
        </Button>
      </div>
    </div>
  );
}
