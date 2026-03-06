// 'use client';

// import { useState, useMemo, useCallback, useEffect } from 'react';
// import dynamic from 'next/dynamic';

// import type {
//   UIAnnotation as UIAnnotationType,
//   AnnotationClass as AnnotationClassType,
// } from '@/features/annotations/types';
// import type { Prediction } from '@/features/predictions/types';
// import type { MLModel } from '@/features/ml-models/types';

// import { useCreateAnnotation } from '@/features/annotations/hooks/use-create-annotation';
// import {
//   toAPIAnnotation,
//   toUIAnnotation,
//   getAnnotationStats,
//   createPolygonGeometry,
// } from '@/features/annotations';

// import {
//   useAnnotations,
//   useAnnotationEditor,
//   useAnnotationClasses,
//   useTiffMetadata,
// } from '@/features/annotations';

// import { usePredictions, useUpdatePrediction } from '@/features/predictions';
// import { useMLModels } from '@/features/ml-models';

// import AnnotationTopbar from './AnnotationTopbar';
// import LoadingScreen from './LoadingScreen';
// import ErrorScreen from './ErrorScreen';
// import { toAnnotationGeometry } from '@/features/annotations/utils/geometry-converter';

// import type { DatasetId, DatasetItemId, ProjectId } from '@/types';

// const PatchViewer = dynamic(() => import('./PatchViewer'), { ssr: false });

// const DEFAULT_ZOOM_LEVEL = 18;
// const INFERENCE_API_URL = process.env.NEXT_PUBLIC_INFERENCE_API_URL || 'http://localhost:8010';

// interface TileCoord {
//   z: number;
//   x: number;
//   y: number;
// }

// interface TileGrid {
//   minX: number;
//   maxX: number;
//   minY: number;
//   maxY: number;
//   totalTiles: number;
//   cols: number;
//   rows: number;
// }

// interface PatchAnnotationEditorProps {
//   projectId: ProjectId;
//   datasetId: DatasetId;
//   itemId: DatasetItemId;
//   tiffUrl: string;
//   projectName?: string;
//   datasetName?: string;
//   onBack: () => void;
// }

// interface Detection {
//   center_x: number;
//   center_y: number;
//   width: number;
//   height: number;
//   class_name: string;
//   confidence: number;
// }

// interface MaskResult {
//   bbox: number[];
//   class_name: string;
//   confidence: number;
//   segmentation: number[][];
// }

// interface SegmentationResponse {
//   detections: Detection[];
//   masks: MaskResult[];
// }

// type InferenceMode = 'yolo' | 'sam2' | 'sam3-yolo';

// function boundsToTileRange(
//   bounds: [number, number, number, number],
//   zoom: number
// ): TileGrid {
//   const [minLon, minLat, maxLon, maxLat] = bounds;
//   const n = Math.pow(2, zoom);

//   const minTileX = Math.floor(((minLon + 180) / 360) * n);
//   const maxTileX = Math.floor(((maxLon + 180) / 360) * n);

//   const latRadMax = (maxLat * Math.PI) / 180;
//   const latRadMin = (minLat * Math.PI) / 180;

//   const minTileY = Math.floor(
//     ((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2) * n
//   );
//   const maxTileY = Math.floor(
//     ((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2) * n
//   );

//   const cols = maxTileX - minTileX + 1;
//   const rows = maxTileY - minTileY + 1;

//   return {
//     minX: minTileX,
//     maxX: maxTileX,
//     minY: minTileY,
//     maxY: maxTileY,
//     totalTiles: cols * rows,
//     cols,
//     rows,
//   };
// }

// function tileToGeoBounds(z: number, x: number, y: number): [number, number, number, number] {
//   const n = Math.pow(2, z);
//   const lonMin = (x / n) * 360 - 180;
//   const lonMax = ((x + 1) / n) * 360 - 180;

//   const latMaxRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
//   const latMinRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));

//   const latMin = (latMinRad * 180) / Math.PI;
//   const latMax = (latMaxRad * 180) / Math.PI;

//   return [lonMin, latMin, lonMax, latMax];
// }

// function geometryIntersectsTile(
//   geometry: any,
//   tileBounds: [number, number, number, number]
// ): boolean {
//   const geoBounds = getBoundsFromGeometry(geometry);
//   if (!geoBounds) return false;

