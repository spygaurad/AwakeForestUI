'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

export interface Detection {
  class_name: string;
  confidence: number;   // 0..1
  width: number;
  height: number;
  item_name: string;
  // (Optional fields allowed)
  [key: string]: any;
}

export interface DetectionsListHandle {
  /** Smoothly scroll the list to bring item `index` into view (and apply a brief highlight). */
  scrollTo: (index: number) => void;
}

interface DetectionsListProps {
  detections: Detection[];
  /** Currently selected index (to highlight). */
  selectedIndex: number | null;
  /** Called when a user clicks an item in the list. */
  onSelect: (index: number) => void;
  /** Optional fixed height (Tailwind class). Default: "max-h-72" */
  heightClassName?: string;
  /** Optional container className override. */
  className?: string;
  /** Show per-list summary chips (mean & std). Set false to hide chips. Default: true */
  showSummary?: boolean;
}

const DetectionsList = forwardRef<DetectionsListHandle, DetectionsListProps>(
  (
    {
      detections,
      selectedIndex,
      onSelect,
      heightClassName = 'max-h-72',
      className = '',
      showSummary = true,
    },
    ref
  ) => {
    // Keep refs for each row to enable scroll-to-item
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Expose imperative scrollTo(index)
    useImperativeHandle(ref, () => ({
      scrollTo: (index: number) => {
        const el = itemRefs.current[index];
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // brief focus flash
        el.classList.add('ring-2', 'ring-primary-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 600);
      },
    }));

    // Summary stats (mean & std of confidence)
    const { meanConf, stdConf } = useMemo(() => {
      if (!detections.length) return { meanConf: 0, stdConf: 0 };
      const vals = detections.map((d) => d.confidence);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return { meanConf: mean, stdConf: Math.sqrt(variance) };
    }, [detections]);

    return (
      <div className={`space-y-3 ${className}`}>
        {showSummary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary-50 rounded-lg p-3 border border-primary-200 text-center">
              <p className="text-xl font-bold text-primary-700">{detections.length}</p>
              <p className="text-xs text-primary-600">Objects</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-xl font-bold text-gray-800">
                {(meanConf * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">Mean Conf.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-xl font-bold text-gray-800">
                {(stdConf * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">Std. Dev.</p>
            </div>
          </div>
        )}

        {/* Scrollable list */}
        <div className={`${heightClassName} overflow-y-auto pr-1 space-y-2`}>
          {detections.map((det, idx) => {
            const isSel = selectedIndex === idx;
            return (
              <div
                key={idx}
                ref={(el) => (itemRefs.current[idx] = el)}
                onClick={() => onSelect(idx)}
                className={`flex items-center justify-between bg-white border rounded-lg p-2 text-xs cursor-pointer transition 
                  ${isSel ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSel ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    B{idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">
                      {det.item_name || det.class_name}
                    </span>
                    <span className="text-gray-500 capitalize">{det.class_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-900">
                    {(det.confidence * 100).toFixed(1)}%
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    w×h: {det.width.toFixed(0)}×{det.height.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}

          {detections.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-6">
              No detections yet.
            </div>
          )}
        </div>
      </div>
    );
  }
);

DetectionsList.displayName = 'DetectionsList';
export default DetectionsList;
