// 'use client';

// import { Box, Layers, MapPin, Check, Trash2, BrainCircuit } from 'lucide-react';
// import { Annotation } from './index'; // Ensure this points to your interface definition

// interface AnnotationCardProps {
//   annotation: Annotation;
//   isSelected: boolean;
//   onSelect: (id: string | null) => void;
//   onUpdate: (id: string, updates: Partial<Annotation>) => void;
//   onDelete: (id: string) => void;
// }

// export default function AnnotationCard({ 
//   annotation, 
//   isSelected, 
//   onSelect, 
//   onUpdate, 
//   onDelete 
// }: AnnotationCardProps) {
//   const isML = annotation.source === 'ml';

//   return (
//     <div 
//       onClick={() => onSelect(isSelected ? null : annotation.id)}
//       className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
//         isSelected 
//           ? 'border-zinc-900 bg-white shadow-lg ring-1 ring-zinc-900' 
//           : 'border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-md'
//       }`}
//     >
//       {/* Selection Indicator Strip */}
//       {isSelected && (
//         <div 
//           className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" 
//           style={{ backgroundColor: annotation.color }}
//         />
//       )}

//       {/* Header: Label & Source */}
//       <div className="flex justify-between items-start mb-2 pl-2">
//         <div className="flex flex-col gap-0.5">
//           <span className="text-[11px] font-black text-zinc-900 uppercase tracking-tight truncate max-w-[140px]">
//             {annotation.label || 'Unlabeled Object'}
//           </span>
//           <div className="flex items-center gap-1.5">
//             <div 
//               className="w-1.5 h-1.5 rounded-full" 
//               style={{ backgroundColor: annotation.color }} 
//             />
//             <span className="text-[9px] font-mono text-zinc-400">
//               ID: {annotation.id.slice(0, 8)}
//             </span>
//           </div>
//         </div>
        
//         <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
//           isML ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
//         }`}>
//           {isML ? <BrainCircuit size={10} /> : null}
//           {annotation.source}
//         </div>
//       </div>

//       {/* Geometry Status Bar */}
//       <div className="flex items-center gap-4 px-2 py-2 bg-zinc-50 rounded-lg mb-3">
//         <StatusIcon 
//           icon={<Box size={12} />} 
//           label="BBox" 
//           active={!!annotation.bbox} 
//           color={annotation.color} 
//         />
//         <StatusIcon 
//           icon={<Layers size={12} />} 
//           label="Mask" 
//           active={!!annotation.mask} 
//           color="#a855f7" 
//         />
//         <StatusIcon 
//           icon={<MapPin size={12} />} 
//           label="Geo" 
//           active={!!annotation.geoCoords} 
//           color="#10b981" 
//         />
        
//         {isML && annotation.confidence && (
//           <div className="ml-auto flex flex-col items-end">
//             <span className="text-[8px] font-bold text-zinc-400 uppercase leading-none">Confidence</span>
//             <span className="text-[10px] font-mono font-bold text-amber-600">
//               {(annotation.confidence * 100).toFixed(0)}%
//             </span>
//           </div>
//         )}
//       </div>

//       {/* Action Footer */}
//       <div className="flex justify-between items-center pt-2 border-t border-zinc-100 px-1">
//         <button 
//           onClick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
//           className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
//           title="Delete Annotation"
//         >
//           <Trash2 size={14} />
//         </button>

//         <div className="flex gap-2">
//           {annotation.status === 'pending' && (
//             <button 
//               onClick={(e) => { e.stopPropagation(); onUpdate(annotation.id, { status: 'verified', source: 'manual' }); }}
//               className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-[10px] font-bold shadow-sm transition-transform active:scale-95"
//             >
//               <Check size={12} /> Verify
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Sub-component for the Status Icons
// function StatusIcon({ icon, label, active, color }: { icon: React.ReactNode, label: string, active: boolean, color: string }) {
//   return (
//     <div className="flex flex-col items-center gap-0.5">
//       <div className={`${active ? '' : 'opacity-20 grayscale text-zinc-400'}`} style={{ color: active ? color : undefined }}>
//         {icon}
//       </div>
//       <span className={`text-[8px] font-bold uppercase tracking-tighter ${active ? 'text-zinc-600' : 'text-zinc-300'}`}>
//         {label}
//       </span>
//     </div>
//   );
// }