//   const [tileMinLon, tileMinLat, tileMaxLon, tileMaxLat] = tileBounds;

//   return !(
//     geoBounds.maxx < tileMinLon ||
//     geoBounds.minx > tileMaxLon ||
//     geoBounds.maxy < tileMinLat ||
//     geoBounds.miny > tileMaxLat
//   );
// }

// function getBoundsFromGeometry(geometry: any): {
//   minx: number;
//   miny: number;
//   maxx: number;
//   maxy: number;
// } | null {
//   if (!geometry) return null;

//   try {
//     if (geometry.type === 'Point') {
//       const [x, y] = geometry.coordinates;
//       return { minx: x, miny: y, maxx: x, maxy: y };
//     }

//     if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
//       const coords = geometry.coordinates;
//       const xs = coords.map((c: any) => c[0]);
//       const ys = coords.map((c: any) => c[1]);
//       return {
//         minx: Math.min(...xs),
//         miny: Math.min(...ys),
//         maxx: Math.max(...xs),
//         maxy: Math.max(...ys),
//       };
//     }

//     if (geometry.type === 'Polygon') {
//       const coords = geometry.coordinates[0];
//       const xs = coords.map((c: any) => c[0]);
//       const ys = coords.map((c: any) => c[1]);
//       return {
//         minx: Math.min(...xs),
//         miny: Math.min(...ys),
//         maxx: Math.max(...xs),
//         maxy: Math.max(...ys),
//       };
//     }
//   } catch {
//     return null;
//   }

//   return null;
// }

// function getTileImageUrl(tiffUrl: string, z: number, x: number, y: number): string {
//   const titilerBase = process.env.NEXT_PUBLIC_TITILER_URL || 'http://localhost:8011';
//   return `${titilerBase}/cog/tiles/${z}/${x}/${y}.png?url=${encodeURIComponent(tiffUrl)}`;
// }

// export default function AnnotationPatchEditor({
//   projectId,
//   datasetId,
//   itemId,
//   tiffUrl,
//   projectName,
//   datasetName,
//   onBack,
// }: PatchAnnotationEditorProps) {
//   const { data: rawAnnotations, isLoading: annotationsLoading } = useAnnotations({
//     project_id: projectId,
//     dataset_id: datasetId,
//     dataset_item_id: itemId,
//   });

//   const { data: tiffInfo, isLoading: tiffLoading, error: tiffError } = useTiffMetadata(tiffUrl);
//   const { classes } = useAnnotationClasses();

//   const zoomLevel = DEFAULT_ZOOM_LEVEL;

//   const [currentTile, setCurrentTile] = useState<TileCoord | null>(null);

//   const tileGrid = useMemo(() => {
//     if (!tiffInfo?.bounds) return null;
//     return boundsToTileRange(tiffInfo.bounds, zoomLevel);
//   }, [tiffInfo?.bounds]);

//   useEffect(() => {
//     if (tileGrid && !currentTile) {
//       setCurrentTile({
//         z: zoomLevel,
//         x: tileGrid.minX,
//         y: tileGrid.minY,
//       });
//     }
//   }, [tileGrid, currentTile]);

//   const currentTileBounds = useMemo(() => {
//     if (!currentTile) return null;
//     return tileToGeoBounds(currentTile.z, currentTile.x, currentTile.y);
//   }, [currentTile]);

//   const tileAnnotations = useMemo(() => {
//     if (!rawAnnotations || !currentTileBounds) return [];

//     return rawAnnotations
//       .filter((ann) => geometryIntersectsTile(ann.geometry, currentTileBounds))
//       .map((ann, idx) => toUIAnnotation(ann, idx, classes))
//       .filter((ann): ann is UIAnnotationType => ann !== null);
//   }, [rawAnnotations, classes, currentTileBounds]);

//   const editor = useAnnotationEditor(tileAnnotations);
//   const createMutation = useCreateAnnotation();

//   const { data: predictions = [] } = usePredictions({ dataset_item_id: itemId });

//   const tilePredictions = useMemo(() => {
//     if (!currentTileBounds) return [];
//     return predictions.filter((pred) =>
//       geometryIntersectsTile(pred.geometry, currentTileBounds)
//     );
//   }, [predictions, currentTileBounds]);

