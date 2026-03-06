// features/annotations/components/OverlayControls.tsx

'use client';

import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import type { OverlayConfig } from '@/features/annotations';

interface OverlayControlsProps {
  overlays: OverlayConfig[];
  onToggleOverlay: (overlayId: string) => void;
  onOpacityChange: (overlayId: string, opacity: number) => void;
}

export default function OverlayControls({
  overlays,
  onToggleOverlay,
  onOpacityChange,
}: OverlayControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      {/* Compact Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <Eye className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium">
          Overlays ({overlays.filter(o => o.enabled).length})
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute top-12 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-64 overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Layer Controls</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {overlays.map((overlay) => (
              <div
                key={overlay.id}
                className="px-3 py-2 border-b border-gray-100 hover:bg-gray-50"
              >
                {/* Toggle Row */}
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overlay.enabled}
                      onChange={() => onToggleOverlay(overlay.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {overlay.label}
                    </span>
                  </label>
                  
                  {overlay.enabled ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                {/* Opacity Slider (only when enabled) */}
                {overlay.enabled && (
                  <div className="pl-6">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 min-w-[50px]">
                        Opacity:
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={overlay.opacity ?? 1}
                        onChange={(e) =>
                          onOpacityChange(overlay.id, parseFloat(e.target.value))
                        }
                        className="flex-1 h-1"
                      />
                      <span className="text-xs font-mono text-gray-600 min-w-[35px]">
                        {((overlay.opacity ?? 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 bg-gray-50 border-t flex gap-2">
            <button
              onClick={() => overlays.forEach(o => o.enabled && onToggleOverlay(o.id))}
              className="flex-1 text-xs py-1 px-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Hide All
            </button>
            <button
              onClick={() => overlays.forEach(o => !o.enabled && onToggleOverlay(o.id))}
              className="flex-1 text-xs py-1 px-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
            >
              Show All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
