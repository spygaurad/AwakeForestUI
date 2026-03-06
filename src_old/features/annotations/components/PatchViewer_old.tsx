// 'use client';

// import { useEffect, useRef, useState } from 'react';

// interface MaskResult {
//   bbox: number[];
//   class_name: string;
//   confidence: number;
//   segmentation: number[][];
// }

// interface Detection {
//   center_x: number;
//   center_y: number;
//   width: number;
//   height: number;
//   class_name: string;
//   confidence: number;
// }

// interface Props {
//   tiffUrl: string;
//   initialTileCoord: { z: number; x: number; y: number };
//   inferenceMasks: MaskResult[];
//   showDetections?: Detection[];
// }

// const TILE_SIZE = 712;
// const TITILER_URL = process.env.NEXT_PUBLIC_TITILER_URL || 'http://localhost:8011';

// const tileUrl = (url: string, z: number, x: number, y: number) =>
//   `${TITILER_URL}/cog/tiles/${z}/${x}/${y}.png?url=${encodeURIComponent(url)}`;

// export default function PatchViewer({
//   tiffUrl,
//   initialTileCoord,
//   inferenceMasks,
//   showDetections = [],
// }: Props) {
//   const baseRef = useRef<HTMLCanvasElement>(null);
//   const overlayRef = useRef<HTMLCanvasElement>(null);
//   const [img, setImg] = useState<HTMLImageElement | null>(null);
//   const [tileCoord, setTileCoord] = useState(initialTileCoord);

//   // Load image for current tile
//   useEffect(() => {
//     const { x, y, z } = tileCoord;
//     const i = new Image();
//     i.crossOrigin = 'anonymous';
//     i.onload = () => setImg(i);
//     i.src = tileUrl(tiffUrl, z, x, y);
//   }, [tiffUrl, tileCoord]);

//   // Draw base image
//   useEffect(() => {
//     if (!img || !baseRef.current) return;
//     const c = baseRef.current;
//     const ctx = c.getContext('2d')!;
//     c.width = TILE_SIZE;
//     c.height = TILE_SIZE;
//     ctx.imageSmoothingEnabled = false;
//     ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
//     ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
//   }, [img]);

//   // Draw masks and detections
//   useEffect(() => {
//     if (!overlayRef.current) return;
//     const c = overlayRef.current;
//     const ctx = c.getContext('2d')!;
//     c.width = TILE_SIZE;
//     c.height = TILE_SIZE;
//     ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

//     inferenceMasks.forEach((m) => {
//       const [x1, y1, x2, y2] = m.bbox;
//       ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
//       ctx.strokeStyle = '#3b82f6';
//       ctx.lineWidth = 2;
//       ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
//       ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
//     });

//     showDetections.forEach((det) => {
//       const x1 = det.center_x - det.width / 2;
//       const y1 = det.center_y - det.height / 2;
//       const x2 = det.center_x + det.width / 2;
//       const y2 = det.center_y + det.height / 2;

//       ctx.strokeStyle = '#10b981';
//       ctx.lineWidth = 2;
//       ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

//       ctx.fillStyle = '#10b981';
//       ctx.fillRect(x1, y1 - 24, x2 - x1, 24);

//       ctx.fillStyle = '#ffffff';
//       ctx.font = 'bold 12px sans-serif';
//       ctx.fillText(`${det.class_name} ${(det.confidence * 100).toFixed(0)}%`, x1 + 4, y1 - 6);
//     });
//   }, [inferenceMasks, showDetections]);

//   // Navigation handlers
//   const goNextX = () => setTileCoord((prev) => ({ ...prev, x: prev.x + 1 }));
//   const goPrevX = () => setTileCoord((prev) => ({ ...prev, x: prev.x - 1 }));
//   const goNextY = () => setTileCoord((prev) => ({ ...prev, y: prev.y + 1 }));
//   const goPrevY = () => setTileCoord((prev) => ({ ...prev, y: prev.y - 1 }));

//   const jumpToTile = (z: number, x: number, y: number) => setTileCoord({ z, x, y });

//   return (
//     <div className="bg-slate-900 rounded-lg border border-slate-700 inline-block p-2">
//       <div className="relative">
//         <canvas ref={baseRef} width={TILE_SIZE} height={TILE_SIZE} />
//         <canvas
//           ref={overlayRef}
//           width={TILE_SIZE}
//           height={TILE_SIZE}
//           className="absolute inset-0 pointer-events-none"
//         />
//       </div>

//       <div className="mt-2 flex justify-center gap-1 text-[10px] text-slate-400 font-mono">
//         <button onClick={goPrevX} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">◀ X</button>
//         <button onClick={goNextX} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">X ▶</button>
//         <button onClick={goPrevY} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">◀ Y</button>
//         <button onClick={goNextY} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Y ▶</button>
//       </div>

//       <div className="mt-2 text-center">
//         <span className="text-[10px] text-slate-400 font-mono">
//           z{tileCoord.z} / {tileCoord.x},{tileCoord.y}
//         </span>
//       </div>

//       <div className="mt-2 flex justify-center gap-1">
//         <input
//           type="text"
//           placeholder="z,x,y"
//           className="text-[10px] p-1 rounded bg-slate-800 text-white"
//           onKeyDown={(e) => {
//             if (e.key === 'Enter') {
//               const [z, x, y] = e.currentTarget.value.split(',').map(Number);
//               if (!isNaN(z) && !isNaN(x) && !isNaN(y)) {
//                 jumpToTile(z, x, y);
//               }
//             }
//           }}
//         />
//       </div>
//     </div>
//   );
// }