//   const updatePredictionMutation = useUpdatePrediction();

//   const [inferenceMode, setInferenceMode] = useState<InferenceMode>('yolo');
//   const [isInferenceLoading, setIsInferenceLoading] = useState(false);
//   const [inferenceError, setInferenceError] = useState<string | null>(null);

//   const [tileDetections, setTileDetections] = useState<Detection[]>([]);
//   const [tileMasks, setTileMasks] = useState<MaskResult[]>([]);

//   const [confThreshold, setConfThreshold] = useState(0.25);
//   const [iouThreshold, setIouThreshold] = useState(0.7);

//   const [showInferenceDetections, setShowInferenceDetections] = useState(true);
//   const [showInferenceMasks, setShowInferenceMasks] = useState(true);

//   useEffect(() => {
//     setTileDetections([]);
//     setTileMasks([]);
//     setInferenceError(null);
//   }, [currentTile]);

//    const currentTileIndex = useMemo(() => {
//     if (!currentTile || !tileGrid) return { current: 0, total: 0 };
//     const col = currentTile.x - tileGrid.minX;
//     const row = currentTile.y - tileGrid.minY;
//     const current = row * tileGrid.cols + col + 1;
//     return {
//         current,
//         total: tileGrid.totalTiles,
//     };
//     }, [currentTile, tileGrid]);

//   const handleNextTile = useCallback(() => {
//     if (!tileGrid || !currentTile) return;

//     setCurrentTile((prev) => {
//       if (!prev) return prev;

//       if (prev.x < tileGrid.maxX) {
//         return { ...prev, x: prev.x + 1 };
//       }
//       if (prev.y < tileGrid.maxY) {
//         return { ...prev, x: tileGrid.minX, y: prev.y + 1 };
//       }
//       return prev;
//     });
//   }, [tileGrid]);

//   const handlePrevTile = useCallback(() => {
//     if (!tileGrid || !currentTile) return;

//     setCurrentTile((prev) => {
//       if (!prev) return prev;

//       if (prev.x > tileGrid.minX) {
//         return { ...prev, x: prev.x - 1 };
//       }
//       if (prev.y > tileGrid.minY) {
//         return { ...prev, x: tileGrid.maxX, y: prev.y - 1 };
//       }
//       return prev;
//     });
//   }, [tileGrid]);

//   const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
//     if (!tileGrid || !currentTile) return;
//     if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
//       return;

//     switch (e.key) {
//       case 'ArrowRight':
//         if (currentTile.x < tileGrid.maxX) {
//           setCurrentTile((prev) => prev && { ...prev, x: prev.x + 1 });
//         }
//         break;
//       case 'ArrowLeft':
//         if (currentTile.x > tileGrid.minX) {
//           setCurrentTile((prev) => prev && { ...prev, x: prev.x - 1 });
//         }
//         break;
//       case 'ArrowDown':
//         if (currentTile.y < tileGrid.maxY) {
//           setCurrentTile((prev) => prev && { ...prev, y: prev.y + 1 });
//         }
//         break;
//       case 'ArrowUp':
//         if (currentTile.y > tileGrid.minY) {
//           setCurrentTile((prev) => prev && { ...prev, y: prev.y - 1 });
//         }
//         break;
//     }
//   }, [tileGrid, currentTile]);

//   useEffect(() => {
//     window.addEventListener('keydown', handleKeyNavigation);
//     return () => window.removeEventListener('keydown', handleKeyNavigation);
//   }, [handleKeyNavigation]);

//   const fetchTileImage = async (): Promise<Blob> => {
//     if (!currentTile) throw new Error('No tile selected');

//     const tileUrl = getTileImageUrl(tiffUrl, currentTile.z, currentTile.x, currentTile.y);
//     const response = await fetch(tileUrl);

//     if (!response.ok) {
//       throw new Error(`Failed to fetch tile image: ${response.status}`);
//     }

//     return response.blob();
//   };

//   const runTileInference = useCallback(async () => {
//     if (!currentTile) {
//       setInferenceError('No tile selected');
//       return;
//     }

//     setIsInferenceLoading(true);
//     setInferenceError(null);

//     try {
//       const imageBlob = await fetchTileImage();
//       const imageFile = new File(
//         [imageBlob],
//         `tile_${currentTile.z}_${currentTile.x}_${currentTile.y}.png`,
//         { type: 'image/png' }
//       );

