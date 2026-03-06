'use client';

import { FileText, CheckCircle, Clock, Layers, Tag } from 'lucide-react';

interface AnnotationStatsPanelProps {
  stats: {
    totalPatches: number;
    patchesWithData: number;
    totalAnnotations: number;
    approvedCount: number;
    pendingCount: number;
    byLabel: Record<string, number>;
  };
}

export default function AnnotationStatsPanel({ stats }: AnnotationStatsPanelProps) {
  const topLabels = Object.entries(stats.byLabel)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-zinc-200 p-4 z-10 min-w-[280px]">
      <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-700 mb-3 flex items-center gap-2">
        <FileText size={14} />
        Annotation Statistics
      </h3>

      <div className="space-y-3">
        {/* Total Annotations */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-600">
            <Layers size={14} />
            <span className="text-xs font-medium">Total Annotations</span>
          </div>
          <span className="text-sm font-bold text-blue-600">{stats.totalAnnotations}</span>
        </div>

        {/* Approved */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-600">
            <CheckCircle size={14} />
            <span className="text-xs font-medium">Approved</span>
          </div>
          <span className="text-sm font-bold text-emerald-600">{stats.approvedCount}</span>
        </div>

        {/* Pending */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-600">
            <Clock size={14} />
            <span className="text-xs font-medium">Pending Review</span>
          </div>
          <span className="text-sm font-bold text-amber-600">{stats.pendingCount}</span>
        </div>

        {/* Patches */}
        <div className="pt-2 border-t border-zinc-200">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Patches with data</span>
            <span className="font-mono">{stats.patchesWithData}/{stats.totalPatches}</span>
          </div>
        </div>

        {/* Top Labels */}
        {topLabels.length > 0 && (
          <div className="pt-2 border-t border-zinc-200">
            <div className="flex items-center gap-1.5 text-zinc-600 mb-2">
              <Tag size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Top Labels</span>
            </div>
            <div className="space-y-1.5">
              {topLabels.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 truncate max-w-[180px]" title={label}>
                    {label}
                  </span>
                  <span className="text-zinc-800 font-semibold tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Progress */}
        {stats.totalAnnotations > 0 && (
          <div className="pt-2 border-t border-zinc-200">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>Approval Progress</span>
              <span className="font-mono">
                {Math.round((stats.approvedCount / stats.totalAnnotations) * 100)}%
              </span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-300"
                style={{
                  width: `${(stats.approvedCount / stats.totalAnnotations) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