//       const formData = new FormData();
//       formData.append('file', imageFile);

//       let endpoint = '';
//       let url = '';

//       switch (inferenceMode) {
//         case 'yolo':
//           endpoint = '/predict/upload';
//           url = `${INFERENCE_API_URL}${endpoint}?conf_threshold=${confThreshold}&iou_threshold=${iouThreshold}`;
//           break;
//         case 'sam2':
//           endpoint = '/segment/upload';
//           url = `${INFERENCE_API_URL}${endpoint}?conf_threshold=${confThreshold}&iou_threshold=${iouThreshold}`;
//           break;
//         case 'sam3-yolo':
//           endpoint = '/segment/sam3/upload';
//           url = `${INFERENCE_API_URL}${endpoint}?conf_threshold=${confThreshold}&iou_threshold=${iouThreshold}`;
//           break;
//       }

//       const response = await fetch(url, {
//         method: 'POST',
//         body: formData,
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(errorData.detail || `HTTP ${response.status}`);
//       }

//       const data = await response.json();

//       if (inferenceMode === 'yolo') {
//         setTileDetections(data);
//         setTileMasks([]);
//       } else {
//         setTileDetections(data.detections || []);
//         setTileMasks(data.masks || []);
//       }
//     } catch (err: any) {
//       console.error('Inference error:', err);
//       setInferenceError(err.message || 'Inference failed');
//     } finally {
//       setIsInferenceLoading(false);
//     }
//   }, [currentTile, inferenceMode, confThreshold, iouThreshold, tiffUrl]);

//   const addDetectionAsAnnotation = useCallback((detection: Detection) => {
//     const x1 = detection.center_x - detection.width / 2;
//     const y1 = detection.center_y - detection.height / 2;
//     const x2 = detection.center_x + detection.width / 2;
//     const y2 = detection.center_y + detection.height / 2;

//     const geometry = createPolygonGeometry([[
//       [x1, y1],
//       [x2, y1],
//       [x2, y2],
//       [x1, y2],
//       [x1, y1],
//     ]]);

//     editor.addAnnotation(geometry, 'bbox');
//   }, [editor]);

//   const addMaskAsAnnotation = useCallback((mask: MaskResult) => {
//     const [x1, y1, x2, y2] = mask.bbox;

//     const geometry = createPolygonGeometry([[
//       [x1, y1],
//       [x2, y1],
//       [x2, y2],
//       [x1, y2],
//       [x1, y1],
//     ]]);

//     editor.addAnnotation(geometry, 'polygon');
//   }, [editor]);

//   const addAllDetectionsAsAnnotations = useCallback(() => {
//     tileDetections.forEach(addDetectionAsAnnotation);
//   }, [tileDetections, addDetectionAsAnnotation]);

//   const addAllMasksAsAnnotations = useCallback(() => {
//     tileMasks.forEach(addMaskAsAnnotation);
//   }, [tileMasks, addMaskAsAnnotation]);

//   const handleSaveAll = async () => {
//     const unsaved = editor.getUnsavedAnnotations();
//     if (unsaved.length === 0) {
//       alert('No new annotations to save');
//       return;
//     }
//     try {
//       for (const ann of unsaved) {
//         const apiPayload = toAPIAnnotation(ann, datasetId, itemId, projectId);
//         const savedAnn = await createMutation.mutateAsync(apiPayload);
//         editor.markAsSaved(ann.id, savedAnn.id);
//       }
//       alert(`Saved ${unsaved.length} annotation(s) successfully!`);
//     } catch (err: any) {
//       console.error('Save error:', err);
//       alert('Failed to save annotations: ' + err.message);
//     }
//   };

//   const isLoading = annotationsLoading || tiffLoading;

//   if (isLoading) return <LoadingScreen />;
//   if (tiffError || !tiffInfo?.bounds)
//     return <ErrorScreen error={tiffError} onBack={onBack} />;

//   const stats = getAnnotationStats(editor.annotations);
//   const hasUnsavedChanges = editor.annotations.some((ann) => !ann.isSaved && ann.classLabel);

//   return (
//     <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
//       <div className="shrink-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-3">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={onBack}
//               className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
//             >
//               <svg
//                 className="w-5 h-5"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M15 19l-7-7 7-7"
//                 />
//               </svg>
//             </button>
//             <div>
//               <h1 className="text-sm font-semibold">
//                 {projectName || `Project ${projectId}`}
//               </h1>
//               <p className="text-xs text-slate-400">
//                 {datasetName || `Dataset ${datasetId}`} • {tiffUrl.split('/').pop()}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <div className="text-xs text-slate-400">
//               <span className="text-emerald-400 font-medium">{stats.total}</span> annotations
//               {hasUnsavedChanges && <span className="ml-2 text-amber-400">• unsaved</span>}
//             </div>
//             <button
//               onClick={handleSaveAll}
//               disabled={!hasUnsavedChanges || createMutation.isPending}
//               className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
//                 hasUnsavedChanges
//                   ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
//                   : 'bg-slate-800 text-slate-500 cursor-not-allowed'
//               }`}
//             >
//               {createMutation.isPending ? 'Saving...' : 'Save All'}
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="flex flex-1 min-h-0">
//         <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900/50 overflow-y-auto p-4 space-y-4">
//           <div className="bg-slate-800/50 rounded-xl p-4">
//             <h2 className="text-sm font-semibold text-slate-300 mb-3">Inference Mode</h2>

//             <div className="space-y-2">
//               {(['yolo', 'sam2', 'sam3-yolo'] as InferenceMode[]).map((mode) => (
//                 <label
//                   key={mode}
//                   className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
//                     inferenceMode === mode
//                       ? 'bg-emerald-500/10 border border-emerald-500/30'
//                       : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
//                   }`}
//                 >
//                   <input
//                     type="radio"
//                     name="mode"
//                     value={mode}
//                     checked={inferenceMode === mode}
//                     onChange={(e) => setInferenceMode(e.target.value as InferenceMode)}
//                     className="sr-only"
//                   />
//                   <div
//                     className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
//                       inferenceMode === mode ? 'border-emerald-400' : 'border-slate-600'
//                     }`}
//                   >
//                     {inferenceMode === mode && (
//                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
//                     )}
//                   </div>
//                   <span className="text-xs font-medium">
//                     {mode === 'yolo' && 'YOLO Detection'}
//                     {mode === 'sam2' && 'YOLO + SAM2'}
//                     {mode === 'sam3-yolo' && 'YOLO + SAM3'}
//                   </span>
//                 </label>
//               ))}
//             </div>
//           </div>

//           <div className="bg-slate-800/50 rounded-xl p-4">
//             <h2 className="text-sm font-semibold text-slate-300 mb-3">Parameters</h2>

//             <div className="mb-4">
//               <label className="flex justify-between text-xs text-slate-400 mb-1.5">
//                 <span>Confidence</span>
//                 <span className="font-mono">{confThreshold.toFixed(2)}</span>
//               </label>
//               <input
//                 type="range"
//                 min="0.05"
//                 max="0.95"
//                 step="0.05"
//                 value={confThreshold}
//                 onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
//                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
//               />
//             </div>

//             <div className="mb-4">
//               <label className="flex justify-between text-xs text-slate-400 mb-1.5">
//                 <span>IOU Threshold</span>
//                 <span className="font-mono">{iouThreshold.toFixed(2)}</span>
//               </label>
//               <input
//                 type="range"
//                 min="0.1"
//                 max="0.9"
//                 step="0.1"
//                 value={iouThreshold}
//                 onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
//                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
//               />
//             </div>
//           </div>

//           <button
//             onClick={runTileInference}
//             disabled={isInferenceLoading}
//             className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
//               isInferenceLoading
//                 ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
//                 : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/20'
//             }`}
//           >
//             {isInferenceLoading ? (
//               <>
//                 <svg
//                   className="w-4 h-4 animate-spin"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   />
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                   />
//                 </svg>
//                 Running...
//               </>
//             ) : (
//               <>
//                 <svg
//                   className="w-4 h-4"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
//                   />
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                   />
//                 </svg>
//                 Run on Tile
//               </>
//             )}
//           </button>

//           {inferenceError && (
//             <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">
//               {inferenceError}
//             </div>
//           )}

//           <div className="bg-slate-800/50 rounded-xl p-4">
//             <h2 className="text-sm font-semibold text-slate-300 mb-3">Display</h2>

//             <div className="space-y-2">
//               <label className="flex items-center gap-3 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={showInferenceDetections}
//                   onChange={(e) => setShowInferenceDetections(e.target.checked)}
//                   className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500"
//                 />
//                 <span className="text-xs text-slate-300">Detections</span>
//                 <span className="ml-auto text-xs text-slate-500">{tileDetections.length}</span>
//               </label>

//               <label className="flex items-center gap-3 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={showInferenceMasks}
//                   onChange={(e) => setShowInferenceMasks(e.target.checked)}
//                   className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500"
//                 />
//                 <span className="text-xs text-slate-300">Masks</span>
//                 <span className="ml-auto text-xs text-slate-500">{tileMasks.length}</span>
//               </label>
//             </div>
//           </div>

//           {(tileDetections.length > 0 || tileMasks.length > 0) && (
//             <div className="bg-slate-800/50 rounded-xl p-4">
//               <h2 className="text-sm font-semibold text-slate-300 mb-3">
//                 Convert to Annotations
//               </h2>
//               <div className="space-y-2">
//                 {tileDetections.length > 0 && (
//                   <button
//                     onClick={addAllDetectionsAsAnnotations}
//                     className="w-full px-3 py-2 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
//                   >
//                     Add {tileDetections.length} Detection(s)
//                   </button>
//                 )}
//                 {tileMasks.length > 0 && (
//                   <button
//                     onClick={addAllMasksAsAnnotations}
//                     className="w-full px-3 py-2 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
//                   >
//                     Add {tileMasks.length} Mask(s)
//                   </button>
//                 )}
//               </div>
//             </div>
//           )}
//         </aside>

//         <div className="flex-1 min-w-0 min-h-0 bg-slate-950 relative flex flex-col">
//           {currentTile && tiffInfo?.bounds && (
//             <div className="flex-1 min-h-0 flex items-center justify-center p-4">
//              <PatchViewer
//                 tiffUrl={tiffUrl}
//                 initialTileCoord={currentTile}   // ✅ matches PatchViewer props
//                 inferenceMasks={showInferenceMasks ? tileMasks : []}
//                 showDetections={showInferenceDetections ? tileDetections : []}
//             />
//             </div>
//           )}

//           <div className="shrink-0 border-t border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between">
//             <div className="text-xs text-slate-400 font-mono">
//             z{currentTile?.z} / {currentTile?.x},{currentTile?.y} • Tile{' '}
//             {currentTileIndex.current}/{currentTileIndex.total}
//             </div>

//             <div className="flex gap-2">
//             <button
//                 onClick={handlePrevTile}
//                 disabled={currentTileIndex.current <= 1}
//                 className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded disabled:opacity-30 hover:bg-slate-600"
//             >
//                 ← Prev
//             </button>
//             <button
//                 onClick={handleNextTile}
//                 disabled={currentTileIndex.current >= currentTileIndex.total}
//                 className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded disabled:opacity-30 hover:bg-slate-600"
//             >
//                 Next →
//             </button>
//             </div>
//           </div>
//         </div>

//         <aside className="w-64 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-hidden flex flex-col">
//           <div className="p-3 border-b border-slate-800">
//             <h2 className="text-sm font-semibold text-slate-300">
//               Annotations ({editor.annotations.length})
//             </h2>
//           </div>

//           <div className="flex-1 overflow-auto p-2 space-y-1">
//             {editor.annotations.length === 0 ? (
//               <p className="text-xs text-slate-500 text-center py-4">No annotations</p>
//             ) : (
//               editor.annotations.map((ann) => (
//                 <button
//                   key={ann.id}
//                   onClick={() => editor.setSelectedId(ann.id)}
//                   className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
//                     editor.selectedId === ann.id
//                       ? 'bg-slate-700 ring-1 ring-blue-500'
//                       : 'bg-slate-800/50 hover:bg-slate-800'
//                   }`}
//                 >
//                   <div className="flex items-center justify-between">
//                     <span className="truncate">{ann.classLabel || 'Unlabeled'}</span>
//                     {!ann.isSaved && <span className="text-[10px] text-amber-400">•</span>}
//                   </div>
//                 </button>
//               ))
//             )}
//           </div>
          
//         </aside>
//       </div>
//     </div>
//   );
// }
